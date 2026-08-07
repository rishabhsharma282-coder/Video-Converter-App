/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        capcut: {
          dark: '#0f0f13',
          card: '#18181f',
          surface: '#22222c',
          border: '#2f2f3e',
          accent: '#6366f1',
          accentHover: '#4f46e5',
          cyan: '#06b6d4',
          pink: '#ec4899',
          gold: '#eab308'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
      }
    },
  },
  plugins: [],
}
