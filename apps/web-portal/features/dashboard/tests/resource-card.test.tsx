import { MOCK_AUDIT_RESOURCES } from '@cloudpulse/api-contracts/mocks';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResourceCard } from '../components/resource-card';
import { useDashboardStore } from '../store/dashboard-store';
import {
  assertNoAxeViolations,
  clickControl,
  renderPresenter,
  usePresenterTestLifecycle,
} from './presenter-harness';

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
      screen.getByText('Reviewing in Advisor').closest('[aria-current="true"]'),
    ).not.toBeNull();
    expect(
      screen.queryByRole('button', {
        name: overProvisioned.recommendedAction.label,
      }),
    ).toBeNull();
  });

  it('links to the open pull request after a draft is queued', async () => {
    useDashboardStore.getState().queueRemediation(overProvisioned.id, {
      prNumber: 42,
      prUrl: 'https://github.com/example/cloudpulse/pull/42',
    });

    await renderPresenter(<ResourceCard resource={overProvisioned} />);

    const cta = screen.getByRole('link', { name: 'PR #42 Open' });
    expect(cta.getAttribute('href')).toBe('https://github.com/example/cloudpulse/pull/42');
    expect(
      screen.queryByRole('button', {
        name: overProvisioned.recommendedAction.label,
      }),
    ).toBeNull();
  });

  it('has no WCAG 2.1 AA axe violations in default, reviewing, and queued states', async () => {
    const idle = await renderPresenter(<ResourceCard resource={overProvisioned} />);
    await assertNoAxeViolations(idle.container);
    idle.unmount();

    useDashboardStore.getState().setReviewingRemediation(overProvisioned.id);
    const reviewing = await renderPresenter(<ResourceCard resource={overProvisioned} />);
    await assertNoAxeViolations(reviewing.container);
    reviewing.unmount();

    useDashboardStore.getState().queueRemediation(overProvisioned.id, {
      prNumber: 42,
      prUrl: 'https://github.com/example/cloudpulse/pull/42',
    });
    const queued = await renderPresenter(<ResourceCard resource={overProvisioned} />);
    await assertNoAxeViolations(queued.container);
  });
});
