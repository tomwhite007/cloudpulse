import type { CostAuditSummaryDto, ResourceStatusCardDto } from '@cloudpulse/api-contracts';
import { MOCK_COST_AUDIT_SUMMARY } from '@cloudpulse/api-contracts/mocks';
import type { LanguageModelV4Prompt } from '@ai-sdk/provider';
import { describe, expect, it } from 'vitest';
import { ADVISOR_INSPECT_TOOL, ADVISOR_REMEDIATION_TOOL } from '../utils/pulse-advisor-tools';
import {
  MOCK_ADVISOR_FOLLOW_UP_TEXT,
  buildMockAdvisorStreamParts,
  createMockAdvisorLanguageModel,
  mockAdvisorPromptUserText,
  isMockAdvisorToolFollowUp,
  selectMockAdvisorReply,
} from '../mocks/pulse-advisor-model.mock';

const emptySummary: CostAuditSummaryDto = {
  totalMonthlySpend: 0,
  currency: 'USD',
  totalIdentifiedWaste: 0,
  activeAssetCount: 12,
  complianceScorePercent: 40,
  spendByService: [],
  resources: [],
};

const rdsOnlySummary: CostAuditSummaryDto = {
  ...MOCK_COST_AUDIT_SUMMARY,
  resources: [MOCK_COST_AUDIT_SUMMARY.resources[0]],
};

function userPrompt(text: string): LanguageModelV4Prompt {
  return [{ role: 'user', content: [{ type: 'text', text }] }];
}

function toolFollowUpPrompt(): LanguageModelV4Prompt {
  return [
    { role: 'user', content: [{ type: 'text', text: 'Find zombie storage' }] },
    {
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId: 'call_inspect',
          toolName: ADVISOR_INSPECT_TOOL,
          output: { type: 'json', value: MOCK_COST_AUDIT_SUMMARY },
        },
      ],
    },
  ];
}

describe('mockAdvisorPromptUserText', () => {
  it('returns the last user text part', () => {
    expect(
      mockAdvisorPromptUserText([
        { role: 'system', content: 'ignored' },
        { role: 'user', content: [{ type: 'text', text: 'first' }] },
        { role: 'user', content: [{ type: 'text', text: 'Find zombie storage' }] },
      ]),
    ).toBe('Find zombie storage');
  });

  it('returns an empty string when there is no user message', () => {
    expect(mockAdvisorPromptUserText([])).toBe('');
    expect(mockAdvisorPromptUserText([{ role: 'system', content: 'system only' }])).toBe('');
  });
});

describe('isMockAdvisorToolFollowUp', () => {
  it('is true only when the last prompt message is a tool result', () => {
    expect(isMockAdvisorToolFollowUp(userPrompt('Find zombie storage'))).toBe(false);
    expect(isMockAdvisorToolFollowUp(toolFollowUpPrompt())).toBe(true);
    expect(isMockAdvisorToolFollowUp([])).toBe(false);
  });
});

