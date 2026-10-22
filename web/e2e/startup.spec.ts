import { expect, test } from '@playwright/test';
test('restores week-old local data and durable pending writes after closing the app', async ({ context }) => {
  const page = await context.newPage(); await page.goto('/test-fixtures/startup.html');
  await expect(page.getByRole('status')).toContainText('還原本機資料');
  await expect(page.locator('#finances')).toHaveCount(0);
  await page.locator('#seed').click(); await expect(page.locator('#seeded')).toHaveText('saved');
  await page.locator('#restore').click(); await expect(page.locator('#finances')).toHaveText('2:130');
  await page.close();
  const reopened = await context.newPage(); await reopened.clock.setFixedTime(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await reopened.goto('/test-fixtures/startup.html');
  await expect(reopened.getByRole('status')).toContainText('還原本機資料');
  await expect(reopened.locator('#finances')).toHaveCount(0);
  await reopened.locator('#restore').click(); await expect(reopened.locator('#finances')).toHaveText('2:130');
});
test('storage restoration errors leave financial views gated and provide recovery', async ({ page }) => {
  await page.goto('/test-fixtures/startup.html?failure=1');
  await expect(page.getByRole('alert')).toContainText('pending writes retained');
  await expect(page.getByRole('button', { name: /Retry/ })).toBeVisible();
  await expect(page.locator('#finances')).toHaveCount(0);
});
