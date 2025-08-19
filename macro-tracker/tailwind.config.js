// Update your tailwind.config.js to include our custom colors:
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0f4ff",
          500: "#667eea",
          600: "#5a6fd8",
        },
        macro: {
          protein: "#e879a7",
          carbs: "#68b894",
          fat: "#fbb040",
        },
      },
    },
  },
  plugins: [],
};
