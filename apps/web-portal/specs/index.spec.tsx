import { Dashboard } from '@/features/dashboard';
import { screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import {
  assertNoAxeViolations,
  renderPresenter,
  usePresenterTestLifecycle,
} from '../features/dashboard/tests/presenter-harness';

usePresenterTestLifecycle();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Dashboard', () => {
  it('renders the FinOps screen landmarks', async () => {
    await renderPresenter(<Dashboard />);

    expect(screen.getByRole('heading', { level: 1, name: 'CloudPulse' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveProperty(
      'hash',
      '#main',
    );
    expect(document.getElementById('main')).not.toBeNull();
    expect(screen.getByRole('region', { name: 'FinOps KPI metrics' })).toBeDefined();
    expect(screen.getByRole('region', { name: 'Audited resource feed' })).toBeDefined();
    expect(
      screen.getByRole('complementary', {
        name: 'PulseAdvisor AI Assistant',
      }),
    ).toBeDefined();
  });

  it('shows an error instead of mock data when the live auditor API fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/status')) {
          return jsonResponse({ mode: 'LIVE', profile: 'sandbox' });
        }
        return jsonResponse({ error: true }, 503);
      }),
    );

    await renderPresenter(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Unable to load live audit data' })).toBeDefined();
    });
    expect(screen.getByRole('alert')).toHaveProperty(
      'textContent',
      'Request failed with status 503',
    );
    expect(screen.getByRole('button', { name: 'Try again' })).toBeDefined();
    expect(screen.queryByRole('region', { name: 'FinOps KPI metrics' })).toBeNull();
    expect(screen.queryByRole('complementary', { name: 'PulseAdvisor AI Assistant' })).toBeNull();
  });

  it('has no WCAG 2.1 AA axe violations', async () => {
    const { container } = await renderPresenter(<Dashboard />);
    await assertNoAxeViolations(container);
  });

  it('has no WCAG 2.1 AA axe violations when live audit data fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/status')) {
          return jsonResponse({ mode: 'LIVE', profile: 'sandbox' });
        }
        return jsonResponse({ error: true }, 503);
      }),
    );

    const { container } = await renderPresenter(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Unable to load live audit data' })).toBeDefined();
    });
    await assertNoAxeViolations(container);
  });
});
