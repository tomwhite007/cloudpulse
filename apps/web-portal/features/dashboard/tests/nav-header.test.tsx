import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NavHeader } from '../components/nav-header';
import { renderPresenter, usePresenterTestLifecycle } from './presenter-harness';

usePresenterTestLifecycle();

describe('NavHeader', () => {
  it('renders correctly', async () => {
    await renderPresenter(<NavHeader />);

    expect(screen.getByRole('heading', { name: 'CloudPulse' })).toBeDefined();

    expect(screen.getByRole('button', { name: 'Sync Telemetry' })).toBeDefined();
  });
});
