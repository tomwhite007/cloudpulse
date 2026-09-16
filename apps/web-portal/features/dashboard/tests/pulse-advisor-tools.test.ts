import type { CostAuditSummaryDto } from '@cloudpulse/api-contracts';
import { MOCK_COST_AUDIT_SUMMARY } from '@cloudpulse/api-contracts/mocks';
import { APICallError } from 'ai';
import type { ToolExecutionOptions, UIMessage } from 'ai';
import { describe, expect, it, vi } from 'vitest';
import {
  alignProposalWithGitFlow,
  buildAdvisorSystemPrompt,
  createAdvisorTools,
  createProposalFromFinding,
  formatAuditContextMarkdown,
  isAnthropicFallbackError,
  isPulseAdvisorDemoMode,
  parseAuditContext,
  toAdvisorModelMessages,
  toFallbackModelMessages,
  type RemediationProposal,
} from '../utils/pulse-advisor-tools';

const emptySummary: CostAuditSummaryDto = {
  totalMonthlySpend: 0,
  currency: 'USD',
  totalIdentifiedWaste: 0,
  activeAssetCount: 12,
  complianceScorePercent: 40,
  spendByService: [],
  resources: [],
};

function userMessage(text: string): UIMessage {
  return {
    id: 'user-1',
    role: 'user',
    parts: [{ type: 'text', text }],
  };
}

describe('parseAuditContext', () => {
  it('returns a valid audit summary unchanged', () => {
    expect(parseAuditContext(MOCK_COST_AUDIT_SUMMARY)).toEqual(MOCK_COST_AUDIT_SUMMARY);
  });

  it('falls back to the mock summary when the payload is invalid', () => {
    expect(parseAuditContext(undefined)).toEqual(MOCK_COST_AUDIT_SUMMARY);
    expect(parseAuditContext({ resources: [] })).toEqual(MOCK_COST_AUDIT_SUMMARY);
  });
});

describe('formatAuditContextMarkdown', () => {
  it('lists real resource IDs from the audit findings', () => {
    const markdown = formatAuditContextMarkdown(MOCK_COST_AUDIT_SUMMARY);
    expect(markdown).toContain('`res-ebs-analytics-scratch`');
    expect(markdown).toContain('analytics-scratch-vol-08f2');
    expect(markdown).toContain('$18420.75 USD');
  });

  it('renders an empty findings list', () => {
    expect(formatAuditContextMarkdown(emptySummary)).toContain('- None');
  });
});

describe('buildAdvisorSystemPrompt', () => {
  it('requires the live remediation tool name', () => {
    const prompt = buildAdvisorSystemPrompt(MOCK_COST_AUDIT_SUMMARY);
    expect(prompt).toContain('proposeTerraformRemediation');
    expect(prompt).toContain('PulseAdvisor');
    expect(prompt).toContain('res-ebs-analytics-scratch');
    expect(prompt).toContain('one remediation card per target resource');
    expect(prompt).toContain('same open finops/ PR');
    expect(prompt).toContain('not promises of separate pull requests');
    expect(prompt).toContain('fresh live audit snapshot');
  });
});

describe('createProposalFromFinding', () => {
  it('builds a simulated proposal from a zombie EBS finding', () => {
    const finding = MOCK_COST_AUDIT_SUMMARY.resources[1];
    const proposal = createProposalFromFinding(finding);
    expect(proposal.resourceId).toBe('res-ebs-analytics-scratch');
    expect(proposal.actionType).toBe('TERMINATE');
    expect(proposal.monthlySavingsUsd).toBe(950);
    expect(proposal.isSimulated).toBe(true);
    expect(proposal.safetyChecks[0]).toContain('ZOMBIE');
    expect(proposal.hclDiff.length).toBeGreaterThan(0);
    expect(proposal.branchName).toContain('finops/');
  });
});

