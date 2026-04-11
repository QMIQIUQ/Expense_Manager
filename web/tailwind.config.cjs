/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#7c3aed',
        danger: '#ef4444',
        success: '#22c55e',
        info: '#3b82f6',
        warning: '#f97316',
      },
    },
  },
  plugins: [],
}
