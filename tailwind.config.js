/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-ink': '#121212',
        'carbon': '#2D2E2B',
        'siberian': '#50605A',
        'moss': '#81938A',
        'cyclone': '#B9CABE',
        'glacial': '#EBF1ED',
      },
    },
  },
  plugins: [],
}
