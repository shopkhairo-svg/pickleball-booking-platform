/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "primary": "#0f7a4b",
        "primary-container": "#d9f5e5",
        "on-primary": "#ffffff",
        "on-primary-container": "#073b25",
        "background": "#f3f6f1",
        "on-background": "#121713",
        "surface": "#ffffff",
        "on-surface": "#121713",
        "on-surface-variant": "#526057",
        "outline": "#78837c",
        "outline-variant": "#d9e0da",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#eef3ee",
        "surface-container": "#e8eee8",
        "surface-container-high": "#dde7df",
        "surface-container-highest": "#d2ddd5",
        "error": "#b42318",
        "ink": "#07130f",
        "clay": "#a35a2a",
        "court-blue": "#2563eb",
        "court-amber": "#c47f17",
      },
      fontFamily: {
        lexend: ["Lexend", "sans-serif"],
        sans: ["Lexend", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "scale(0.96) translateY(8px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