describe('selectMockAdvisorReply', () => {
  it('proposes terminating the zombie EBS volume', () => {
    const reply = selectMockAdvisorReply('Find zombie storage', MOCK_COST_AUDIT_SUMMARY);
    expect(reply.kind).toBe('propose');
    if (reply.kind !== 'propose') {
      return;
    }
    expect(reply.proposal.resourceId).toBe('res-ebs-analytics-scratch');
    expect(reply.proposal.actionType).toBe('TERMINATE');
    expect(reply.proposal.isSimulated).toBe(true);
  });

  it('reports when no zombie storage exists', () => {
    const reply = selectMockAdvisorReply('Find zombie storage', rdsOnlySummary);
    expect(reply).toEqual({
      kind: 'text',
      text: 'No zombie storage was detected in your infrastructure.',
    });
  });

  it('proposes a named resource PR and rejects unknown names', () => {
    const hit = selectMockAdvisorReply(
      'Request PR proposal for analytics-scratch-vol-08f2',
      MOCK_COST_AUDIT_SUMMARY,
    );
    expect(hit.kind).toBe('propose');
    if (hit.kind === 'propose') {
      expect(hit.proposal.resourceId).toBe('res-ebs-analytics-scratch');
    }

    expect(
      selectMockAdvisorReply('Request PR proposal for missing-volume', MOCK_COST_AUDIT_SUMMARY),
    ).toEqual({
      kind: 'text',
      text: "I couldn't find a resource named missing-volume.",
    });
  });

  it('explains waste findings using the largest savings', () => {
    const reply = selectMockAdvisorReply('Explain waste findings', MOCK_COST_AUDIT_SUMMARY);
    expect(reply.kind).toBe('propose');
    if (reply.kind === 'propose') {
      expect(reply.proposal.resourceId).toBe('res-rds-prod-payments');
    }
    expect(selectMockAdvisorReply('Explain waste findings', emptySummary)).toEqual({
      kind: 'text',
      text: 'You have no waste findings at the moment!',
    });
  });

  it('explains the compliance score and proposes the first finding when present', () => {
    const withFinding = selectMockAdvisorReply('Explain compliance score', MOCK_COST_AUDIT_SUMMARY);
    expect(withFinding.kind).toBe('propose');
    if (withFinding.kind === 'propose') {
      expect(withFinding.text).toContain('94%');
      expect(withFinding.proposal.resourceId).toBe('res-rds-prod-payments');
    }

    const withoutFinding = selectMockAdvisorReply('Explain compliance score', emptySummary);
    expect(withoutFinding).toEqual({
      kind: 'text',
      text: 'Your score is 40% because 0 of 12 monitored assets is flagged as non-compliant waste.',
    });
  });

  it('reviews RDS spend and generic cut prompts', () => {
    const rds = selectMockAdvisorReply('Review RDS spend', MOCK_COST_AUDIT_SUMMARY);
    expect(rds.kind).toBe('propose');
    if (rds.kind === 'propose') {
      expect(rds.proposal.resourceId).toBe('res-rds-prod-payments');
    }

    const cut = selectMockAdvisorReply('How can I cut $1k+?', MOCK_COST_AUDIT_SUMMARY);
    expect(cut.kind).toBe('propose');

    const ecsOnly: CostAuditSummaryDto = {
      ...MOCK_COST_AUDIT_SUMMARY,
      resources: [MOCK_COST_AUDIT_SUMMARY.resources[2]],
    };
    const ecs = selectMockAdvisorReply('Review RDS spend', ecsOnly);
    expect(ecs.kind).toBe('propose');
    if (ecs.kind === 'propose') {
      expect(ecs.proposal.resourceId).toBe('res-ecs-staging-batch');
    }

    expect(selectMockAdvisorReply('Review RDS spend', emptySummary)).toEqual({
      kind: 'text',
      text: "I couldn't find any significant waste to review right now.",
    });
  });

  it('inspects the waste summary for unknown prompts', () => {
    const reply = selectMockAdvisorReply('Tell me a joke', MOCK_COST_AUDIT_SUMMARY);
    expect(reply.kind).toBe('inspect');
  });
});

