import { expect, test } from '@playwright/test';

test('per-person repayment survives offline acceptance/reload and syncs exactly once', async ({ page, context }) => {
  await page.goto('/test-fixtures/ledger.html');
  await expect(page.getByRole('row', { name: /Amy/ })).toContainText('40.00');
  await page.getByRole('button', { name: 'Add Repayment', exact: true }).click();
  await page.getByLabel('Split participant', { exact: true }).selectOption('amy');
  await page.getByLabel(/Repayment amount/i).fill('2000');
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByLabel('Split participant', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('row', { name: /Amy/ })).toContainText('20.00');
  await context.setOffline(false); await page.reload();
  await expect(page.getByRole('row', { name: /Amy/ })).toContainText('20.00');
  await page.getByRole('button', { name: 'Sync pending ledger' }).click();
  await expect(page.locator('#ledger-sync')).toContainText('"failed":0');
  await expect(page.locator('#ledger-sync')).toContainText('"remaining":0');
  await page.getByRole('button', { name: 'Sync pending ledger' }).click();
  await expect(page.locator('#ledger-sync')).toContainText('"success":0');
  await expect(page.getByRole('row', { name: /Amy/ })).toContainText('20.00');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/ledger-splits-mobile.png', fullPage: true });
});

test('saved views and new tags persist through offline reload and remote sync', async ({ page, context }) => {
  await page.goto('/test-fixtures/ledger.html');
  await page.getByRole('button', { name: 'views', exact: true }).click();
  await page.getByText('Saved views', { exact: true }).click();
  await expect(page.getByLabel('View name')).toBeVisible();
  await page.getByLabel('Search fixture').fill('Food trip');
  await page.getByLabel('View name').fill('Food trip view');
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Save current view' }).click();
  await expect(page.getByRole('button', { name: 'Food trip view', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'New tag', exact: true }).fill('Trip');
  await page.getByRole('button', { name: 'New tag', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Trip', exact: true })).toBeVisible();
  await context.setOffline(false); await page.reload();
  await page.getByRole('button', { name: 'views', exact: true }).click();
  await page.getByText('Saved views', { exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Trip', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Food trip view', exact: true }).click();
  await expect(page.getByLabel('Search fixture')).toHaveValue('Food trip');
  await page.getByRole('button', { name: 'Sync pending ledger' }).click();
  await expect(page.locator('#ledger-sync')).toContainText('"failed":0');
  await expect(page.locator('#ledger-sync')).toContainText('"remaining":0');
});

test('duplicate reminder requires an explicit choice, and equal split leaves my share out', async ({ page }) => {
  await page.goto('/test-fixtures/ledger.html');
  await page.getByRole('button', { name: 'duplicates', exact: true }).click();
  await page.getByRole('button', { name: 'Review seeded duplicate' }).click();
  await expect(page.getByText('Possible duplicate expense', { exact: true })).toBeVisible();
  await expect(page.locator('#accepted')).toHaveText('0');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Review seeded duplicate' }).click();
  await page.getByRole('button', { name: 'Add anyway', exact: true }).click();
  await expect(page.locator('#accepted')).toHaveText('1');
  await page.getByRole('button', { name: 'split', exact: true }).click();
  for (const person of ['Amy','Bob']) {
    await page.getByLabel('New participant name').fill(person);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Split equally including me' }).click();
  await expect(page.getByLabel('Owed Amy', { exact: true })).toHaveValue('40');
  await expect(page.getByLabel('Owed Bob', { exact: true })).toHaveValue('40');
  await expect(page.getByText(/Your share.*40.00/)).toBeVisible();
});

test('reconciliation completion needs checked transactions and zero difference, then survives reload', async ({ page }) => {
  await page.goto('/test-fixtures/ledger.html');
  await page.getByRole('button', { name: 'reconciliation', exact: true }).click();
  await page.getByRole('button', { name: 'Load complete statement period' }).click();
  await expect(page.getByLabel('Opening balance', { exact: true })).toBeVisible();
  const complete = page.getByRole('button', { name: 'Complete snapshot reconciliation' });
  await expect(complete).toBeDisabled();
  await page.getByLabel('Opening balance', { exact: true }).fill('1000');
  await page.getByLabel('Actual statement closing balance', { exact: true }).fill('990');
  await expect(complete).toBeDisabled();
  await page.getByRole('button', { name: 'I have checked all transactions / clear checks' }).click();
  await expect(complete).toBeEnabled();
  await complete.click();
  await expect(page.getByText('Saved on this device; synchronizing in the background.', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Sync pending ledger' }).click();
  await expect(page.locator('#ledger-sync')).toContainText('"failed":0');
  await expect(page.locator('#ledger-sync')).toContainText('"remaining":0');
  await page.reload();
  await page.getByRole('button', { name: 'reconciliation', exact: true }).click();
  await page.getByRole('button', { name: 'Load complete statement period' }).click();
  await expect(page.getByLabel('Opening balance', { exact: true })).toHaveValue('1000');
  await expect(page.getByLabel('Actual statement closing balance', { exact: true })).toHaveValue('990');
});

test('spending insight waits for explicit analysis and reads a complete comparison period', async ({ page }) => {
  await page.goto('/test-fixtures/ledger.html');
  await page.getByRole('button', { name: 'insights', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Analyze complete period' })).toBeEnabled();
  await expect(page.getByText('Insight food', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Analyze complete period' }).click();
  await expect(page.getByText('Insight food', { exact: true })).toBeVisible();
  await expect(page.getByText(/Historical median/)).toContainText('50.00');
  await expect(page.getByText(/Historical median/)).toContainText('6.0');
});
