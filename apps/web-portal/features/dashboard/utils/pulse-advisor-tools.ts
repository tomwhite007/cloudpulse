import {
  CostAuditSummarySchema,
  type CostAuditSummaryDto,
  type ResourceStatusCardDto,
} from '@cloudpulse/api-contracts';
import { MOCK_COST_AUDIT_SUMMARY } from '@cloudpulse/api-contracts/mocks';
import {
  generateTombstoneDiffPreview,
  gitFlowEnvFromProcess,
  parseResourceHeadersFromHcl,
  resolveGitFlowBranchName,
  resolveTerraformPath,
  slugResourceName,
} from '@cloudpulse/gitflow';
import { APICallError, convertToModelMessages, tool } from 'ai';
import type { InferUITools, ModelMessage, UIDataTypes, UIMessage } from 'ai';
import { z } from 'zod';
import { advisorMessageMarkdown } from './advisor-markdown';

export const ADVISOR_INSPECT_TOOL = 'inspectWasteSummary';
export const ADVISOR_REMEDIATION_TOOL = 'proposeTerraformRemediation';

export const remediationProposalSchema = z.object({
  resourceId: z.string().describe('Real cloud resource ID from the audit findings'),
  resourceName: z.string().describe('Human-readable resource name'),
  actionType: z
    .enum(['RESIZE', 'TERMINATE', 'SCHEDULE_SLEEP'])
    .describe('Remediation action to apply'),
  monthlySavingsUsd: z.number().describe('Estimated monthly savings in USD'),
  branchName: z.string().describe('Git branch name for the remediation PR'),
  commitMessage: z
    .string()
    .describe(
      'Commit message / PR description. Name the primary resource being decommissioned and, when coupled satellites are tombstoned, explain that linked resources (for example an Elastic IP or volume attachment) were also removed to prevent idle provider charges or broken Terraform references.',
    ),
  hclDiff: z
    .string()
    .describe(
      'Terraform HCL patch preview covering the primary waste resource and any coupled satellite blocks (aws_eip_association, associated aws_eip, aws_volume_attachment) identified in the same file.',
    ),
  safetyChecks: z
    .array(z.string())
    .describe('Safety checks the operator should verify before apply'),
  isSimulated: z.boolean().optional().describe('Whether this proposal is a simulated/demo card'),
});

export type RemediationProposal = z.infer<typeof remediationProposalSchema>;

export function parseAuditContext(auditContext: unknown): CostAuditSummaryDto {
  const parsed = CostAuditSummarySchema.safeParse(auditContext);
  return parsed.success ? parsed.data : MOCK_COST_AUDIT_SUMMARY;
}

export function alignProposalWithGitFlow(
  proposal: Pick<
    RemediationProposal,
    'branchName' | 'actionType' | 'resourceId' | 'resourceName'
  > & { hclDiff?: string },
): Pick<RemediationProposal, 'branchName' | 'hclDiff'> {
  const env = gitFlowEnvFromProcess();
  const fromDiff = proposal.hclDiff ? parseResourceHeadersFromHcl(proposal.hclDiff) : [];
  const previewTargets =
    fromDiff.length > 0
      ? fromDiff.map((block) => ({
          resourceName: block.name,
          resourceType: block.type,
        }))
      : proposal.resourceName;

  return {
    branchName: resolveGitFlowBranchName(proposal, env),
    hclDiff: generateTombstoneDiffPreview(previewTargets, resolveTerraformPath(env)),
  };
}

export function createProposalFromFinding(finding: ResourceStatusCardDto): RemediationProposal {
  const gitFlow = alignProposalWithGitFlow({
    resourceId: finding.id,
    resourceName: finding.resourceName,
    actionType: finding.recommendedAction.actionType,
    branchName: `${finding.recommendedAction.actionType.toLowerCase()}-vol-${slugResourceName(finding.resourceName)}`,
  });

  return {
    resourceId: finding.id,
    resourceName: finding.resourceName,
    actionType: finding.recommendedAction.actionType,
    monthlySavingsUsd: finding.potentialMonthlySavings,
    branchName: gitFlow.branchName,
    commitMessage: `fix(infra): remediate ${finding.resourceType.toLowerCase()} ${finding.resourceName}`,
    hclDiff: gitFlow.hclDiff,
    safetyChecks: [
      `Finding classification: ${finding.status} (HIGH)`,
      finding.telemetrySummary,
      'Final snapshot verification required prior to apply',
    ],
    isSimulated: true,
  };
}

export function formatAuditContextMarkdown(auditContext: CostAuditSummaryDto): string {
  const findings = auditContext.resources;
  const metrics = [
    `- Total monthly spend: $${auditContext.totalMonthlySpend} ${auditContext.currency}`,
    `- Identified waste: $${auditContext.totalIdentifiedWaste}`,
    `- Active assets: ${auditContext.activeAssetCount}`,
    `- Compliance score: ${auditContext.complianceScorePercent}%`,
  ].join('\n');

  const findingLines =
    findings
      .map((finding) => {
        return `- \`${finding.id}\` ${finding.resourceName} (${finding.resourceType}, ${finding.status}): $${finding.potentialMonthlySavings}/mo — recommended ${finding.recommendedAction.actionType}`;
      })
      .join('\n') || '- None';

  return [
    '## Audit metrics',
    metrics,
    '',
    '## Findings (use these real resource IDs)',
    findingLines,
    '',
    '## Full auditContext JSON',
    '```json',
    JSON.stringify(auditContext, null, 2),
    '```',
  ].join('\n');
}

