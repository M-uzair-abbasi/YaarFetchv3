/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          500: "#2563EB",
          600: "#1E40AF",
        },
      },
    },
  },
  plugins: [],
};

