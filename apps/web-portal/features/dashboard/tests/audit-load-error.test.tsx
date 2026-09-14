import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuditLoadError } from '../components/audit-load-error';
import {
  assertNoAxeViolations,
  clickControl,
  renderPresenter,
  usePresenterTestLifecycle,
} from './presenter-harness';

usePresenterTestLifecycle();

describe('AuditLoadError', () => {
  it('shows the request error and retries when asked', async () => {
    const onRetry = vi.fn();
    await renderPresenter(
      <AuditLoadError error={new Error('Request failed with status 503')} onRetry={onRetry} />,
    );

    expect(screen.getByRole('heading', { name: 'Unable to load live audit data' })).toBeDefined();
    expect(screen.getByRole('alert')).toHaveProperty(
      'textContent',
      'Request failed with status 503',
    );

    await clickControl(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('falls back to a generic message when the error is not an Error', async () => {
    await renderPresenter(<AuditLoadError error={{ status: 500 }} onRetry={() => undefined} />);

    expect(screen.getByRole('alert')).toHaveProperty(
      'textContent',
      'The auditor API request failed.',
    );
  });

  it('has no WCAG 2.1 AA axe violations', async () => {
    const { container } = await renderPresenter(
      <AuditLoadError
        error={new Error('Request failed with status 503')}
        onRetry={() => undefined}
      />,
    );
    await assertNoAxeViolations(container);
  });
});
