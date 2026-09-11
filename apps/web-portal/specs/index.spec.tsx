import { Dashboard } from '@/features/dashboard';
import { screen } from '@testing-library/react';
import {
  assertNoAxeViolations,
  renderPresenter,
  usePresenterTestLifecycle,
} from '../features/dashboard/tests/presenter-harness';

usePresenterTestLifecycle();

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

  it('has no WCAG 2.1 AA axe violations', async () => {
    const { container } = await renderPresenter(<Dashboard />);
    await assertNoAxeViolations(container);
  });
});
