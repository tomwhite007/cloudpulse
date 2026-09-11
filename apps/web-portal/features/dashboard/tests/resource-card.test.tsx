import { MOCK_AUDIT_RESOURCES } from '@cloudpulse/api-contracts/mocks';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResourceCard } from '../components/resource-card';
import { useDashboardStore } from '../store/dashboard-store';
import { clickControl, renderPresenter, usePresenterTestLifecycle } from './presenter-harness';

usePresenterTestLifecycle();

const overProvisioned = MOCK_AUDIT_RESOURCES[0];

describe('ResourceCard', () => {
  it('sets the reviewing status when clicking remediate', async () => {
    await renderPresenter(<ResourceCard resource={overProvisioned} />);

    await clickControl(
      screen.getByRole('button', {
        name: overProvisioned.recommendedAction.label,
      }),
    );

    await waitFor(() => {
      expect(screen.getByText('Reviewing in Advisor')).toBeDefined();
    });
    expect(
      screen.queryByRole('button', {
        name: overProvisioned.recommendedAction.label,
      }),
    ).toBeNull();
  });

  it('shows a disabled PR open CTA after a draft is queued', async () => {
    useDashboardStore.getState().queueRemediation(overProvisioned.id, {
      prNumber: 42,
      prUrl: 'https://github.com/example/cloudpulse/pull/42',
    });

    await renderPresenter(<ResourceCard resource={overProvisioned} />);

    const cta = screen.getByRole('button', { name: 'PR #42 Open' });
    expect(cta).toHaveProperty('disabled', true);
    expect(
      screen.queryByRole('button', {
        name: overProvisioned.recommendedAction.label,
      }),
    ).toBeNull();
  });
});
