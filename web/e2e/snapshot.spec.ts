import { expect, test } from '@playwright/test';
test('real browser authenticates the consistent snapshot query and excludes a later edit', async ({ page }) => {
  await page.goto('/test-fixtures/snapshot.html');
  await page.locator('#run').click();
  await expect.poll(async () => JSON.parse(await page.locator('#result').innerText() || '{}').passed, { timeout: 30000 }).toBe(true);
  const result = JSON.parse(await page.locator('#result').innerText());
  expect(result).toMatchObject({ firstCount: 100, secondCount: 1, snapshotAmount: 1, currentAmount: 99 });
});
