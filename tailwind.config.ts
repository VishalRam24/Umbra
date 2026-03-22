import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        graphite: {
          900: "#1a1a1a",
          800: "#222222",
          700: "#2a2a2a",
          600: "#333333",
          500: "#444444",
          400: "#666666",
          300: "#888888",
          200: "#aaaaaa",
          100: "#cccccc",
        },
        accent: {
          DEFAULT: "#4a9eff",
          hover: "#6bb3ff",
        },
      },
      fontFamily: {
        sans: [
          "SF Pro Display",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
