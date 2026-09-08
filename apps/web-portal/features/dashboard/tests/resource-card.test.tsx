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


});
