import { chromium, expect } from '@playwright/test';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const [url, output, dist] = process.argv.slice(2);
if (!url || !output || !dist || new URL(url).hostname !== '127.0.0.1') throw new Error('Only local production previews are supported');
const manifest = JSON.parse(readFileSync(join(dist, '.vite/manifest.json'), 'utf8'));
const entry = Object.values(manifest).find((item) => item.isEntry);
if (!readFileSync(join(dist, entry.file), 'utf8').includes('demo-expense-manager')) throw new Error('Build the demo emulator configuration before this test');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
const context = await browser.newContext(); let page;
try {
  const email = `pwa-${randomUUID()}@emulator.test`; const password = 'Fixture-only-Password-123!';
  const signup = await context.request.post('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key', { data: { email, password, returnSecureToken: true } });
  if (!signup.ok()) throw new Error('Emulator signup failed');
  const { localId: uid, idToken } = await signup.json();
  const encode = (value) => {
    if (typeof value === 'string') return { stringValue: value };
    if (typeof value === 'boolean') return { booleanValue: value };
    if (typeof value === 'number') return { doubleValue: value };
    if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])) } };
  };
  const put = async (collection, id, data) => {
    const response = await context.request.patch(`http://127.0.0.1:8080/v1/projects/demo-expense-manager/databases/(default)/documents/${collection}/${id}`, {
      headers: { Authorization: `Bearer ${idToken}` }, data: { fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encode(value)])) },
    });
    if (!response.ok()) throw new Error(`Fixture setup failed for ${collection}: ${response.status()}`);
  };
  await put('users', uid, { email, isAdmin: false, isActive: true });
  await put('userSettings', uid, { userId: uid, billingCycleDay: 1, displayCurrency: 'MYR', timeFormat: '24h', dateFormat: 'YYYY-MM-DD', defaultCategoryMigrationVersion: 1 });
  await put('featureSettings', uid, { userId: uid, enabledFeatures: ['dashboard', 'expenses'], tabFeatures: ['dashboard', 'expenses'], hamburgerFeatures: [] });
  const widgets = ['recent-expenses', 'expense-chart', 'month-over-month', 'friend-spending'].map((type, order) => ({ id: `fixture-${type}`, type, enabled: order === 0, order, size: 'full' }));
  await put('dashboardLayouts', uid, { userId: uid, columns: 1, widgets, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  await put('expenses', `${uid}-expense`, { userId: uid, description: 'PWA fixture expense', category: 'Food', amount: 123, currency: 'MYR', baseCurrency: 'MYR', baseAmount: 123, paymentMethod: 'cash', date: new Date().toISOString().slice(0, 10) });
  page = await context.newPage();
  await page.goto(url); await page.locator('input[type="email"]').fill(email); await page.locator('input[type="password"]').fill(password);
  await page.locator('input[type="checkbox"]').check(); await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.getByText('PWA fixture expense', { exact: true })).toBeVisible({ timeout: 30000 });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.waitForFunction((owner) => ['expenses', 'incomes', 'repayments', 'transfers', 'userSettings', 'dashboardLayout'].every((entity) => localStorage.getItem(`expense_snapshot_v2_${entity}_${owner}`)), uid);
  const chart = Object.keys(manifest).find((key) => key.endsWith('/ExpenseChartWidget.tsx'));
  if (!chart) throw new Error('Expected a deferred chart module');
  const chartUrl = new URL(manifest[chart].file, url).href;
  if (await page.evaluate((asset) => caches.match(asset).then(Boolean), chartUrl)) throw new Error('Hidden chart was downloaded eagerly');
  await context.setOffline(true); await page.close(); page = await context.newPage();
  await page.goto(new URL('dashboard', url).href);
  await expect(page.getByText('PWA fixture expense', { exact: true })).toBeVisible({ timeout: 10000 });
  const offlineFinancialReopen = true;
  await page.locator('.dashboard-customize-header button').click();
  await page.locator('.widget-item').filter({ hasText: 'Expense Chart' }).locator('.btn-visibility').click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText(/This feature could not load/)).toBeVisible({ timeout: 10000 });
  const unseenOptionalFallback = true;
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Retry / 重試', exact: true }).click();
  await expect(page.locator('.recharts-wrapper')).toBeVisible({ timeout: 30000 });
  const reconnectRetry = true;
  await page.waitForFunction((asset) => caches.match(asset).then(Boolean), chartUrl);
  await context.setOffline(true); await page.close(); page = await context.newPage(); await page.goto(new URL('dashboard', url).href);
  await expect(page.getByText('PWA fixture expense', { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.recharts-wrapper')).toBeVisible({ timeout: 10000 });
  const result = { url, mode: 'Production build with a controlling service worker; disposable Auth/Firestore emulator account', offlineFinancialReopen, unseenOptionalFallback, reconnectRetry, previouslyLoadedChartOffline: true };
  writeFileSync(output, JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
} catch (error) {
  if (page) { await page.screenshot({ path: output + '.png' }); console.error((await page.locator('body').innerText()).slice(0, 1800)); }
  throw error;
} finally { await context.close(); await browser.close(); }
