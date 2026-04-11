/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          black: '#050a0f',
          navy: '#0a1628',
          dark: '#0d1f35',
          card: '#0f2540',
          border: '#1a3a5c',
          cyan: '#00d4ff',
          'cyan-dim': '#0099bb',
          gold: '#ffd700',
          'gold-dim': '#cc9900',
          red: '#ff3355',
          'red-dim': '#cc1133',
          green: '#00ff88',
          'green-dim': '#00cc66',
          purple: '#9945ff',
          text: '#c8d8e8',
          'text-dim': '#7a9bbf',
          muted: '#4a6580',
        },
      },
      fontFamily: {
        mono: ['Courier New', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'cyber-cyan': '0 0 20px rgba(0, 212, 255, 0.3)',
        'cyber-gold': '0 0 20px rgba(255, 215, 0, 0.3)',
        'cyber-red': '0 0 20px rgba(255, 51, 85, 0.3)',
        'cyber-green': '0 0 20px rgba(0, 255, 136, 0.3)',
        'glow': '0 0 40px rgba(0, 212, 255, 0.15)',
      },
      backgroundImage: {
        'cyber-grid': "linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)",
        'cyber-radial': 'radial-gradient(ellipse at top, #0d1f35 0%, #050a0f 70%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'scan': 'scan 2s linear infinite',
      },
      keyframes: {
        glow: {
          from: { boxShadow: '0 0 5px rgba(0, 212, 255, 0.2)' },
          to: { boxShadow: '0 0 20px rgba(0, 212, 255, 0.6)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [],
}