describe('alignProposalWithGitFlow', () => {
  it('tombstones resource headers parsed from an HCL preview', () => {
    const aligned = alignProposalWithGitFlow({
      resourceId: 'res-ebs-analytics-scratch',
      resourceName: 'analytics-scratch-vol-08f2',
      actionType: 'TERMINATE',
      branchName: 'terminate-vol-scratch',
      hclDiff: 'resource "aws_ebs_volume" "analytics_scratch" {}',
    });

    expect(aligned.branchName).toContain('finops/');
    expect(aligned.hclDiff).toContain('aws_ebs_volume');
  });

  it('falls back to the resource name when the preview has no headers', () => {
    const aligned = alignProposalWithGitFlow({
      resourceId: 'res-ebs-analytics-scratch',
      resourceName: 'analytics-scratch-vol-08f2',
      actionType: 'TERMINATE',
      branchName: 'terminate-vol-scratch',
    });

    expect(aligned.branchName).toContain('finops/');
    expect(aligned.hclDiff.length).toBeGreaterThan(0);
  });
});

const toolCallOptions: ToolExecutionOptions<Record<string, unknown>> = {
  toolCallId: 'call-test',
  messages: [],
  abortSignal: new AbortController().signal,
  context: {},
};

function isAsyncIterable<T>(value: T | AsyncIterable<T>): value is AsyncIterable<T> {
  return typeof value === 'object' && value !== null && Symbol.asyncIterator in value;
}

function unwrapToolResult<T>(value: T | AsyncIterable<T>): T {
  if (isAsyncIterable(value)) {
    throw new Error('Expected a non-streaming tool result');
  }
  return value;
}

async function executeInspect(audit: CostAuditSummaryDto): Promise<CostAuditSummaryDto> {
  const execute = createAdvisorTools(audit).inspectWasteSummary.execute;
  if (typeof execute !== 'function') {
    throw new Error('inspectWasteSummary.execute is required');
  }
  return unwrapToolResult(await execute({}, toolCallOptions));
}

async function executePropose(
  audit: CostAuditSummaryDto,
  proposal: RemediationProposal,
): Promise<RemediationProposal> {
  const execute = createAdvisorTools(audit).proposeTerraformRemediation.execute;
  if (typeof execute !== 'function') {
    throw new Error('proposeTerraformRemediation.execute is required');
  }
  return unwrapToolResult(await execute(proposal, toolCallOptions));
}

describe('createAdvisorTools', () => {
  it('returns the current audit summary from inspectWasteSummary', async () => {
    await expect(executeInspect(MOCK_COST_AUDIT_SUMMARY)).resolves.toEqual(MOCK_COST_AUDIT_SUMMARY);
  });

  it('aligns proposeTerraformRemediation output and defaults isSimulated', async () => {
    const proposal = createProposalFromFinding(MOCK_COST_AUDIT_SUMMARY.resources[1]);
    const { isSimulated, ...params } = proposal;
    expect(isSimulated).toBe(true);
    const output = await executePropose(MOCK_COST_AUDIT_SUMMARY, params);
    expect(output.resourceId).toBe(proposal.resourceId);
    expect(output.isSimulated).toBe(false);
    expect(output.branchName).toContain('finops/');
  });

  it('grounds an Elastic IP proposal with authoritative audit identities', async () => {
    const finding = {
      ...MOCK_COST_AUDIT_SUMMARY.resources[3],
      id: 'eipalloc-0123e2e86d4cbbbe0',
      resourceName: 'cloudpulse-zombie-eip-2026-09-16-tf',
      resourceAliases: [
        'eipalloc-0123e2e86d4cbbbe0',
        '34.251.238.255',
        'cloudpulse-zombie-eip-2026-09-16-tf',
      ],
    };
    const audit = { ...MOCK_COST_AUDIT_SUMMARY, resources: [finding] };
    const proposal = {
      ...createProposalFromFinding(finding),
      resourceName: '34.251.238.255',
      resourceAliases: undefined,
    };

    const output = await executePropose(audit, proposal);

    expect(output.resourceName).toBe('cloudpulse-zombie-eip-2026-09-16-tf');
    expect(output.resourceAliases).toEqual(finding.resourceAliases);
    expect(output.hclDiff).toContain('resource "aws_eip" "cloudpulse_zombie_eip_2026_09_16_tf"');
  });

  it('preserves an explicit isSimulated flag', async () => {
    const proposal = createProposalFromFinding(MOCK_COST_AUDIT_SUMMARY.resources[1]);
    const output = await executePropose(MOCK_COST_AUDIT_SUMMARY, proposal);
    expect(output.isSimulated).toBe(true);
  });
});

