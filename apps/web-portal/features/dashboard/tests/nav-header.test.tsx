import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NavHeader } from '../components/nav-header';
import {
  assertNoAxeViolations,
  clickControl,
  renderPresenter,
  usePresenterTestLifecycle,
} from './presenter-harness';

usePresenterTestLifecycle();

describe('NavHeader', () => {
  it('renders correctly', async () => {
    await renderPresenter(<NavHeader />);

    expect(screen.getByRole('heading', { name: 'CloudPulse' })).toBeDefined();

    expect(screen.getByText('Simulated Demo')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Unlock Live Sandbox' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Sync Telemetry' })).toBeDefined();
    expect(screen.getByRole('status', { name: /Auditor Engine: Connected/ })).toBeDefined();
  });

  it('opens the unlock modal from the header control', async () => {
    await renderPresenter(<NavHeader />);

    await clickControl(screen.getByRole('button', { name: 'Unlock Live Sandbox' }));

    expect(screen.getByRole('dialog', { name: 'Unlock Live Sandbox' })).toBeDefined();
    expect(screen.getByLabelText('Passphrase')).toBeDefined();
  });

  it('returns to the simulated demo from a live evaluator session', async () => {
    let isEvaluator = true;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? 'GET';
        if (url.includes('/api/auth/unlock') && method === 'DELETE') {
          isEvaluator = false;
          return new Response(JSON.stringify({ success: true, mode: 'SIMULATED' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (url.includes('/api/auth/unlock')) {
          return new Response(JSON.stringify({ isEvaluator }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        throw new Error('offline');
      }),
    );

    await renderPresenter(<NavHeader />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Return to Demo' })).toBeDefined();
    });
    expect(screen.getByText('Live AWS Sandbox')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Unlock Live Sandbox' })).toBeNull();

    await clickControl(screen.getByRole('button', { name: 'Return to Demo' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Unlock Live Sandbox' })).toBeDefined();
    });
    expect(screen.getByText('Simulated Demo')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Return to Demo' })).toBeNull();
  });

  it('has no WCAG 2.1 AA axe violations', async () => {
    const { container } = await renderPresenter(<NavHeader />);
    await assertNoAxeViolations(container);
  });
});
