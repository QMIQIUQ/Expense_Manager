import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(() => ({
  base: process.env.DEPLOY_BASE ?? '/',
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split vendor code
          if (id.includes('node_modules')) {
            // Group React and React-dependent libraries together
            // Use more specific path matching to avoid false positives
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || 
                id.includes('node_modules/react-router') || id.includes('node_modules/recharts/') ||
                id.includes('node_modules/@reduxjs/toolkit/') || id.includes('node_modules/react-redux/') ||
                id.includes('node_modules/use-sync-external-store/')) {
              return 'react-vendor';
            }
            if (id.includes('node_modules/firebase/') || id.includes('node_modules/@firebase/')) {
              return 'firebase';
            }
            if (id.includes('node_modules/exceljs/')) {
              return 'exceljs.min';
            }
            // Other node_modules
            return 'vendor';
          }
          // Split large components by feature
          if (id.includes('/components/dashboard/')) {
            return 'dashboard-components';
          }
          if (id.includes('/components/cards/')) {
            return 'cards-components';
          }
          if (id.includes('/components/recurring/')) {
            return 'recurring-components';
          }
          if (id.includes('/components/budgets/')) {
            return 'budget-components';
          }
          if (id.includes('/components/income/')) {
            return 'income-components';
          }
          if (id.includes('/components/scheduledPayments/')) {
            return 'scheduled-payments-components';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    minify: 'esbuild',
    target: 'es2015',
  },
}))
