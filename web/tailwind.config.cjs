/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        danger: '#f44336',
        success: '#4caf50',
        info: '#2196f3',
        warning: '#ff9800',
      },
    },
  },
  plugins: [],
}
