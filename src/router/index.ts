import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useAuthorityStore } from '@/stores/authorityStore'
import AppLayout from '@/components/AppLayout.vue'

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        redirect: '/dashboard'
    },
    {
        path: '/login',
        name: 'login',
        component: () => import('@/views/LoginView.vue'),
        meta: { requiresAuth: false }
    },
    {
        path: '/examples',
        name: 'examples',
        component: () => import('@/components/DaisyUIExamples.vue'),
        meta: { requiresAuth: false }
    },
    // ── Authenticated shell ──────────────────────────────────────────────
    {
        path: '/',
        component: AppLayout,
        meta: { requiresAuth: true },
        children: [
            {
                path: 'dashboard',
                name: 'dashboard',
                component: () => import('@/views/DashboardView.vue'),
            },
            {
                path: 'projects',
                name: 'projects',
                component: () => import('@/views/ProjectsView.vue'),
            },
            {
                path: 'areas',
                name: 'areas',
                component: () => import('@/views/AreasView.vue'),
            },
            {
                path: 'disciplines',
                name: 'disciplines',
                component: () => import('@/views/DisciplinesView.vue'),
            },
            {
                path: 'itr-types',
                name: 'itr-types',
                component: () => import('@/views/ITRTypesView.vue'),
            },
            {
                path: 'itr-statuses',
                name: 'itr-statuses',
                component: () => import('@/views/ITRStatusesView.vue'),
            },
            {
                path: 'gantt',
                name: 'gantt',
                component: () => import('@/views/GanttView.vue'),
            },
            {
                path: 'todos',
                name: 'todos',
                component: () => import('@/views/TodosView.vue'),
            },
            {
                path: 'itrs',
                name: 'itrs',
                component: () => import('@/views/ITRsView.vue'),
            },
            {
                path: 'itps',
                name: 'itps',
                component: () => import('@/views/ITPsView.vue'),
            },
            {
                path: 'materials',
                name: 'materials',
                component: () => import('@/views/MaterialsView.vue'),
            },
            {
                path: 'master-forms',
                name: 'master-forms',
                component: () => import('@/views/MasterFormsView.vue'),
            },
            {
                path: 'config',
                name: 'config',
                component: () => import('@/views/ConfigView.vue'),
            },
            {
                path: 'users',
                name: 'users',
                component: () => import('@/views/UsersView.vue'),
                meta: { requiredPwaPermission: 'manage_users' },
            },
            {
                path: 'project-team',
                name: 'project-team',
                component: () => import('@/views/ProjectTeamView.vue'),
                meta: { requiredProjectPermission: 'project_team' },
            },
            {
                path: 'profile',
                name: 'profile',
                component: () => import('@/views/UserProfileView.vue'),
            },
            {
                path: 'attendance',
                name: 'attendance',
                component: () => import('@/views/AttendanceView.vue'),
            },
            {
                path: 'attendance-admin',
                name: 'attendance-admin',
                component: () => import('@/views/AttendanceAdminView.vue'),
                meta: { requiredPwaPermission: 'manage_users' },
            },
        ]
    }
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})

let authChecked = false

router.beforeEach(async (to) => {
    const authStore = useAuthStore()

    if (!authChecked) {
        console.log('⏳ Initializing auth (first navigation)...')
        await authStore.initialize()
        authChecked = true
        console.log('✅ Auth initialized. Authenticated:', authStore.isAuthenticated)
    }

    const requiresAuth = to.matched.some(r => r.meta.requiresAuth)

    if (requiresAuth && !authStore.isAuthenticated) {
        console.log('🚫 Not authenticated - redirecting to login')
        return { name: 'login' }
    }

    if (to.name === 'login' && authStore.isAuthenticated) {
        console.log('✅ Already authenticated - redirecting to dashboard')
        return { name: 'dashboard' }
    }

    // ── Authority checks ─────────────────────────────────────────────
    if (authStore.isAuthenticated) {
        const authorityStore = useAuthorityStore()

        // PWA-level permission gate
        const requiredPwa = to.meta.requiredPwaPermission as string | undefined
        if (requiredPwa) {
            const role = authStore.user?.role
            if (role !== 'system_admin' && role !== 'admin') {
                const perms = authorityStore.pwaPermissions
                if (!perms.includes(requiredPwa as any)) {
                    console.log('🚫 Missing PWA permission:', requiredPwa)
                    return { name: 'dashboard' }
                }
            }
        }

        // Project-level permission gate
        const requiredProject = to.meta.requiredProjectPermission as string | undefined
        if (requiredProject) {
            const role = authStore.user?.role
            const isAdmin = role === 'system_admin' || role === 'admin'
            if (!isAdmin) {
                const perms = authorityStore.currentProjectPermissions
                const projectRoles = authorityStore.currentProjectRoles
                if (!projectRoles.includes('project_admin') && !perms.includes(requiredProject as any)) {
                    console.log('🚫 Missing project permission:', requiredProject)
                    return { name: 'dashboard' }
                }
            }
        }
    }
})

export default router
