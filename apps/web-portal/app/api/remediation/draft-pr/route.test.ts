import { MOCK_COST_AUDIT_SUMMARY } from '@cloudpulse/api-contracts/mocks';
import { MOCK_DRAFT_PR } from '@cloudpulse/gitflow/mocks';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCloudPulseSession = vi.hoisted(() => vi.fn());
const createGitHubRemediationPr = vi.hoisted(() => vi.fn());

vi.mock('@/lib/session', async () => {
  const actual = await vi.importActual<typeof import('@/lib/session')>('@/lib/session');
  return {
    ...actual,
    getCloudPulseSession,
  };
});

vi.mock('@cloudpulse/gitflow', async () => {
  const actual = await vi.importActual<typeof import('@cloudpulse/gitflow')>('@cloudpulse/gitflow');
  return {
    ...actual,
    createGitHubRemediationPr,
  };
});

const validPayload = {
  resourceId: 'vol-0123456789abcdefg',
  resourceName: 'cloudpulse-test-waste',
  actionType: 'TERMINATE',
  branchName: 'finops/terminate-vol-0123456789',
  commitMessage: 'fix(infra): tombstone unused EBS volume',
  hclDiff: '- resource "aws_ebs_volume" "cloudpulse_test_waste" {}',
  monthlySavingsUsd: 4.5,
};

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/remediation/draft-pr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/remediation/draft-pr', () => {
  beforeEach(() => {
    getCloudPulseSession.mockReset();
    createGitHubRemediationPr.mockReset();
    vi.unstubAllEnvs();
  });

  it('returns the canned mock PR and does not call GitHub without an evaluator session', async () => {
    vi.stubEnv('GITHUB_TOKEN', 'token');
    getCloudPulseSession.mockResolvedValue({});

    const { postDraftPr } = await import('./route');
    const fetchImpl = vi.fn();
    const response = await postDraftPr(jsonRequest(validPayload), { fetchImpl });
    const payload = await response.json();

    expect(payload).toEqual(MOCK_DRAFT_PR);
    expect(createGitHubRemediationPr).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('creates a live GitHub PR only when the evaluator session is unlocked and a token is present', async () => {
    vi.stubEnv('GITHUB_TOKEN', 'token');
    vi.stubEnv('DEMO_MODE', 'false');
    getCloudPulseSession.mockResolvedValue({ isEvaluator: true });
    createGitHubRemediationPr.mockResolvedValue({
      success: true,
      simulated: false,
      prNumber: 88,
      prUrl: 'https://github.com/tomwhite007/cloudpulse/pull/88',
    });

    const fetchImpl = vi.fn(() =>
      Promise.resolve(Response.json(MOCK_COST_AUDIT_SUMMARY)),
    ) as unknown as typeof fetch;
    const { postDraftPr } = await import('./route');
    const response = await postDraftPr(jsonRequest(validPayload), { fetchImpl });
    const payload = await response.json();

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('/api/audit/summary'),
      expect.objectContaining({
        headers: { 'x-cloudpulse-mode': 'live' },
        cache: 'no-store',
      }),
    );
    expect(createGitHubRemediationPr).toHaveBeenCalledWith({
      ...validPayload,
      activeResourceIds: MOCK_COST_AUDIT_SUMMARY.resources.map((resource) => resource.id),
    });
    expect(payload).toEqual({
      success: true,
      simulated: false,
      prNumber: 88,
      prUrl: 'https://github.com/tomwhite007/cloudpulse/pull/88',
    });
  });

  it('creates the PR without pruning when the fresh audit request fails', async () => {
    vi.stubEnv('GITHUB_TOKEN', 'token');
    vi.stubEnv('DEMO_MODE', 'false');
    getCloudPulseSession.mockResolvedValue({ isEvaluator: true });
    createGitHubRemediationPr.mockResolvedValue({
      success: true,
      simulated: false,
      prNumber: 89,
      prUrl: 'https://github.com/tomwhite007/cloudpulse/pull/89',
    });
    const fetchImpl = vi.fn(() =>
      Promise.resolve(new Response(null, { status: 503 })),
    ) as unknown as typeof fetch;

    const { postDraftPr } = await import('./route');
    const response = await postDraftPr(jsonRequest(validPayload), { fetchImpl });

    expect(response.status).toBe(200);
    expect(createGitHubRemediationPr).toHaveBeenCalledWith({
      ...validPayload,
      activeResourceIds: undefined,
    });
  });

  it('rejects an invalid fresh audit payload', async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(Response.json({ resources: [] })),
    ) as unknown as typeof fetch;
    const { fetchActiveResourceIds } = await import('./route');

    await expect(fetchActiveResourceIds(fetchImpl)).rejects.toBeDefined();
  });
});