export function buildAdvisorSystemPrompt(auditContext: CostAuditSummaryDto): string {
  const terraformPath = resolveTerraformPath(gitFlowEnvFromProcess());

  return [
    'You are an Elite Enterprise FinOps Copilot (PulseAdvisor).',
    'Help the operator analyze cloud waste and propose safe Terraform remediations.',
    'Always reference real resource IDs from the audit findings below.',
    'Whenever you suggest an infrastructure change, you MUST execute the proposeTerraformRemediation tool so the UI can render a proposal card.',
    'Do not invent resources that are not present in the audit context.',
    `Infrastructure files live at \`${terraformPath}\` (operator-configured GitFlow Terraform path; default is \`apps/infra/environments/sandbox/storage.tf\`). Align conversational explanations and HCL previews with that file. Remediation PRs tombstone matching resource blocks rather than deleting them.`,
    'Inspect the entire file content at that resolved Terraform path holistically — not just the target resource block.',
    'Identify direct downstream satellites or coupled blocks that reference the primary waste resource ID or name, specifically: aws_eip_association, the associated aws_eip, and aws_volume_attachment.',
    'If coupled resources are found, tombstone BOTH the primary resource AND every coupled satellite in the generated HCL diff so terraform validate stays green and idle provider charges (for example unassociated Elastic IPs) are not left behind.',
    'In commitMessage, document which primary resource was decommissioned and explain that linked resources (e.g. Elastic IP) were also removed to prevent idle provider charges or broken references.',
    '',
    'Situational grounding:',
    formatAuditContextMarkdown(auditContext),
  ].join('\n');
}

export function toFallbackModelMessages(messages: UIMessage[]): ModelMessage[] {
  return messages
    .filter(
      (message): message is UIMessage & { role: 'user' | 'assistant' } =>
        message.role === 'user' || message.role === 'assistant',
    )
    .map((message) => ({
      role: message.role,
      content: advisorMessageMarkdown(message),
    }))
    .filter(
      (message) =>
        message.role === 'user' || (message.role === 'assistant' && message.content.length > 0),
    );
}

export async function toAdvisorModelMessages(
  messages: UIMessage[],
  convert: typeof convertToModelMessages = convertToModelMessages,
): Promise<ModelMessage[]> {
  try {
    return await convert(messages);
  } catch (error) {
    console.warn('PulseAdvisor failed to convert UI messages; using text fallback', error);
    return toFallbackModelMessages(messages);
  }
}

export function isPulseAdvisorDemoMode(options: {
  demoMode?: string;
  anthropicApiKey?: string;
  auditorMode?: 'SIMULATED' | 'LIVE';
}): boolean {
  if (options.demoMode === 'true') {
    return true;
  }

  if (!options.anthropicApiKey) {
    return true;
  }

  return options.auditorMode !== 'LIVE';
}

export function isAnthropicFallbackError(error: unknown): boolean {
  if (APICallError.isInstance(error)) {
    const status = error.statusCode;
    if (status === 401 || status === 403 || status === 402 || status === 429 || status === 404) {
      return true;
    }
  }

  const status =
    typeof error === 'object' && error !== null && 'statusCode' in error
      ? Number((error as { statusCode?: number }).statusCode)
      : typeof error === 'object' && error !== null && 'status' in error
        ? Number((error as { status?: number }).status)
        : undefined;

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error ?? '');
  const normalized = message.toLowerCase();

  return (
    status === 401 ||
    status === 403 ||
    status === 402 ||
    status === 429 ||
    status === 404 ||
    normalized.includes('authentication') ||
    normalized.includes('unauthorized') ||
    normalized.includes('invalid api key') ||
    normalized.includes('invalid x-api-key') ||
    normalized.includes('rate limit') ||
    normalized.includes('rate-limit') ||
    normalized.includes('too many requests') ||
    normalized.includes('quota') ||
    normalized.includes('insufficient_quota') ||
    normalized.includes('credit balance') ||
    normalized.includes('not_found')
  );
}

export function createAdvisorTools(auditContext: CostAuditSummaryDto) {
  return {
    inspectWasteSummary: tool({
      description:
        'Fetches the current audit summary of the cloud infrastructure, detailing all active resources, spend, and potential savings.',
      inputSchema: z.object({}),
      execute: async () => auditContext,
    }),
    proposeTerraformRemediation: tool({
      description:
        'Propose a Terraform remediation for a real audited resource. Call this whenever you suggest an infrastructure change so the UI can render a proposal card. Inspect the entire Terraform file at the resolved GitFlow path, not only the target block. Include coupled satellites (aws_eip_association, associated aws_eip, aws_volume_attachment) in hclDiff when they reference the primary waste resource. Document that linked-resource tombstoning in commitMessage. branchName and hclDiff are aligned with the operator-configured GitFlow Terraform path and branch prefix.',
      inputSchema: remediationProposalSchema,
      execute: async (params): Promise<RemediationProposal> => {
        const gitFlow = alignProposalWithGitFlow(params);

        return {
          ...params,
          branchName: gitFlow.branchName,
          hclDiff: gitFlow.hclDiff,
          isSimulated: params.isSimulated ?? false,
        };
      },
    }),
  };
}

export type AdvisorToolSet = ReturnType<typeof createAdvisorTools>;
export type AdvisorUIMessage = UIMessage<unknown, UIDataTypes, InferUITools<AdvisorToolSet>>;
