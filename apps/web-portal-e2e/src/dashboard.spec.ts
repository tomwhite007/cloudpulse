import { expect, test } from '@playwright/test';

test('renders the FinOps dashboard in demo mode', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'CloudPulse' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'FinOps KPI metrics' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Audited resource feed' })).toBeVisible();
  await expect(
    page.getByRole('complementary', { name: 'PulseAdvisor AI Assistant' }),
  ).toBeVisible();
  await expect(
    page.getByRole('status', { name: 'Auditor Engine: Connected (Local)' }),
  ).toBeVisible();
});
