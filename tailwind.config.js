/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Paleta oficial Veloura ────────────────────────────────
        veloura: {
          gold:   '#C9A46A',  // primario — botones, acentos, branding
          cream:  '#F7F3EE',  // fondo cálido
          white:  '#FFFFFF',
          dark:   '#2D2A26',  // carbón — textos principales y fondo oscuro
          // Variaciones del gold para estados
          'gold-50':  '#FAF5EC',
          'gold-100': '#F0E2C6',
          'gold-200': '#E1C690',
          'gold-300': '#D2AB67',
          'gold-400': '#C9A46A',
          'gold-500': '#B98A4F',
          'gold-600': '#9C7338',
          'gold-700': '#7D5C2C',
        },
        // ── Compat: blush legacy (clínica Lumière y app antigua) ──
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
        ink: '#2D2A26',  // alineado con veloura.dark
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        // El wordmark Veloura usa sans-serif geométrico moderno (no serif)
        display: ['Inter', '"DM Sans"', 'Helvetica Neue', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
