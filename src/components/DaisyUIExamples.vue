<template>
  <div class="min-h-screen bg-base-200 p-8">
    <div class="max-w-7xl mx-auto space-y-8">
      
      <!-- Header -->
      <div class="text-center mb-12">
        <h1 class="text-5xl font-bold mb-4 text-brand-gradient">
          DaisyUI Components Examples
        </h1>
        <p class="text-lg text-base-content/70">
          Beautiful pre-styled components ready to use
        </p>
      </div>

      <!-- Theme Selector -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">🎨 Theme Selector</h2>
          <select 
            v-model="currentTheme" 
            class="select select-bordered w-full max-w-xs"
            @change="changeTheme"
          >
            <option v-for="theme in themes" :key="theme" :value="theme">
              {{ theme }}
            </option>
          </select>
          <p class="text-sm text-base-content/60">
            Try different themes to see how they look!
          </p>
        </div>
      </div>

      <!-- Buttons -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Buttons</h2>
          <div class="flex flex-wrap gap-2">
            <button class="btn">Default</button>
            <button class="btn btn-primary">Primary</button>
            <button class="btn btn-secondary">Secondary</button>
            <button class="btn btn-accent">Accent</button>
            <button class="btn btn-success">Success</button>
            <button class="btn btn-warning">Warning</button>
            <button class="btn btn-error">Error</button>
            <button class="btn btn-ghost">Ghost</button>
            <button class="btn btn-link">Link</button>
          </div>
          
          <div class="divider">Sizes</div>
          <div class="flex flex-wrap items-center gap-2">
            <button class="btn btn-xs btn-primary">Tiny</button>
            <button class="btn btn-sm btn-primary">Small</button>
            <button class="btn btn-primary">Normal</button>
            <button class="btn btn-lg btn-primary">Large</button>
          </div>

          <div class="divider">States</div>
          <div class="flex flex-wrap gap-2">
            <button class="btn btn-primary btn-outline">Outline</button>
            <button class="btn btn-primary" disabled>Disabled</button>
            <button class="btn btn-primary loading">Loading</button>
            <button class="btn btn-circle btn-primary">A</button>
            <button class="btn btn-square btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Forms -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Form Controls</h2>
          
          <div class="form-control w-full max-w-xs">
            <label class="label">
              <span class="label-text">Text Input</span>
            </label>
            <input type="text" placeholder="Type here" class="input input-bordered w-full" />
            <label class="label">
              <span class="label-text-alt">Alt label</span>
            </label>
          </div>

          <div class="form-control w-full max-w-xs">
            <label class="label">
              <span class="label-text">Select</span>
            </label>
            <select class="select select-bordered">
              <option disabled selected>Pick one</option>
              <option>Option 1</option>
              <option>Option 2</option>
            </select>
          </div>

          <div class="form-control w-full max-w-xs">
            <label class="label">
              <span class="label-text">Textarea</span>
            </label>
            <textarea class="textarea textarea-bordered" placeholder="Bio"></textarea>
          </div>

          <div class="form-control">
            <label class="label cursor-pointer justify-start gap-4">
              <input type="checkbox" checked class="checkbox checkbox-primary" />
              <span class="label-text">Remember me</span>
            </label>
          </div>

          <div class="form-control">
            <label class="label cursor-pointer justify-start gap-4">
              <input type="radio" name="radio-1" class="radio radio-primary" checked />
              <span class="label-text">Option 1</span>
            </label>
            <label class="label cursor-pointer justify-start gap-4">
              <input type="radio" name="radio-1" class="radio radio-primary" />
              <span class="label-text">Option 2</span>
            </label>
          </div>

          <div class="form-control w-full max-w-xs">
            <label class="label">
              <span class="label-text">Range</span>
            </label>
            <input type="range" min="0" max="100" value="40" class="range range-primary" />
          </div>
        </div>
      </div>

      <!-- Alerts & Badges -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Alerts & Badges</h2>
          
          <div class="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>New software update available.</span>
          </div>

          <div class="alert alert-success">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Your purchase has been confirmed!</span>
          </div>

          <div class="alert alert-warning">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Warning: Invalid operation!</span>
          </div>

          <div class="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Error! Task failed successfully.</span>
          </div>

          <div class="divider">Badges</div>
          <div class="flex flex-wrap gap-2">
            <div class="badge">neutral</div>
            <div class="badge badge-primary">primary</div>
            <div class="badge badge-secondary">secondary</div>
            <div class="badge badge-accent">accent</div>
            <div class="badge badge-ghost">ghost</div>
            <div class="badge badge-info">info</div>
            <div class="badge badge-success">success</div>
            <div class="badge badge-warning">warning</div>
            <div class="badge badge-error">error</div>
          </div>
        </div>
      </div>

      <!-- Cards -->
      <div class="grid md:grid-cols-2 gap-6">
        <div class="card bg-base-100 shadow-xl">
          <figure>
            <div class="w-full h-48 bg-gradient-to-r from-primary to-secondary"></div>
          </figure>
          <div class="card-body">
            <h2 class="card-title">Card with image!</h2>
            <p>This is a beautiful card with DaisyUI styling.</p>
            <div class="card-actions justify-end">
              <button class="btn btn-primary">Action</button>
            </div>
          </div>
        </div>

        <div class="card bg-primary text-primary-content shadow-xl">
          <div class="card-body">
            <h2 class="card-title">Primary Card</h2>
            <p>Cards can have different colors!</p>
            <div class="card-actions justify-end">
              <button class="btn">Learn More</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Example -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Modal</h2>
          <button class="btn btn-primary w-fit" @click="showModal = true">
            Open Modal
          </button>
          
          <input 
            type="checkbox" 
            :checked="showModal" 
            class="modal-toggle" 
          />
          <div class="modal" :class="{ 'modal-open': showModal }">
            <div class="modal-box">
              <h3 class="font-bold text-lg">Hello!</h3>
              <p class="py-4">This is a DaisyUI modal. Press ESC or click the button below to close.</p>
              <div class="modal-action">
                <button class="btn" @click="showModal = false">Close</button>
                <button class="btn btn-primary" @click="showModal = false">Accept</button>
              </div>
            </div>
            <div class="modal-backdrop" @click="showModal = false"></div>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="card bg-base-100 shadow-xl overflow-hidden">
        <div class="card-body">
          <h2 class="card-title">Table</h2>
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th></th>
                  <th>Name</th>
                  <th>Job</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr class="hover">
                  <th>1</th>
                  <td>Cy Ganderton</td>
                  <td>Quality Control Specialist</td>
                  <td><span class="badge badge-success">Active</span></td>
                </tr>
                <tr class="hover">
                  <th>2</th>
                  <td>Hart Hagerty</td>
                  <td>Desktop Support Technician</td>
                  <td><span class="badge badge-warning">Pending</span></td>
                </tr>
                <tr class="hover">
                  <th>3</th>
                  <td>Brice Swyre</td>
                  <td>Tax Accountant</td>
                  <td><span class="badge badge-error">Inactive</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Loading & Progress -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Loading & Progress</h2>
          
          <div class="flex gap-4">
            <span class="loading loading-spinner loading-xs"></span>
            <span class="loading loading-spinner loading-sm"></span>
            <span class="loading loading-spinner loading-md"></span>
            <span class="loading loading-spinner loading-lg"></span>
          </div>

          <div class="flex gap-4">
            <span class="loading loading-dots loading-xs"></span>
            <span class="loading loading-dots loading-sm"></span>
            <span class="loading loading-dots loading-md"></span>
            <span class="loading loading-dots loading-lg"></span>
          </div>

          <progress class="progress w-56"></progress>
          <progress class="progress progress-primary w-56" value="40" max="100"></progress>
          <progress class="progress progress-success w-56" value="70" max="100"></progress>
          <progress class="progress progress-error w-56" value="90" max="100"></progress>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats shadow w-full">
        <div class="stat">
          <div class="stat-figure text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-8 h-8 stroke-current">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
            </svg>
          </div>
          <div class="stat-title">Total ITRs</div>
          <div class="stat-value text-primary">2.6K</div>
          <div class="stat-desc">21% more than last month</div>
        </div>

        <div class="stat">
          <div class="stat-figure text-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-8 h-8 stroke-current">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
          <div class="stat-title">Active Projects</div>
          <div class="stat-value text-secondary">12</div>
          <div class="stat-desc">4 in progress</div>
        </div>

        <div class="stat">
          <div class="stat-figure text-secondary">
            <div class="avatar online">
              <div class="w-16 rounded-full">
                <div class="w-full h-full bg-gradient-to-br from-primary to-secondary"></div>
              </div>
            </div>
          </div>
          <div class="stat-value">86%</div>
          <div class="stat-title">Tasks done</div>
          <div class="stat-desc text-secondary">31 tasks remaining</div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const themes = [
  'light', 'dark', 'cupcake', 'bumblebee', 'emerald', 'corporate',
  'synthwave', 'retro', 'cyberpunk', 'valentine', 'halloween', 'garden',
  'forest', 'aqua', 'lofi', 'pastel', 'fantasy', 'wireframe', 'black',
  'luxury', 'dracula', 'cmyk', 'autumn', 'business', 'acid', 'lemonade',
  'night', 'coffee', 'winter', 'dim', 'nord', 'sunset'
]

const currentTheme = ref('dark')
const showModal = ref(false)

const changeTheme = () => {
  document.documentElement.setAttribute('data-theme', currentTheme.value)
  localStorage.setItem('theme', currentTheme.value)
}

onMounted(() => {
  const savedTheme = localStorage.getItem('theme') || 'dark'
  currentTheme.value = savedTheme
  changeTheme()
})
</script>
