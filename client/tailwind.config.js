/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0B0F14',
        card: '#111827',
        accent: '#06B6D4',
        'accent-dark': '#0891B2',
        'accent-light': '#67E8F9',
        brd: '#1E293B',
      },
    },
  },
  plugins: [],
}
