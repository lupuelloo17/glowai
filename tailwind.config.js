/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        blush: {
          50:  '#FDF2F4',
          100: '#FAE6EB',
          200: '#F5CDD7',
          300: '#EDB4C3',
          400: '#E8A0B0',
          500: '#D9748A',
          600: '#C44E68',
          700: '#A3324B',
        },
        ink: '#2D2D2D',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
