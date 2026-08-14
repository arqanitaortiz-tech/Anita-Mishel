/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        tinta: '#141F17',
        papel: '#FAFAF6',
        olivo: { DEFAULT: '#6B7B5E', prof: '#46543C', neg: '#8A9A7D' },
        salvia: '#E8EDE2',
        piedra: '#6F7469',
        linea: '#DDE3D6',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        sans: ['var(--font-sans)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
