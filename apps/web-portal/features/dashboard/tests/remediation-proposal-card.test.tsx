import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RemediationProposalCard } from '@/components/pulse-advisor/remediation-proposal-card';
import { useDashboardStore } from '../store/dashboard-store';
import {
  clickControl,
  renderPresenter,
  usePresenterTestLifecycle,
} from './presenter-harness';

usePresenterTestLifecycle();

const proposal = {
  resourceId: 'vol-0123456789abcdefg',
  resourceName: 'cloudpulse-test-waste',
  estimatedMonthlySavingsUsd: 4.5,
  monthlySavingsUsd: 4.5,
  hclDiff: '- resource "aws_ebs_volume" "cloudpulse_test_waste" {}',
  actionLabel: 'Terminate volume',
  actionType: 'TERMINATE',
  branchName: 'finops/terminate-vol-0123456789',
  commitMessage: 'fix(infra): tombstone unused EBS volume',
  safetyChecks: ['Pre-flight snapshot confirmed'],
};

describe('RemediationProposalCard', () => {
  it('drafts a pull request and links to the returned URL', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          simulated: false,
          prNumber: 88,
          prUrl: 'https://github.com/tomwhite007/cloudpulse/pull/88',
        }),
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await renderPresenter(<RemediationProposalCard {...proposal} />);
    await clickControl(screen.getByRole('button', { name: 'Draft Pull Request' }));

    const link = await screen.findByRole('link', { name: /Open PR #88/ });
    expect(link.getAttribute('href')).toBe(
      'https://github.com/tomwhite007/cloudpulse/pull/88',
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/remediation/draft-pr',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(useDashboardStore.getState().queuedRemediationPrs[proposal.resourceId]).toEqual({
      prNumber: 88,
      prUrl: 'https://github.com/tomwhite007/cloudpulse/pull/88',
    });
  });

  it('shows a loading label while the draft request is in flight', async () => {
    let resolveFetch: ((value: unknown) => void) | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );

    await renderPresenter(<RemediationProposalCard {...proposal} />);
    await clickControl(screen.getByRole('button', { name: 'Draft Pull Request' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Creating branch & PR/ })).toBeDefined();
    });

    resolveFetch?.({
      ok: true,
      json: async () => ({
        success: true,
        simulated: true,
        prNumber: 104,
        prUrl: 'https://github.com/example/cloudpulse/pull/104',
      }),
    });

    expect(await screen.findByRole('link', { name: /Open PR #104/ })).toBeDefined();
  });
});
