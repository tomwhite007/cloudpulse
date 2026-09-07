import { MOCK_AUDIT_RESOURCES } from '@cloudpulse/api-contracts';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResourceCard } from '../components/resource-card';
import {
  clickControl,
  renderPresenter,
  usePresenterTestLifecycle,
} from './presenter-harness';

usePresenterTestLifecycle();

const overProvisioned = MOCK_AUDIT_RESOURCES[0];

describe('ResourceCard', () => {
  it('queues a 1-click remediation and shows queued status', async () => {
    await renderPresenter(<ResourceCard resource={overProvisioned} />);

    await clickControl(
      screen.getByRole('button', {
        name: overProvisioned.recommendedAction.label,
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole('status', { name: 'Queued' })).toBeDefined();
    });
    expect(
      screen.queryByRole('button', {
        name: overProvisioned.recommendedAction.label,
      }),
    ).toBeNull();
  });

  it('keeps the action available when the auditor cannot queue it', async () => {
    await renderPresenter(
      <ResourceCard
        resource={{
          ...overProvisioned,
          id: 'missing-resource',
        }}
      />,
    );

    await clickControl(
      screen.getByRole('button', {
        name: overProvisioned.recommendedAction.label,
      }),
    );

    await waitFor(() => {
      const action = screen.getByRole('button', {
        name: overProvisioned.recommendedAction.label,
      });
      expect((action as HTMLButtonElement).disabled).toBe(false);
    });
    expect(screen.queryByRole('status', { name: 'Queued' })).toBeNull();
  });
});
