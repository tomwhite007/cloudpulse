import type { CostAuditSummaryDto, ResourceStatusCardDto } from '@cloudpulse/api-contracts';
import type {
  LanguageModelV4Prompt,
  LanguageModelV4StreamPart,
  LanguageModelV4Usage,
} from '@ai-sdk/provider';
import { simulateReadableStream } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import {
  ADVISOR_INSPECT_TOOL,
  ADVISOR_REMEDIATION_TOOL,
  createProposalFromFinding,
  type RemediationProposal,
} from './pulse-advisor-tools';

export const DEMO_TOOL_FOLLOW_UP_TEXT = 'Tool execution complete.';

const DEMO_USAGE: LanguageModelV4Usage = {
  inputTokens: {
    total: 10,
    noCache: undefined,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: {
    total: 20,
    text: undefined,
    reasoning: undefined,
  },
};

export type DemoReply =
  | { kind: 'text'; text: string }
  | { kind: 'inspect'; text: string }
  | { kind: 'propose'; text: string; proposal: RemediationProposal };

export function demoPromptUserText(prompt: LanguageModelV4Prompt): string {
  const lastUser = [...prompt].reverse().find((message) => message.role === 'user');
  if (!lastUser || lastUser.role !== 'user') {
    return '';
  }

  return lastUser.content
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

export function isDemoToolFollowUp(prompt: LanguageModelV4Prompt): boolean {
  const last = prompt[prompt.length - 1];
  return last?.role === 'tool';
}

function findZombie(findings: ResourceStatusCardDto[]): ResourceStatusCardDto | undefined {
  return findings.find(
    (finding) => finding.status === 'ZOMBIE' || finding.resourceType === 'EBS',
  );
}

export function selectDemoReply(
  lastMessageText: string,
  auditContext: CostAuditSummaryDto,
): DemoReply {
  const findings = auditContext.resources;
  const prMatch = lastMessageText.match(/Request PR proposal for (.+)/i);

  if (prMatch) {
    const resourceName = prMatch[1].trim();
    const finding = findings.find((row) => row.resourceName === resourceName);
    if (finding) {
      return {
        kind: 'propose',
        text: `Prepared remediation proposal for ${finding.resourceName}.`,
        proposal: createProposalFromFinding(finding),
      };
    }
    return {
      kind: 'text',
      text: `I couldn't find a resource named ${resourceName}.`,
    };
  }

  if (lastMessageText.includes('Find zombie storage')) {
    const finding = findZombie(findings);
    if (finding) {
      return {
        kind: 'propose',
        text: `I found an unattached ${finding.resourceType} volume \`${finding.resourceName}\` costing $${finding.potentialMonthlySavings}/mo. I can propose a PR to terminate it.`,
        proposal: createProposalFromFinding(finding),
      };
    }
    return {
      kind: 'text',
      text: 'No zombie storage was detected in your infrastructure.',
    };
  }

  if (lastMessageText.includes('Explain waste findings')) {
    const sorted = [...findings].sort(
      (a, b) => b.potentialMonthlySavings - a.potentialMonthlySavings,
    );
    const topFinding = sorted[0];
    if (topFinding) {
      return {
        kind: 'propose',
        text: `You have ${findings.length} findings. The largest contributor is \`${topFinding.resourceName}\` wasting $${topFinding.potentialMonthlySavings}/mo. I can propose a PR to fix it.`,
        proposal: createProposalFromFinding(topFinding),
      };
    }
    return {
      kind: 'text',
      text: 'You have no waste findings at the moment!',
    };
  }

  if (lastMessageText.includes('Explain compliance score')) {
    const wasteCount = findings.length;
    const text = `Your score is ${auditContext.complianceScorePercent}% because ${wasteCount} of ${auditContext.activeAssetCount} monitored assets is flagged as non-compliant waste.`;
    const finding = findings[0];
    if (finding) {
      return {
        kind: 'propose',
        text,
        proposal: createProposalFromFinding(finding),
      };
    }
    return { kind: 'text', text };
  }

  if (
    lastMessageText.includes('Review RDS spend') ||
    lastMessageText.includes('How can I cut')
  ) {
    const finding =
      findings.find((row) => row.resourceType === 'RDS') || findings[0];
    if (finding) {
      return {
        kind: 'propose',
        text: `I found an issue with \`${finding.resourceName}\` wasting $${finding.potentialMonthlySavings}/mo. Should I draft a PR?`,
        proposal: createProposalFromFinding(finding),
      };
    }
    return {
      kind: 'text',
      text: "I couldn't find any significant waste to review right now.",
    };
  }

  return {
    kind: 'inspect',
    text: "I'm currently in demo mode and don't have the capability to process this specific request.",
  };
}

function finishPart(
  reason: 'stop' | 'tool-calls',
): LanguageModelV4StreamPart {
  return {
    type: 'finish',
    finishReason: { unified: reason, raw: reason },
    usage: DEMO_USAGE,
  };
}

function textParts(id: string, text: string): LanguageModelV4StreamPart[] {
  if (!text) {
    return [];
  }

  return [
    { type: 'text-start', id },
    { type: 'text-delta', id, delta: text },
    { type: 'text-end', id },
  ];
}

function toolCallParts(
  id: string,
  toolName: string,
  input: object,
): LanguageModelV4StreamPart[] {
  const json = JSON.stringify(input);

  return [
    { type: 'tool-input-start', id, toolName },
    { type: 'tool-input-delta', id, delta: json },
    { type: 'tool-input-end', id },
    {
      type: 'tool-call',
      toolCallId: id,
      toolName,
      input: json,
    },
  ];
}

export function buildDemoStreamParts(
  prompt: LanguageModelV4Prompt,
  auditContext: CostAuditSummaryDto,
): LanguageModelV4StreamPart[] {
  const chunks: LanguageModelV4StreamPart[] = [
    { type: 'stream-start', warnings: [] },
  ];

  if (isDemoToolFollowUp(prompt)) {
    chunks.push(...textParts('text_followup', DEMO_TOOL_FOLLOW_UP_TEXT));
    chunks.push(finishPart('stop'));
    return chunks;
  }

  const reply = selectDemoReply(demoPromptUserText(prompt), auditContext);
  chunks.push(...textParts('text_demo', reply.text));

  if (reply.kind === 'propose') {
    chunks.push(
      ...toolCallParts(
        `call_${reply.proposal.resourceId}`,
        ADVISOR_REMEDIATION_TOOL,
        reply.proposal,
      ),
    );
    chunks.push(finishPart('tool-calls'));
    return chunks;
  }

  if (reply.kind === 'inspect') {
    chunks.push(...toolCallParts('call_inspect', ADVISOR_INSPECT_TOOL, {}));
    chunks.push(finishPart('tool-calls'));
    return chunks;
  }

  chunks.push(finishPart('stop'));
  return chunks;
}

export function createDemoLanguageModel(
  auditContext: CostAuditSummaryDto,
): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    provider: 'cloudpulse-mock',
    modelId: 'mock-model',
    doStream: async ({ prompt }) => ({
      stream: simulateReadableStream({
        chunks: buildDemoStreamParts(prompt, auditContext),
        initialDelayInMs: null,
        chunkDelayInMs: null,
      }),
    }),
  });
}
