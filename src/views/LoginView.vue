<template>
  <div class="min-h-screen flex items-center justify-center p-4 login-bg">
    <div class="w-full max-w-md">

      <!-- Branding -->
      <div class="text-center mb-8">
        <div class="logo-icon mx-auto mb-4 w-24 h-24 rounded-2xl flex items-center justify-center">
          <img src="/QC_LOGO_dark.svg" alt="QC Logo" class="w-20 h-20" />
        </div>
        <h1 class="text-brand-gradient text-4xl font-extrabold tracking-wide mb-2">
          QC System
        </h1>
        <p class="text-siberian text-lg">
          MEP Quality Control Management
        </p>
      </div>

      <!-- Login Card -->
      <div class="bg-white/80 backdrop-blur-xl rounded-2xl p-6 sm:p-8 border border-moss/20 shadow-xl">
        <!-- Error Alert -->
        <div 
          v-if="error"
          class="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3"
        >
          <span class="flex-1">{{ error }}</span>
          <button @click="error = ''" class="text-red-600 hover:text-red-800">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>
        </div>

        <!-- Sign In Button -->
        <button
          @click="handleMicrosoftLogin"
          :disabled="loading"
          class="w-full bg-siberian text-white font-medium py-4 px-6 rounded-lg hover:bg-moss transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
        >
          <svg v-if="!loading" width="24" height="24" viewBox="0 0 23 23" fill="none">
            <path d="M0 0h11v11H0z" fill="#f25022"/>
            <path d="M12 0h11v11H12z" fill="#00a4ef"/>
            <path d="M0 12h11v11H0z" fill="#7fba00"/>
            <path d="M12 12h11v11H12z" fill="#ffb900"/>
          </svg>
          <svg v-else class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ loading ? 'Signing in...' : 'Sign in with Microsoft' }}
        </button>

        <p class="text-center text-gray-600 mt-6 text-sm">
          Use your company Microsoft account to sign in
        </p>
      </div>

      <p class="text-center text-gray-500 mt-6 text-xs">
        QC System v1.0.0 — Pomelo Project
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router    = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const error   = ref('')

const handleMicrosoftLogin = async () => {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const success = await authStore.signIn()
    if (success) router.push('/dashboard')
    else error.value = 'Failed to sign in with Microsoft'
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to sign in with Microsoft'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-bg {
  background: linear-gradient(135deg, #EBF1ED 0%, #B9CABE 50%, #EBF1ED 100%);
  position: relative;
  overflow: hidden;
}

/* Subtle green radial glow */
.login-bg::before {
  content: '';
  position: absolute;
  inset: -50%;
  width: 200%;
  height: 200%;
  background:
    radial-gradient(circle at 30% 40%, rgba(80, 96, 90, 0.08) 0%, transparent 50%),
    radial-gradient(circle at 70% 60%, rgba(129, 147, 138, 0.06) 0%, transparent 50%);
  animation: shimmer 15s ease-in-out infinite alternate;
}

@keyframes shimmer {
  0%   { transform: translate(0, 0); }
  100% { transform: translate(-3%, -3%); }
}

.logo-icon {
  width: 88px;
  height: 88px;
  border-radius: 24px;
  background: linear-gradient(135deg, #50605A, #81938A);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(80, 96, 90, 0.3);
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-6px); }
}

.text-brand-gradient {
  background: linear-gradient(135deg, #81938A, #B9CABE);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
</style>
