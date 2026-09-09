import {
  buildRemediationPrBody,
  draftPrRequestSchema,
  isGitFlowDemoMode,
  sanitizeBranchName,
  SIMULATED_DRAFT_PR,
} from './draft-pr';

const validPayload = {
  resourceId: 'vol-0123456789abcdefg',
  resourceName: 'cloudpulse-test-waste',
  actionType: 'TERMINATE',
  branchName: 'finops/terminate-vol-0123456789',
  commitMessage: 'fix(infra): tombstone unused EBS volume',
  hclDiff: '- resource "aws_ebs_volume" "cloudpulse_test_waste" {}',
  monthlySavingsUsd: 4.5,
};

describe('draftPrRequestSchema', () => {
  it('accepts a complete remediation payload', () => {
    expect(draftPrRequestSchema.parse(validPayload)).toEqual(validPayload);
  });

  it('rejects a missing resource id', () => {
    expect(() =>
      draftPrRequestSchema.parse({ ...validPayload, resourceId: '' }),
    ).toThrow();
  });
});

describe('isGitFlowDemoMode', () => {
  it('simulates when no GitHub token is configured', () => {
    expect(isGitFlowDemoMode({})).toBe(true);
  });

  it('simulates when DEMO_MODE is true even with a token', () => {
    expect(
      isGitFlowDemoMode({ GITHUB_TOKEN: 'token', DEMO_MODE: 'true' }),
    ).toBe(true);
  });

  it('runs live when a token is present and demo mode is off', () => {
    expect(isGitFlowDemoMode({ GITHUB_TOKEN: 'token' })).toBe(false);
  });
});

describe('buildRemediationPrBody', () => {
  it('includes savings and the terraform preview', () => {
    const body = buildRemediationPrBody(validPayload);

    expect(body).toContain('cloudpulse-test-waste');
    expect(body).toContain('+$4.50/mo');
    expect(body).toContain(validPayload.hclDiff);
  });
});

describe('sanitizeBranchName', () => {
  it('replaces unsupported git ref characters', () => {
    expect(sanitizeBranchName('finops/terminate vol*waste')).toBe(
      'finops/terminate-vol-waste',
    );
  });
});

describe('SIMULATED_DRAFT_PR', () => {
  it('returns the deterministic demo pull request', () => {
    expect(SIMULATED_DRAFT_PR).toEqual({
      success: true,
      simulated: true,
      prNumber: 104,
      prUrl: 'https://github.com/example/cloudpulse/pull/104',
    });
  });
});
