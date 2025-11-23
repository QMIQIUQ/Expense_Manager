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
            if (id.includes('react') || id.includes('react-dom') || 
                id.includes('react-router') || id.includes('recharts') ||
                id.includes('@reduxjs/toolkit') || id.includes('react-redux') ||
                id.includes('use-sync-external-store')) {
              return 'react-vendor';
            }
            if (id.includes('firebase')) {
              return 'firebase';
            }
            if (id.includes('exceljs')) {
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
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    minify: 'esbuild',
    target: 'es2015',
  },
}))
