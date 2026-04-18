import type { Config } from "tailwindcss";

const config: Config = {
  // Dark is the default; light mode activates when `.light` is NOT absent (i.e. dark when no `.light` class)
  darkMode: ["selector", ":root:not(.light)"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic tokens — reference CSS custom properties
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // Futuristic Elite Tokens
        obsidian: "#02040a",
        "cyan-glow": "#00f2ff",
        "indigo-pulse": "#6366f1",
        "msey-purple": "#a855f7",
        "sovereign-gold": "#fbbf24",
        "ms-blue": "#00a4ef",
        "ey-yellow": "#ffe600",
      },

      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"],
        display: ["var(--font-outfit)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },

      boxShadow: {
        "glass-soft": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "aurora-glow": "0 0 40px rgba(79, 70, 229, 0.15)",
        "cyan-pulse": "0 0 20px rgba(0, 242, 255, 0.3)",
        "indigo-pulse": "0 0 20px rgba(99, 102, 241, 0.3)",
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },

      animation: {
        "fade-in": "fadeIn 400ms ease-out forwards",
        "fade-out": "fadeOut 400ms ease-in forwards",
        "slide-up": "slideUp 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "float-luxury": "aurora-float 20s ease-in-out infinite alternate",
        "pulse-cyan": "pulse-cyan 2s infinite",
      },

      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeOut: {
          "100%": { opacity: "0" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "pulse-cyan": {
          "0%, 100%": { boxShadow: "0 0 10px rgba(0, 242, 255, 0.3)" },
          "50%": { boxShadow: "0 0 25px rgba(0, 242, 255, 0.6)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
