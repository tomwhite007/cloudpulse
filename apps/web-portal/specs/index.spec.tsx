import { Dashboard } from '@/features/dashboard';
import {
  createMockCostAuditSummary,
  createMockResourceStatusCard,
  MOCK_COST_AUDIT_SUMMARY,
} from '@cloudpulse/api-contracts/mocks';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import {
  assertNoAxeViolations,
  clickControl,
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

  it('clears simulated dashboard data after unlock while live data loads', async () => {
    let isEvaluator = false;
    let releaseLiveSummary: () => void = () => undefined;
    const liveSummaryGate = new Promise<void>((resolve) => {
      releaseLiveSummary = resolve;
    });
    const liveSummary = createMockCostAuditSummary({
      totalMonthlySpend: 99999,
      resources: [createMockResourceStatusCard({ resourceName: 'live-sandbox-rds' })],
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? 'GET';
        if (url.includes('/api/auth/unlock') && method === 'POST') {
          isEvaluator = true;
          return jsonResponse({ success: true, mode: 'LIVE' });
        }
        if (url.includes('/api/auth/unlock')) {
          return jsonResponse({ isEvaluator });
        }
        if (url.includes('/status')) {
          return jsonResponse(
            isEvaluator ? { mode: 'LIVE', profile: 'sandbox' } : { mode: 'SIMULATED' },
          );
        }
        if (url.includes('/summary')) {
          if (isEvaluator) {
            await liveSummaryGate;
            return jsonResponse(liveSummary);
          }
          return jsonResponse(MOCK_COST_AUDIT_SUMMARY);
        }
        throw new Error('offline');
      }),
    );

    await renderPresenter(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('$18,420.75')).toBeDefined();
    });
    expect(screen.getByText('prod-payments-aurora')).toBeDefined();

    await clickControl(screen.getByRole('button', { name: 'Find zombie storage' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Clear chat' })).toBeDefined();
    });

    await clickControl(screen.getByRole('button', { name: 'Unlock Live Sandbox' }));
    fireEvent.change(screen.getByLabelText('Passphrase'), {
      target: { value: 'cloudpulse-evaluator-2026' },
    });
    await clickControl(screen.getByRole('button', { name: 'Submit passphrase' }));

    await waitFor(() => {
      expect(screen.getByText('Live AWS Sandbox')).toBeDefined();
    });
    expect(screen.queryByText('$18,420.75')).toBeNull();
    expect(screen.queryByText('prod-payments-aurora')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Clear chat' })).toBeNull();
    expect(
      screen.getByText(
        'I can analyse your cloud waste and help you automatically remediate it. How can I help today?',
      ),
    ).toBeDefined();

    releaseLiveSummary();

    await waitFor(() => {
      expect(screen.getByText('$99,999.00')).toBeDefined();
    });
    expect(screen.getByText('live-sandbox-rds')).toBeDefined();
  });

  it('clears PulseAdvisor chat when returning to the simulated demo', async () => {
    let isEvaluator = true;
    const liveSummary = createMockCostAuditSummary({
      totalMonthlySpend: 99999,
      resources: [createMockResourceStatusCard({ resourceName: 'live-sandbox-rds' })],
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? 'GET';
        if (url.includes('/api/auth/unlock') && method === 'DELETE') {
          isEvaluator = false;
          return jsonResponse({ success: true, mode: 'SIMULATED' });
        }
        if (url.includes('/api/auth/unlock')) {
          return jsonResponse({ isEvaluator });
        }
        if (url.includes('/status')) {
          return jsonResponse(
            isEvaluator ? { mode: 'LIVE', profile: 'sandbox' } : { mode: 'SIMULATED' },
          );
        }
        if (url.includes('/summary')) {
          return jsonResponse(isEvaluator ? liveSummary : MOCK_COST_AUDIT_SUMMARY);
        }
        throw new Error('offline');
      }),
    );

    await renderPresenter(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Return to Demo' })).toBeDefined();
    });
    await waitFor(() => {
      expect(screen.getByText('live-sandbox-rds')).toBeDefined();
    });

    await clickControl(screen.getByRole('button', { name: 'Review RDS spend' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Clear chat' })).toBeDefined();
    });

    await clickControl(screen.getByRole('button', { name: 'Return to Demo' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Unlock Live Sandbox' })).toBeDefined();
    });
    expect(screen.queryByRole('button', { name: 'Clear chat' })).toBeNull();
    expect(
      screen.getByText(
        'I can analyse your cloud waste and help you automatically remediate it. How can I help today?',
      ),
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
      expect(screen.getByRole('heading', { name: 'Unable to load audit data' })).toBeDefined();
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
      expect(screen.getByRole('heading', { name: 'Unable to load audit data' })).toBeDefined();
    });
    await assertNoAxeViolations(container);
  });
});