describe('buildMockAdvisorStreamParts', () => {
  it('emits LanguageModelV4 parts for a zombie proposal without compatibility aliases', () => {
    const parts = buildMockAdvisorStreamParts(
      userPrompt('Find zombie storage'),
      MOCK_COST_AUDIT_SUMMARY,
    );
    const types = parts.map((part) => part.type);
    expect(types).toEqual([
      'stream-start',
      'text-start',
      'text-delta',
      'text-end',
      'tool-input-start',
      'tool-input-delta',
      'tool-input-end',
      'tool-call',
      'finish',
    ]);

    const toolCall = parts.find((part) => part.type === 'tool-call');
    expect(toolCall?.type).toBe('tool-call');
    if (toolCall?.type !== 'tool-call') {
      return;
    }
    expect(toolCall.toolName).toBe(ADVISOR_REMEDIATION_TOOL);
    const input = JSON.parse(toolCall.input) as { resourceId: string };
    expect(input.resourceId).toBe('res-ebs-analytics-scratch');
    expect('args' in toolCall).toBe(false);

    const delta = parts.find((part) => part.type === 'text-delta');
    expect(delta?.type).toBe('text-delta');
    if (delta?.type === 'text-delta') {
      expect('textDelta' in delta).toBe(false);
      expect(delta.delta.length).toBeGreaterThan(0);
    }

    const finish = parts.find((part) => part.type === 'finish');
    expect(finish?.type).toBe('finish');
    if (finish?.type === 'finish') {
      expect(finish.finishReason.unified).toBe('tool-calls');
    }
  });

  it('emits inspectWasteSummary for unknown prompts', () => {
    const parts = buildMockAdvisorStreamParts(
      userPrompt('Tell me a joke'),
      MOCK_COST_AUDIT_SUMMARY,
    );
    const toolCall = parts.find((part) => part.type === 'tool-call');
    expect(toolCall?.type).toBe('tool-call');
    if (toolCall?.type === 'tool-call') {
      expect(toolCall.toolName).toBe(ADVISOR_INSPECT_TOOL);
      expect(toolCall.input).toBe('{}');
    }
  });

  it('finishes with stop when there is no tool call', () => {
    const parts = buildMockAdvisorStreamParts(userPrompt('Find zombie storage'), emptySummary);
    const finish = parts.find((part) => part.type === 'finish');
    expect(finish?.type).toBe('finish');
    if (finish?.type === 'finish') {
      expect(finish.finishReason.unified).toBe('stop');
    }
    expect(parts.some((part) => part.type === 'tool-call')).toBe(false);
  });

  it('emits follow-up text when the last prompt message is a tool result', () => {
    const parts = buildMockAdvisorStreamParts(toolFollowUpPrompt(), MOCK_COST_AUDIT_SUMMARY);
    const delta = parts.find((part) => part.type === 'text-delta');
    expect(delta?.type).toBe('text-delta');
    if (delta?.type === 'text-delta') {
      expect(delta.delta).toBe(MOCK_ADVISOR_FOLLOW_UP_TEXT);
    }
    const finish = parts.find((part) => part.type === 'finish');
    expect(finish?.type).toBe('finish');
    if (finish?.type === 'finish') {
      expect(finish.finishReason.unified).toBe('stop');
    }
  });
});

describe('createMockAdvisorLanguageModel', () => {
  it('produces a UI stream with proposeTerraformRemediation tool output', async () => {
    const { stepCountIs, streamText } = await import('ai');
    const { createAdvisorTools } = await import('../utils/pulse-advisor-tools');
    const result = streamText({
      model: createMockAdvisorLanguageModel(MOCK_COST_AUDIT_SUMMARY),
      stopWhen: stepCountIs(3),
      messages: [{ role: 'user', content: 'Find zombie storage' }],
      tools: createAdvisorTools(MOCK_COST_AUDIT_SUMMARY),
    });
    const text = await result.toUIMessageStreamResponse().text();
    expect(text).toContain('proposeTerraformRemediation');
    expect(text).toContain('res-ebs-analytics-scratch');
    expect(text).toContain(MOCK_ADVISOR_FOLLOW_UP_TEXT);
  });

  it('streams the same zombie proposal through MockLanguageModelV4', async () => {
    const model = createMockAdvisorLanguageModel(MOCK_COST_AUDIT_SUMMARY);
    expect(model.specificationVersion).toBe('v4');
    const result = await model.doStream({
      prompt: userPrompt('Find zombie storage'),
    });
    const parts = [];
    const reader = result.stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      parts.push(value);
    }
    const toolCall = parts.find((part) => part.type === 'tool-call');
    expect(toolCall?.type).toBe('tool-call');
    if (toolCall?.type === 'tool-call') {
      expect(toolCall.toolName).toBe(ADVISOR_REMEDIATION_TOOL);
    }
  });
});

describe('HEALTHY EBS fallback for zombie search', () => {
  it('treats an EBS finding as zombie storage even when status is not ZOMBIE', () => {
    const healthyEbs: ResourceStatusCardDto = {
      ...MOCK_COST_AUDIT_SUMMARY.resources[1],
      status: 'HEALTHY',
    };
    const reply = selectMockAdvisorReply('Find zombie storage', {
      ...MOCK_COST_AUDIT_SUMMARY,
      resources: [healthyEbs],
    });
    expect(reply.kind).toBe('propose');
    if (reply.kind === 'propose') {
      expect(reply.proposal.resourceId).toBe(healthyEbs.id);
    }
  });
});