describe('toFallbackModelMessages', () => {
  it('keeps user text and drops empty assistant or system messages', () => {
    const converted = toFallbackModelMessages([
      { id: 'sys', role: 'system', parts: [{ type: 'text', text: 'ignored' }] },
      userMessage('Find zombie storage'),
      { id: 'a1', role: 'assistant', parts: [{ type: 'text', text: '' }] },
      { id: 'a2', role: 'assistant', parts: [{ type: 'text', text: 'hello' }] },
    ]);

    expect(converted).toEqual([
      { role: 'user', content: 'Find zombie storage' },
      { role: 'assistant', content: 'hello' },
    ]);
  });
});

describe('toAdvisorModelMessages', () => {
  it('converts UI messages with parts', async () => {
    const converted = await toAdvisorModelMessages([userMessage('Find zombie storage')]);
    expect(converted.length).toBeGreaterThan(0);
    expect(converted[0]?.role).toBe('user');
  });

  it('uses the text fallback when conversion throws', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const converted = await toAdvisorModelMessages(
      [userMessage('Find zombie storage')],
      async () => {
        throw new Error('cannot convert');
      },
    );
    expect(converted).toEqual([{ role: 'user', content: 'Find zombie storage' }]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('isPulseAdvisorDemoMode', () => {
  it('uses the deterministic mock when the evaluator session is missing', () => {
    expect(isPulseAdvisorDemoMode({})).toBe(true);
    expect(isPulseAdvisorDemoMode({ isEvaluator: false })).toBe(true);
  });

  it('uses Anthropic when the in-app Live Sandbox session is unlocked', () => {
    expect(isPulseAdvisorDemoMode({ isEvaluator: true })).toBe(false);
  });
});

describe('isAnthropicFallbackError', () => {
  it('detects APICallError status codes', () => {
    for (const statusCode of [401, 403, 402, 429, 404]) {
      expect(
        isAnthropicFallbackError(
          new APICallError({
            message: 'denied',
            url: 'https://api.anthropic.com',
            requestBodyValues: {},
            statusCode,
          }),
        ),
      ).toBe(true);
    }
  });

  it('detects statusCode and status on plain objects', () => {
    expect(isAnthropicFallbackError({ statusCode: 401 })).toBe(true);
    expect(isAnthropicFallbackError({ status: 429 })).toBe(true);
  });

  it('detects auth, quota, and not_found messages', () => {
    expect(isAnthropicFallbackError(new Error('Unauthorized'))).toBe(true);
    expect(isAnthropicFallbackError('invalid api key')).toBe(true);
    expect(isAnthropicFallbackError('invalid x-api-key')).toBe(true);
    expect(isAnthropicFallbackError('authentication failed')).toBe(true);
    expect(isAnthropicFallbackError('rate limit exceeded')).toBe(true);
    expect(isAnthropicFallbackError('rate-limit')).toBe(true);
    expect(isAnthropicFallbackError('too many requests')).toBe(true);
    expect(isAnthropicFallbackError('insufficient_quota')).toBe(true);
    expect(isAnthropicFallbackError('credit balance too low')).toBe(true);
    expect(isAnthropicFallbackError('quota exceeded')).toBe(true);
    expect(isAnthropicFallbackError('not_found')).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(
      isAnthropicFallbackError(
        new APICallError({
          message: 'server exploded',
          url: 'https://api.anthropic.com',
          requestBodyValues: {},
          statusCode: 500,
        }),
      ),
    ).toBe(false);
    expect(isAnthropicFallbackError({ statusCode: 500 })).toBe(false);
    expect(isAnthropicFallbackError(null)).toBe(false);
    expect(isAnthropicFallbackError({ reason: 'nope' })).toBe(false);
  });
});
