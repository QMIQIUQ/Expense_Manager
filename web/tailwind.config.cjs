/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--accent-primary)',
        danger: 'var(--error-text)',
        success: 'var(--success-text)',
        info: 'var(--info-text)',
        warning: 'var(--warning-text)',
      },
      spacing: {
        'ui-0': 'var(--ui-space-0)',
        'ui-1': 'var(--ui-space-1)',
        'ui-2': 'var(--ui-space-2)',
        'ui-3': 'var(--ui-space-3)',
        'ui-4': 'var(--ui-space-4)',
        'ui-5': 'var(--ui-space-5)',
        'ui-6': 'var(--ui-space-6)',
        'ui-8': 'var(--ui-space-8)',
        'ui-10': 'var(--ui-space-10)',
        'ui-12': 'var(--ui-space-12)',
        'ui-16': 'var(--ui-space-16)',
      },
      borderRadius: {
        'ui-control': 'var(--ui-radius-control)',
        'ui-card': 'var(--ui-radius-card)',
        'ui-dialog': 'var(--ui-radius-dialog)',
        'ui-pill': 'var(--ui-radius-pill)',
      },
      fontSize: {
        'ui-xs': 'var(--ui-font-xs)',
        'ui-sm': 'var(--ui-font-md-sm)',
        'ui-base': 'var(--ui-font-base)',
        'ui-lg': 'var(--ui-font-lg)',
        'ui-xl': 'var(--ui-font-xl)',
        'ui-2xl': 'var(--ui-font-2xl)',
      },
    },
  },
  plugins: [],
}
