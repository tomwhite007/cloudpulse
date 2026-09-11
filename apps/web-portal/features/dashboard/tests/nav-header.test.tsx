import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NavHeader } from '../components/nav-header';
import {
  assertNoAxeViolations,
  renderPresenter,
  usePresenterTestLifecycle,
} from './presenter-harness';

usePresenterTestLifecycle();

describe('NavHeader', () => {
  it('renders correctly', async () => {
    await renderPresenter(<NavHeader />);

    expect(screen.getByRole('heading', { name: 'CloudPulse' })).toBeDefined();

    expect(screen.getByRole('button', { name: 'Sync Telemetry' })).toBeDefined();
    expect(screen.getByRole('status', { name: /Auditor Engine: Connected/ })).toBeDefined();
  });

  it('has no WCAG 2.1 AA axe violations', async () => {
    const { container } = await renderPresenter(<NavHeader />);
    await assertNoAxeViolations(container);
  });
});
