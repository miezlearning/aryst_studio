/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Sunghyun Sans'", "'Figtree'", "system-ui", "-apple-system", "sans-serif"],
        display: ["'Sunghyun Sans'", "system-ui", "-apple-system", "sans-serif"],
        mono: ["'Sunghyun Sans'", "'Figtree'", "system-ui", "sans-serif"],
      },
      colors: {
        canvas: {
          DEFAULT: "#FAF8F5",
          sand: "#F4F1EA",
          card: "#FFFFFF",
          subtle: "#F2EFE9",
        },
        ink: {
          DEFAULT: "#121212",
          secondary: "#52525B",
          muted: "#71717A",
          faint: "#A1A1AA",
        },
        brand: {
          DEFAULT: "#FF5A1F",
          hover: "#E8470B",
          dark: "#C2410C",
          light: "#FFF1EB",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "hero-ripple": {
          "0%": { transform: "translate(-50%, -50%) scale(0)", opacity: "0.8" },
          "100%": { transform: "translate(-50%, -50%) scale(1)", opacity: "0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-subtle": "pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "hero-ripple": "hero-ripple 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
    },
  },
  plugins: [],
}
