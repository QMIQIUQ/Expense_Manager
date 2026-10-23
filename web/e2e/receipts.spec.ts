import { expect, test } from '@playwright/test';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1kAAAAASUVORK5CYII=', 'base64');

test('receipt content survives offline upload/reload, sync, archive/restore and offline viewing', async ({ page, context }) => {
  await page.goto('/test-fixtures/ledger.html');
  await page.getByRole('button', { name: 'receipts', exact: true }).click();
  const chooser = page.getByLabel('Attach a receipt', { exact: true });
  await expect(chooser).toBeVisible();
  await context.setOffline(true);
  await chooser.setInputFiles({ name: 'receipt.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByRole('button', { name: 'View receipt', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View receipt', exact: true }).click();
  await expect(page.getByRole('img', { name: 'receipt.png', exact: true })).toBeVisible();
  await context.setOffline(false); await page.reload();
  await page.getByRole('button', { name: 'receipts', exact: true }).click();
  await expect(page.getByRole('button', { name: 'View receipt', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sync pending ledger' }).click();
  await expect(page.locator('#ledger-sync')).toContainText('"failed":0');
  await expect(page.locator('#ledger-sync')).toContainText('"remaining":0');
  await page.getByRole('button', { name: 'Archive receipt', exact: true }).click();
  await expect(page.getByRole('button', { name: 'View receipt', exact: true })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Show archived receipts' }).check();
  await page.getByRole('button', { name: 'Restore receipt', exact: true }).click();
  await page.getByRole('button', { name: 'Sync pending ledger' }).click();
  await expect(page.locator('#ledger-sync')).toContainText('"remaining":0');
  await context.setOffline(true);
  await page.getByRole('button', { name: 'View receipt', exact: true }).click();
  const image = page.getByRole('img', { name: 'receipt.png', exact: true });
  await expect(image).toBeVisible(); expect(await image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBe(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/receipt-archive-mobile.png', fullPage: true });
});

test('rejects disguised files and oversized PDFs without accepting an attachment', async ({ page }) => {
  await page.goto('/test-fixtures/ledger.html');
  await page.getByRole('button', { name: 'receipts', exact: true }).click();
  const chooser = page.getByLabel('Attach a receipt', { exact: true });
  await chooser.setInputFiles({ name: 'receipt.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('<html>not an image</html>') });
  await expect(page.getByRole('alert')).toContainText('JPEG, PNG, WebP');
  const largePdf = Buffer.alloc(600 * 1024 + 1, 32); largePdf.write('%PDF-1.7');
  await chooser.setInputFiles({ name: 'large.pdf', mimeType: 'application/pdf', buffer: largePdf });
  await expect(page.getByRole('alert')).toContainText('600 KiB');
  await page.getByRole('button', { name: 'Sync pending ledger' }).click();
  await expect(page.locator('#ledger-sync')).toHaveText('{"success":0,"failed":0,"remaining":0}');
  await expect(page.getByRole('button', { name: 'View receipt', exact: true })).toHaveCount(0);
});

test('permanent upload failure retains local bytes and can be retried after the parent is restored', async ({ page }) => {
  await page.goto('/test-fixtures/ledger.html');
  await page.getByRole('button', { name: 'receipts', exact: true }).click();
  await page.getByRole('button', { name: 'Remove receipt parent remotely' }).click();
  await expect(page.locator('#ledger-sync')).toHaveText('parent removed');
  await page.getByLabel('Attach a receipt', { exact: true }).setInputFiles({ name: 'recovery.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByRole('button', { name: 'View receipt', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sync pending ledger' }).click();
  await expect(page.locator('#ledger-sync')).toContainText('"failed":1');
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View receipt', exact: true }).click();
  await expect(page.getByRole('img', { name: 'recovery.png', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Restore receipt parent remotely' }).click();
  await expect(page.locator('#ledger-sync')).toHaveText('parent restored');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await page.getByRole('button', { name: 'Sync pending ledger' }).click();
  await expect(page.locator('#ledger-sync')).toHaveText('{"success":1,"failed":0,"remaining":0}');
});
