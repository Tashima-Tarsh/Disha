import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cyberpunk neon palette
        neon: {
          cyan:    "#00e5ff",
          purple:  "#bf5af2",
          green:   "#00ff88",
          pink:    "#ff2d78",
          yellow:  "#ffd60a",
          orange:  "#ff6b00",
        },
        cyber: {
          50:  "#e8f4ff",
          100: "#cce7ff",
          200: "#99cfff",
          300: "#66b7ff",
          400: "#339fff",
          500: "#0087ff",
          600: "#006fcc",
          700: "#005799",
          800: "#003f66",
          900: "#002733",
          950: "#00111a",
        },
        // Keep dark for backwards compat
        dark: {
          50:  "#f8fafc",
          100: "#f1f5f9",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
        primary: {
          50:  "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          900: "#1e3a5f",
        },
      },
      backgroundImage: {
        "cyber-grid":
          "linear-gradient(rgba(0,229,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.03) 1px, transparent 1px)",
        "neon-gradient":
          "linear-gradient(135deg, #00e5ff 0%, #bf5af2 50%, #00ff88 100%)",
        "glass-gradient":
          "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
        "threat-gradient":
          "linear-gradient(135deg, #ff2d78 0%, #ff6b00 100%)",
        "safe-gradient":
          "linear-gradient(135deg, #00ff88 0%, #0087ff 100%)",
      },
      backgroundSize: {
        "grid-32": "32px 32px",
      },
      boxShadow: {
        "neon-cyan":   "0 0 10px #00e5ff, 0 0 30px rgba(0,229,255,0.3)",
        "neon-purple": "0 0 10px #bf5af2, 0 0 30px rgba(191,90,242,0.3)",
        "neon-green":  "0 0 10px #00ff88, 0 0 30px rgba(0,255,136,0.3)",
        "neon-pink":   "0 0 10px #ff2d78, 0 0 30px rgba(255,45,120,0.3)",
        "glass":       "inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 24px rgba(0,0,0,0.4)",
        "glass-lg":    "inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 48px rgba(0,0,0,0.6)",
      },
      borderColor: {
        "neon-cyan":   "rgba(0,229,255,0.4)",
        "neon-purple": "rgba(191,90,242,0.4)",
        "neon-green":  "rgba(0,255,136,0.4)",
      },
      animation: {
        "pulse-neon":  "pulseNeon 2s ease-in-out infinite",
        "scan-line":   "scanLine 4s linear infinite",
        "float":       "float 6s ease-in-out infinite",
        "glow-pulse":  "glowPulse 3s ease-in-out infinite",
        "data-stream": "dataStream 2s linear infinite",
        "fade-in-up":  "fadeInUp 0.6s ease-out forwards",
        "slide-in":    "slideIn 0.4s ease-out forwards",
        "spin-slow":   "spin 8s linear infinite",
        "ping-slow":   "ping 2s cubic-bezier(0,0,.2,1) infinite",
        "counter":     "counter 1s ease-out forwards",
      },
      keyframes: {
        pulseNeon: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.5" },
        },
        scanLine: {
          "0%":   { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-10px)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 5px rgba(0,229,255,0.4)" },
          "50%":      { boxShadow: "0 0 20px rgba(0,229,255,0.8), 0 0 40px rgba(0,229,255,0.4)" },
        },
        dataStream: {
          "0%":   { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "0 100px" },
        },
        fadeInUp: {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%":   { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
        display: ["'Inter'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
