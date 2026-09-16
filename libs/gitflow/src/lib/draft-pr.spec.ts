import {
  buildRemediationPrBody,
  draftPrRequestSchema,
  isGitFlowDemoMode,
  remediationPrTitle,
  sanitizeBranchName,
  updateConsolidatedPrBody,
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

  it('preserves resource aliases used for Terraform identity matching', () => {
    const resourceAliases = ['eipalloc-0123456789abcdef0', '54.216.0.12', 'managed-eip'];
    expect(
      draftPrRequestSchema.parse({ ...validPayload, resourceAliases }).resourceAliases,
    ).toEqual(resourceAliases);
  });

  it('rejects a missing resource id', () => {
    expect(() => draftPrRequestSchema.parse({ ...validPayload, resourceId: '' })).toThrow();
  });
});

describe('remediationPrTitle', () => {
  it('uses only the first line of a multiline commit message', () => {
    expect(
      remediationPrTitle(
        'fix(infra): tombstone unused EBS volume\n\nRemove the zombie volume and its satellites.',
      ),
    ).toBe('fix(infra): tombstone unused EBS volume');
  });

  it('supports CRLF commit messages and trims the title', () => {
    expect(remediationPrTitle('  fix(infra): tombstone volume  \r\n\r\nDetails')).toBe(
      'fix(infra): tombstone volume',
    );
  });
});

describe('isGitFlowDemoMode', () => {
  it('simulates when no GitHub token is configured', () => {
    expect(isGitFlowDemoMode({ isEvaluator: true })).toBe(true);
  });

  it('simulates when DEMO_MODE is true even with a token', () => {
    expect(
      isGitFlowDemoMode({
        githubToken: 'token',
        demoMode: 'true',
        isEvaluator: true,
      }),
    ).toBe(true);
  });

  it('simulates when the evaluator session is missing, even with a token', () => {
    expect(
      isGitFlowDemoMode({
        githubToken: 'token',
        isEvaluator: false,
      }),
    ).toBe(true);
    expect(isGitFlowDemoMode({ githubToken: 'token' })).toBe(true);
  });

  it('runs live only when a token is present and the evaluator session is unlocked', () => {
    expect(
      isGitFlowDemoMode({
        githubToken: 'token',
        isEvaluator: true,
      }),
    ).toBe(false);
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
    expect(body).toContain('`aws_instance.web` (primary) — `i-0123456789abcdefg`');
    expect(body).toContain('`aws_eip_association.web_eip` (coupled satellite)');
  });

  it('documents cleanup action records pruned from the PR', () => {
    const body = buildRemediationPrBody({
      ...validPayload,
      prunedCleanupResourceIds: ['eipalloc-complete', 'vol-complete'],
    });

    expect(body).toContain('### Completed Cleanup Records Pruned');
    expect(body).toContain('- `eipalloc-complete`');
    expect(body).toContain('- `vol-complete`');
  });
});

describe('updateConsolidatedPrBody', () => {
  it('appends a second resource and updates total savings', () => {
    const initialBody = buildRemediationPrBody(validPayload);
    const secondPayload = {
      ...validPayload,
      resourceId: 'vol-99999999999999999',
      resourceName: 'cloudpulse-test-waste-2',
      monthlySavingsUsd: 3.5,
      hclDiff: '- resource "aws_ebs_volume" "cloudpulse_test_waste_2" {}',
      prunedCleanupResourceIds: ['eipalloc-complete'],
    };

    const updated = updateConsolidatedPrBody(initialBody, secondPayload);

    expect(updated).toContain('cloudpulse-test-waste-2');
    expect(updated).toContain('vol-99999999999999999');
    expect(updated).toContain('+$8.00/mo'); // 4.5 + 3.5 = 8.00
    expect(updated).toContain(secondPayload.hclDiff);
    expect(updated).toContain('### Completed Cleanup Records Pruned');
    expect(updated).toContain('- `eipalloc-complete`');
  });

  it('merges cleanup details without duplicating the section', () => {
    const initialBody = buildRemediationPrBody({
      ...validPayload,
      prunedCleanupResourceIds: ['eipalloc-first'],
    });
    const updated = updateConsolidatedPrBody(initialBody, {
      ...validPayload,
      resourceId: 'vol-99999999999999999',
      resourceName: 'cloudpulse-test-waste-2',
      prunedCleanupResourceIds: ['vol-second'],
    });

    expect(updated.match(/### Completed Cleanup Records Pruned/g)).toHaveLength(1);
    expect(updated).toContain('- `eipalloc-first`');
    expect(updated).toContain('- `vol-second`');
  });
});

describe('sanitizeBranchName', () => {
  it('replaces unsupported git ref characters', () => {
    expect(sanitizeBranchName('finops/terminate vol*waste')).toBe('finops/terminate-vol-waste');
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
