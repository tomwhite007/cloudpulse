import { MOCK_AUDIT_RESOURCES } from '@cloudpulse/api-contracts/mocks';
import { act, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PulseAdvisor } from '@/components/pulse-advisor/pulse-advisor';
import { useDashboardStore } from '../store/dashboard-store';
import {
  assertNoAxeViolations,
  clickControl,
  renderPresenter,
  usePresenterTestLifecycle,
} from './presenter-harness';

usePresenterTestLifecycle();

describe('PulseAdvisor', () => {
  it('labels the chat input and send control', async () => {
    await renderPresenter(<PulseAdvisor />);

    expect(
      screen.getByRole('textbox', { name: 'Ask PulseAdvisor about infrastructure waste' }),
    ).toBeDefined();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDefined();
  });

  it('scrolls the advisor landmark into view when a resource CTA triggers a prompt', async () => {
    await renderPresenter(<PulseAdvisor />);
    const panel = screen.getByRole('complementary', { name: 'PulseAdvisor AI Assistant' });

    await act(async () => {
      useDashboardStore
        .getState()
        .triggerAdvisorPrompt(
          `Request PR proposal for ${MOCK_AUDIT_RESOURCES[0].resourceName}`,
          MOCK_AUDIT_RESOURCES[0],
        );
    });

    await waitFor(() => {
      expect(panel.scrollIntoView).toHaveBeenCalled();
    });
    expect(document.activeElement).toBe(panel);
  });

  it('has no WCAG 2.1 AA axe violations when empty', async () => {
    const { container } = await renderPresenter(<PulseAdvisor />);
    await assertNoAxeViolations(container);
  });

  it('has no WCAG 2.1 AA axe violations after a prompt pill is used', async () => {
    const { container } = await renderPresenter(<PulseAdvisor />);
    await clickControl(screen.getByRole('button', { name: 'Find zombie storage' }));
    await assertNoAxeViolations(container);
  });
});
