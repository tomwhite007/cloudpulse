import {
  buildRemediationPrBody,
  draftPrRequestSchema,
  isGitFlowDemoMode,
  sanitizeBranchName,
} from './draft-pr';
import { MOCK_DRAFT_PR } from '../mocks/draft-pr.mock';

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
    expect(body).toContain('### Remediated Resources');
    expect(body).toContain('`aws_ebs_volume.cloudpulse_test_waste` (primary)');
  });

  it('lists every resource from a composite HCL diff', () => {
    const body = buildRemediationPrBody({
      ...validPayload,
      resourceName: 'web',
      resourceId: 'i-0123456789abcdefg',
      hclDiff: [
        '- resource "aws_instance" "web" {',
        '-   ...',
        '- }',
        '- resource "aws_eip_association" "web_eip" {',
        '-   ...',
        '- }',
      ].join('\n'),
    });

    expect(body).toContain('### Remediated Resources');
    expect(body).toContain(
      '`aws_instance.web` (primary) — `i-0123456789abcdefg`',
    );
    expect(body).toContain('`aws_eip_association.web_eip` (coupled satellite)');
  });
});

describe('sanitizeBranchName', () => {
  it('replaces unsupported git ref characters', () => {
    expect(sanitizeBranchName('finops/terminate vol*waste')).toBe(
      'finops/terminate-vol-waste',
    );
  });
});

describe('MOCK_DRAFT_PR', () => {
  it('returns the deterministic demo pull request', () => {
    expect(MOCK_DRAFT_PR).toEqual({
      success: true,
      simulated: true,
      prNumber: 104,
      prUrl: 'https://github.com/example/cloudpulse/pull/104',
    });
  });
});
