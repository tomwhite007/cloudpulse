import { expect, test } from '@playwright/test';

const zombieVolume = 'analytics-scratch-vol-08f2';
const mockPrUrl = 'https://github.com/example/cloudpulse/pull/104';

test('drafts a simulated remediation pull request from a resource action', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('status', { name: 'Auditor Engine: Connected (Local)' }),
  ).toBeVisible();

  const advisor = page.getByRole('complementary', { name: 'PulseAdvisor AI Assistant' });
  await page.getByRole('button', { name: 'Snapshot & Terminate' }).click();

  await expect(
    page.getByRole('status').filter({ hasText: 'Reviewing in Advisor' }),
  ).toBeVisible();
  await expect(advisor.getByText(`Request PR proposal for ${zombieVolume}`)).toBeVisible();
  await expect(advisor.getByText('SIMULATED PROPOSAL (MOCK)')).toBeVisible();
  await expect(
    advisor.getByRole('heading', {
      name: `fix(infra): remediate ebs ${zombieVolume}`,
    }),
  ).toBeVisible();

  await advisor.getByRole('button', { name: 'Draft Pull Request' }).click();

  await expect(advisor.getByRole('link', { name: /Open PR #104/ })).toHaveAttribute(
    'href',
    mockPrUrl,
  );
  await expect(page.getByRole('link', { name: 'PR #104 Open' })).toHaveAttribute('href', mockPrUrl);
});
