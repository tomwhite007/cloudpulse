import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NavHeader } from '../components/nav-header';
import {
  clickControl,
  renderPresenter,
  usePresenterTestLifecycle,
} from './presenter-harness';

usePresenterTestLifecycle();

describe('NavHeader', () => {
  it('switches the auditor source when Live AWS is chosen', async () => {
    await renderPresenter(<NavHeader />);

    expect(
      screen
        .getByRole('button', { name: 'Simulated Enterprise' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      screen.getByRole('status', {
        name: 'Auditor Engine: Connected (Local)',
      }),
    ).toBeDefined();

    await clickControl(screen.getByRole('button', { name: 'Live AWS' }));

    expect(
      screen.getByRole('button', { name: 'Live AWS' }).getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      screen.getByRole('status', {
        name: 'Auditor Engine: Awaiting AWS credentials',
      }),
    ).toBeDefined();
  });

  it('returns to simulated telemetry from live mode', async () => {
    await renderPresenter(<NavHeader />);

    await clickControl(screen.getByRole('button', { name: 'Live AWS' }));
    await clickControl(
      screen.getByRole('button', { name: 'Simulated Enterprise' }),
    );

    expect(
      screen
        .getByRole('button', { name: 'Simulated Enterprise' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      screen.getByRole('status', {
        name: 'Auditor Engine: Connected (Local)',
      }),
    ).toBeDefined();
  });
});
