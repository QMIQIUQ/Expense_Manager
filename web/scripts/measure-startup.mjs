import { chromium } from '@playwright/test';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const [url, output, dist] = process.argv.slice(2);
if (!url || !output || !dist) throw new Error('Usage: node scripts/measure-startup.mjs URL OUTPUT_JSON DIST_DIRECTORY');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const files = [...new Set([...html.matchAll(/(?:src|href)="[^\"]*\/assets\/([^\"]+\.js)"/g)].map((match) => match[1]))];
const entry = files.map((name) => { const data = readFileSync(join(dist, 'assets', name)); return { name, bytes: data.length, gzipBytes: gzipSync(data).length }; });
const runs = [];
try {
  for (let index = 0; index < 3; index++) {
    const context = await browser.newContext(); const page = await context.newPage(); const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const read = async (action) => {
      await action();
      try { await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 10000 }); }
      catch (error) { throw new Error(JSON.stringify({ error: String(error), pageErrors: errors, body: (await page.locator('body').innerText()).slice(0, 1500) })); }
      return page.evaluate(() => ({ readyMs: performance.now(), firstContentfulPaintMs: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
        scriptTransferBytes: performance.getEntriesByType('resource').filter((item) => new URL(item.name).pathname.endsWith('.js') && item.name.includes('/assets/')).reduce((sum, item) => sum + item.transferSize, 0) }));
    };
    const cold = await read(() => page.goto(url, { waitUntil: 'domcontentloaded' }));
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), { timeout: 30000 });
    const warm = await read(() => page.reload({ waitUntil: 'domcontentloaded' }));
    const manifestFile = join(dist, '.vite', 'manifest.json');
    let optionalChart;
    if (existsSync(manifestFile)) {
      const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
      const chart = Object.keys(manifest).find((key) => key.endsWith('/ExpensePeriodChart.tsx'));
      if (chart) {
        optionalChart = new URL(manifest[chart].file, url).href;
        await page.evaluate((asset) => import(asset).then(() => true), optionalChart);
        const assets = new Set(); const visited = new Set();
        const visit = (key) => { if (visited.has(key)) return; visited.add(key); const item = manifest[key]; if (!item) return; assets.add(new URL(item.file, url).href); item.imports?.forEach(visit); };
        visit(chart);
        await page.waitForFunction(async (items) => (await Promise.all(items.map((asset) => caches.match(asset)))).every(Boolean), [...assets], { timeout: 30000 });
      }
    }
    await context.setOffline(true);
    const offline = await read(() => page.reload({ waitUntil: 'domcontentloaded' }));
    const optionalChartOffline = optionalChart ? await page.evaluate((asset) => import(asset).then(() => true), optionalChart) : undefined;
    if (errors.length) throw new Error(errors.join('\n'));
    runs.push({ cold, warm, offline, optionalChartOffline, pageErrors: errors.length });
    await context.close();
  }
} finally { await browser.close(); }
const result = { url, environment: 'Headless installed Chrome, fresh contexts, local production preview, no CPU/network throttling, 3 runs',
  entry, entryBytes: entry.reduce((sum, item) => sum + item.bytes, 0), entryGzipBytes: entry.reduce((sum, item) => sum + item.gzipBytes, 0), runs };
writeFileSync(output, JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
