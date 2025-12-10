import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const isDev = command === 'serve'
  const base = process.env.DEPLOY_BASE ?? '/'

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'pwa-64x64.png', 'pwa-192x192.png', 'pwa-512x512.png', 'maskable-icon-512x512.png'],
        manifest: {
          name: 'Expense Manager',
          short_name: 'Expense Manager',
          description: 'A comprehensive expense tracking application for managing your finances',
          theme_color: '#10b981',
          background_color: '#ffffff',
          display: 'standalone',
          scope: base,
          start_url: base,
          orientation: 'portrait-primary',
          icons: [
            {
              src: `${base}pwa-64x64.png`,
              sizes: '64x64',
              type: 'image/png',
            },
            {
              src: `${base}pwa-192x192.png`,
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: `${base}pwa-512x512.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: `${base}maskable-icon-512x512.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          categories: ['finance', 'productivity'],
          screenshots: [
            {
              src: `${base}screenshots/desktop-1.png`,
              sizes: '1280x720',
              type: 'image/png',
              form_factor: 'wide',
              label: 'Dashboard view on desktop',
            },
            {
              src: `${base}screenshots/mobile-1.png`,
              sizes: '750x1334',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Expense tracking on mobile',
            },
            {
              src: `${base}screenshots/mobile-2.png`,
              sizes: '750x1334',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Budget management on mobile',
            },
          ],
        } as any,
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'firebase-api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24, // 24 hours
                },
                networkTimeoutSeconds: 10,
              },
            },
            {
              urlPattern: /^https:\/\/identitytoolkit\.googleapis\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'firebase-auth-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24, // 24 hours
                },
                networkTimeoutSeconds: 10,
              },
            },
          ],
        },
        devOptions: {
          enabled: isDev,
          type: 'module',
          // During dev, the PWA plugin serves from dev-dist which may only contain the service worker files;
          // suppress the noisy glob warnings when no other assets are present.
          suppressWarnings: true,
        },
      }),
    ],
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
                return 'react-vendor'
              }
              if (id.includes('node_modules/firebase/') || id.includes('node_modules/@firebase/')) {
                return 'firebase'
              }
              if (id.includes('node_modules/exceljs/')) {
                return 'exceljs.min'
              }
              // Other node_modules
              return 'vendor'
            }
            // Split large components by feature
            if (id.includes('/components/dashboard/')) {
              return 'dashboard-components'
            }
            if (id.includes('/components/cards/')) {
              return 'cards-components'
            }
            if (id.includes('/components/recurring/')) {
              return 'recurring-components'
            }
            if (id.includes('/components/budgets/')) {
              return 'budget-components'
            }
            if (id.includes('/components/income/')) {
              return 'income-components'
            }
            if (id.includes('/components/scheduledPayments/')) {
              return 'scheduled-payments-components'
            }
          },
        },
      },
      chunkSizeWarningLimit: 1000,
      minify: 'esbuild',
      target: 'es2015',
    },
    closeBundle: async () => {
      // Add screenshots to manifest after build
      if (command === 'build') {
        const manifestPath = path.join(__dirname, 'dist', 'manifest.webmanifest')
        if (fs.existsSync(manifestPath)) {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
          manifest.screenshots = [
            {
              src: `${base}screenshots/desktop-1.png`,
              sizes: '1280x720',
              type: 'image/png',
              form_factor: 'wide',
              label: 'Dashboard view on desktop',
            },
            {
              src: `${base}screenshots/mobile-1.png`,
              sizes: '750x1334',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Expense tracking on mobile',
            },
            {
              src: `${base}screenshots/mobile-2.png`,
              sizes: '750x1334',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'Budget management on mobile',
            },
          ]
          fs.writeFileSync(manifestPath, JSON.stringify(manifest))
          console.log('✓ Added screenshots to manifest')
        }
      }
    },
  }
})
