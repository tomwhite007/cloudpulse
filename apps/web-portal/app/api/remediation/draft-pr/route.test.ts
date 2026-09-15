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

    const { POST } = await import('./route');
    const response = await POST(jsonRequest(validPayload));
    const payload = await response.json();

    expect(payload).toEqual(MOCK_DRAFT_PR);
    expect(createGitHubRemediationPr).not.toHaveBeenCalled();
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

    const { POST } = await import('./route');
    const response = await POST(jsonRequest(validPayload));
    const payload = await response.json();

    expect(createGitHubRemediationPr).toHaveBeenCalledWith(validPayload);
    expect(payload).toEqual({
      success: true,
      simulated: false,
      prNumber: 88,
      prUrl: 'https://github.com/tomwhite007/cloudpulse/pull/88',
    });
  });
});
