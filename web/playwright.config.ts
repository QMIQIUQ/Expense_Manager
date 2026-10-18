import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
export default defineConfig({
  testDir: './e2e', workers: 1, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4179', headless: true, launchOptions: existsSync(chrome) ? { executablePath: chrome } : {} },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 4179 --strictPort', env: {
    FIREBASE_DEPLOY: 'true', VITE_USE_FIREBASE_EMULATORS: 'true', VITE_FIREBASE_PROJECT_ID: 'demo-expense-manager',
    VITE_FIREBASE_API_KEY: 'demo-api-key', VITE_FIREBASE_APP_ID: 'demo-app', VITE_FIREBASE_AUTH_DOMAIN: 'demo-expense-manager.firebaseapp.com',
    VITE_FIREBASE_STORAGE_BUCKET: 'demo-expense-manager.appspot.com', VITE_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
  }, url: 'http://127.0.0.1:4179/test-fixtures/outbox.html', reuseExistingServer: false },
});
