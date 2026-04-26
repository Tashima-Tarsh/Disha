/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        jarvis: {
          blue: '#00e5ff',
          gold: '#ffaa00',
          red: '#ff2a2a',
          dark: '#010409',
          panel: 'rgba(0, 10, 20, 0.4)',
        }
      },
      backgroundImage: {
        'grid-pattern': `linear-gradient(rgba(0, 229, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 229, 255, 0.03) 1px, transparent 1px)`,
      }
    },
  },
  plugins: [],
}
