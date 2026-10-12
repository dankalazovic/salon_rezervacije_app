/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/*/.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        blush: {
          50: "#fff0f6",
          100: "#ffe0ef",
          200: "#ffc2df",
          300: "#ff9ec9",
          400: "#ff6ea8",
          500: "#ff3d8a",
          600: "#f01f72"
        }
      },
      boxShadow: {
        glow: "0 18px 50px rgba(255, 61, 138, 0.30)",
        soft: "0 14px 40px rgba(0,0,0,0.10)"
      }
    }
  },
  plugins: []
};