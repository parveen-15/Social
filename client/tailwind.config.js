/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:            '#080C14',
        card:          '#0D1526',
        'card-hover':  '#111D35',
        accent:        '#3B82F6',
        'accent-dark': '#2563EB',
        'accent-light':'#60A5FA',
        brd:           '#1A2744',
        'brd-light':   '#243354',
        muted:         '#4B6A9B',
      },
    },
  },
  plugins: [],
}
