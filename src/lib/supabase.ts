import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const isSupabaseConfigured = supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('YOUR_') &&
    !supabaseAnonKey.includes('YOUR_')

if (!isSupabaseConfigured) {
    console.warn('⚠️ Supabase not configured. Using mock client. Update .env file with your POMELO Supabase credentials.')
}

// Mock client for when Supabase is not yet configured
const createMockClient = (): SupabaseClient => {
    const createQueryBuilder = () => {
        const builder: any = {
            select: () => builder,
            eq: () => builder,
            neq: () => builder,
            gt: () => builder,
            gte: () => builder,
            lt: () => builder,
            lte: () => builder,
            like: () => builder,
            ilike: () => builder,
            is: () => builder,
            in: () => builder,
            or: () => builder,
            order: () => builder,
            limit: () => builder,
            single: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
            then: (resolve: any) => resolve({ data: [], error: null })
        }
        return builder
    }

    return {
        from: () => ({
            ...createQueryBuilder(),
            insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }) }) }),
            update: () => createQueryBuilder(),
            delete: () => createQueryBuilder(),
            upsert: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } })
        }),
        auth: {
            getSession: () => Promise.resolve({ data: { session: null }, error: null }),
            getUser: () => Promise.resolve({ data: { user: null }, error: null }),
            signOut: () => Promise.resolve({ error: null })
        },
        rpc: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
        storage: {
            from: () => ({
                upload: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
                download: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
                remove: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
                getPublicUrl: () => ({ data: { publicUrl: '' } })
            })
        }
    } as any
}

export const supabase: SupabaseClient = isSupabaseConfigured
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: typeof window !== 'undefined' ? window.localStorage : undefined
        }
    })
    : createMockClient()
