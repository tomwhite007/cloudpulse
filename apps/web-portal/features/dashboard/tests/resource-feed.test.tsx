import { MOCK_AUDIT_RESOURCES } from '@cloudpulse/api-contracts/mocks';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResourceFeed } from '../components/resource-feed';
import { clickControl, renderPresenter, usePresenterTestLifecycle } from './presenter-harness';

usePresenterTestLifecycle();

describe('ResourceFeed', () => {
  it('filters the list when a status tab is chosen', async () => {
    await renderPresenter(<ResourceFeed resources={MOCK_AUDIT_RESOURCES} />);

    expect(await screen.findByRole('heading', { name: 'prod-payments-aurora' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'analytics-scratch-vol-08f2' })).toBeDefined();

    await clickControl(screen.getByRole('tab', { name: 'Zombie' }));

    expect(screen.queryByRole('heading', { name: 'prod-payments-aurora' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'analytics-scratch-vol-08f2' })).toBeDefined();
  });

  it('filters the list when a resource type tab is chosen', async () => {
    await renderPresenter(<ResourceFeed resources={MOCK_AUDIT_RESOURCES} />);

    await clickControl(screen.getByRole('tab', { name: 'RDS' }));

    expect(await screen.findByRole('heading', { name: 'prod-payments-aurora' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'analytics-scratch-vol-08f2' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'staging-batch-cluster' })).toBeNull();
  });

  it('shows an empty status when filters match nothing', async () => {
    await renderPresenter(<ResourceFeed resources={MOCK_AUDIT_RESOURCES} />);

    await clickControl(screen.getByRole('tab', { name: 'Zombie' }));
    await clickControl(screen.getByRole('tab', { name: 'RDS' }));

    expect(
      await screen.findByRole('status', {
        name: 'No resources match the current filters.',
      }),
    ).toBeDefined();
  });
});
