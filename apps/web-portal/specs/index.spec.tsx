import { Dashboard } from '@/features/dashboard';
import { screen } from '@testing-library/react';
import {
  renderPresenter,
  usePresenterTestLifecycle,
} from '../features/dashboard/tests/presenter-harness';

usePresenterTestLifecycle();

describe('Dashboard', () => {
  it('renders the FinOps screen landmarks', async () => {
    await renderPresenter(<Dashboard />);

    expect(screen.getByRole('heading', { level: 1, name: 'CloudPulse' })).toBeDefined();
    expect(screen.getByRole('region', { name: 'FinOps KPI metrics' })).toBeDefined();
    expect(screen.getByRole('region', { name: 'Audited resource feed' })).toBeDefined();
    expect(
      screen.getByRole('complementary', {
        name: 'PulseAdvisor AI Assistant',
      }),
    ).toBeDefined();
  });
});
