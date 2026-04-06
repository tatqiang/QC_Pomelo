import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { azureAuthService, type UserProfile } from '@/lib/azureAuth'
import { supabase } from '@/lib/supabase'

interface User {
    id: string
    email: string
    role: string
    first_name?: string
    last_name?: string
    azure_user_id?: string
    department?: string
    job_title?: string
    [key: string]: unknown
}

export const useAuthStore = defineStore('auth', () => {
    const user = ref<User | null>(null)
    const azureUser = ref<UserProfile | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)

    const isAuthenticated = computed(() => !!user.value)
    const isAdmin = computed(() => user.value?.role === 'system_admin' || user.value?.role === 'admin')
    const isSystemAdmin = computed(() => user.value?.role === 'system_admin')
    const userId = computed(() => user.value?.id || null)
    const userRole = computed(() => user.value?.role || null)
    const userDisplayName = computed(() => {
        if (user.value?.first_name) {
            return `${user.value.first_name} ${user.value.last_name || ''}`.trim()
        }
        return azureUser.value?.displayName || user.value?.email || ''
    })

    /**
     * Find or auto-create user in POMELO Supabase from Azure profile
     */
    const findOrCreateUser = async (profile: UserProfile): Promise<User> => {
        // Race the Supabase query against a 8 s timeout so a slow/down DB never
        // blocks auth and leaves the page blank.
        const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
            Promise.race([
                promise,
                new Promise<T>((_, reject) =>
                    setTimeout(() => reject(new Error('Supabase timeout')), ms)
                )
            ])

        try {
            // 1. Try to find existing user by email
            const { data, error: dbError } = await withTimeout(
                supabase
                    .from('users')
                    .select('id, email, role, first_name, last_name, azure_user_id, user_type, status, company_id')
                    .eq('email', profile.email)
                    .limit(1),
                8000
            )

            const existingUser = data && data.length > 0 ? data[0] : null

            if (!dbError && existingUser) {
                console.log('✅ User found in database:', existingUser.email, 'Role:', existingUser.role)

                // Update azure_user_id if not set
                if (!existingUser.azure_user_id && profile.id) {
                    supabase
                        .from('users')
                        .update({
                            azure_user_id: profile.id,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existingUser.id)
                        .then()  // fire-and-forget, don't block auth
                }

                return existingUser
            }

            // 2. User not found → auto-create
            console.log('📝 User not found, auto-creating:', profile.email)
            const { data: newUser, error: createError } = await withTimeout(
                supabase
                    .from('users')
                    .insert({
                        email: profile.email,
                        first_name: profile.firstName,
                        last_name: profile.lastName,
                        azure_user_id: profile.id,
                        user_type: 'internal',
                        status: 'active',
                        role: 'member'
                    })
                    .select()
                    .single(),
                8000
            )

            if (createError || !newUser) {
                console.warn('⚠️ Could not auto-create user in Supabase:', createError?.message)
                // Fallback: create local-only user from Azure profile
                return {
                    id: profile.id,
                    email: profile.email,
                    role: 'member',
                    first_name: profile.firstName,
                    last_name: profile.lastName,
                    azure_user_id: profile.id
                }
            }

            console.log('✅ New user created in database:', newUser.email)
            return newUser

        } catch (err) {
            // Timeout or network error — fall back to local-only user so the app loads
            console.warn('⚠️ findOrCreateUser failed (DB unavailable), using local profile:', (err as Error).message)
            return {
                id: profile.id,
                email: profile.email,
                role: 'member',
                first_name: profile.firstName,
                last_name: profile.lastName,
                azure_user_id: profile.id
            }
        }
    }

    const initialize = async (): Promise<void> => {
        loading.value = true
        try {
            user.value = null
            azureUser.value = null

            console.log('🔍 Initializing auth...')

            const isLoggedIn = await azureAuthService.isLoggedIn()
            console.log('📊 isLoggedIn:', isLoggedIn)

            if (!isLoggedIn) {
                console.log('❌ No valid Azure session found')
                return
            }

            // Verify we can get a valid access token
            const token = await azureAuthService.getAccessToken()
            console.log('🔑 Access token:', token ? 'EXISTS' : 'NULL')

            if (!token) {
                console.log('❌ Cannot get valid access token - clearing session')
                return
            }

            const profile = await azureAuthService.getUserProfile()
            console.log('👤 User profile:', profile ? profile.email : 'NULL')

            if (!profile) {
                console.log('❌ Cannot get user profile')
                return
            }

            azureUser.value = profile

            // Find or auto-create user in POMELO Supabase
            user.value = await findOrCreateUser(profile)

            console.log('✅ Auth initialization complete. Authenticated:', !!user.value)
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Unknown error'
            console.error('❌ Auth initialization error:', err)
            user.value = null
            azureUser.value = null
        } finally {
            loading.value = false
        }
    }

    const signIn = async (): Promise<boolean> => {
        loading.value = true
        error.value = null
        try {
            if (!azureAuthService || typeof azureAuthService.loginWithMicrosoft !== 'function') {
                console.error('❌ azureAuthService not properly initialized')
                throw new Error('Authentication service not available')
            }

            // Login with Azure AD (redirect flow - page will reload)
            await azureAuthService.loginWithMicrosoft()

            // If we get here (popup flow), get user profile
            const profile = await azureAuthService.getUserProfile()
            if (profile) {
                azureUser.value = profile
                user.value = await findOrCreateUser(profile)
                return true
            }
            return false
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Unknown error'
            console.error('Sign in error:', err)
            throw err
        } finally {
            loading.value = false
        }
    }

    const signOut = async (): Promise<void> => {
        loading.value = true
        try {
            await azureAuthService.logout()
            user.value = null
            azureUser.value = null
            error.value = null
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Unknown error'
            console.error('Sign out error:', err)
            throw err
        } finally {
            loading.value = false
        }
    }

    return {
        user,
        azureUser,
        loading,
        error,
        isAuthenticated,
        isAdmin,
        isSystemAdmin,
        userId,
        userRole,
        userDisplayName,
        initialize,
        signIn,
        signOut
    }
})
