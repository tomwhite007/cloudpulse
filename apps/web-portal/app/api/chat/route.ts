import { anthropic } from "@ai-sdk/anthropic";
import {
  MOCK_COST_AUDIT_SUMMARY,
  type CostAuditSummaryDto,
} from "@cloudpulse/api-contracts";
import {
  APICallError,
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
} from "ai";
import type { ModelMessage } from "ai";
import { z } from "zod";

const DEMO_MODE_NOTICE = "PulseAdvisor running in deterministic DEMO mode";
const PULSE_ADVISOR_MODEL = "claude-sonnet-5";

const remediationProposalSchema = z.object({
  resourceId: z.string().describe("Real cloud resource ID from the audit findings"),
  resourceName: z.string().describe("Human-readable resource name"),
  actionType: z
    .enum(["RESIZE", "TERMINATE", "SCHEDULE_SLEEP"])
    .describe("Remediation action to apply"),
  monthlySavingsUsd: z.number().describe("Estimated monthly savings in USD"),
  branchName: z.string().describe("Git branch name for the remediation PR"),
  commitMessage: z.string().describe("Commit message for the Terraform change"),
  hclDiff: z.string().describe("Terraform HCL patch preview"),
  safetyChecks: z
    .array(z.string())
    .describe("Safety checks the operator should verify before apply"),
  isSimulated: z
    .boolean()
    .optional()
    .describe("Whether this proposal is a simulated/demo card"),
});

type RemediationProposal = z.infer<typeof remediationProposalSchema>;

type AuditFinding = {
  id?: string;
  resourceName?: string;
  name?: string;
  resourceType?: string;
  status?: string;
  findingType?: string;
  severity?: string;
  details?: string;
  telemetrySummary?: string;
  potentialMonthlySavings?: number;
  potentialSavings?: number;
  recommendedAction?: { actionType?: string };
};

type ChatRequestMessage = {
  role?: string;
  content?: unknown;
  parts?: Array<{ type?: string; text?: string }>;
};

type AdvisorRequest = {
  messages: ChatRequestMessage[];
  auditContext: unknown;
};

function getAuditFindings(auditContext: unknown): AuditFinding[] {
  if (!auditContext || typeof auditContext !== "object") {
    return [];
  }

  const ctx = auditContext as {
    resources?: AuditFinding[];
    findings?: AuditFinding[];
  };

  return ctx.resources ?? ctx.findings ?? [];
}

function createProposalFromFinding(finding: AuditFinding): RemediationProposal {
  const name = finding.resourceName || finding.name || finding.id || "unknown";
  const type = finding.resourceType || "EBS";
  const actionType =
    finding.recommendedAction?.actionType === "RESIZE" ||
    finding.recommendedAction?.actionType === "SCHEDULE_SLEEP"
      ? finding.recommendedAction.actionType
      : "TERMINATE";
  const savings = finding.potentialMonthlySavings || finding.potentialSavings || 0;

  return {
    resourceId: finding.id || name,
    resourceName: name,
    actionType,
    monthlySavingsUsd: savings,
    branchName: `finops/remediate-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
    commitMessage: `fix(infra): remediate ${type.toLowerCase()} ${name}`,
    hclDiff: `- resource "aws_${type.toLowerCase()}_volume" "${name.replace(/[^a-zA-Z0-9_]/g, "_")}" {\n-   id = "${finding.id}"\n- }`,
    safetyChecks: [
      `Finding classification: ${finding.findingType || finding.status || "Waste"} (${finding.severity || "HIGH"})`,
      `${finding.details || finding.telemetrySummary || "Identified as idle/zombie resource"}`,
      "Final snapshot verification required prior to apply",
    ],
    isSimulated: true,
  };
}

function formatAuditContextMarkdown(auditContext: unknown): string {
  const ctx = (auditContext ?? MOCK_COST_AUDIT_SUMMARY) as CostAuditSummaryDto & {
    findings?: CostAuditSummaryDto["resources"];
  };
  const findings = ctx.resources ?? ctx.findings ?? [];

  const metrics = [
    `- Total monthly spend: $${ctx.totalMonthlySpend ?? "n/a"} ${ctx.currency ?? "USD"}`,
    `- Identified waste: $${ctx.totalIdentifiedWaste ?? "n/a"}`,
    `- Active assets: ${ctx.activeAssetCount ?? "n/a"}`,
    `- Compliance score: ${ctx.complianceScorePercent ?? "n/a"}%`,
  ].join("\n");

  const findingLines =
    findings
      .map((finding) => {
        const id = finding.id ?? "unknown-id";
        const name = finding.resourceName ?? "unnamed";
        const savings = finding.potentialMonthlySavings ?? 0;
        const action = finding.recommendedAction?.actionType ?? "REVIEW";
        return `- \`${id}\` ${name} (${finding.resourceType}, ${finding.status}): $${savings}/mo — recommended ${action}`;
      })
      .join("\n") || "- None";

  return [
    "## Audit metrics",
    metrics,
    "",
    "## Findings (use these real resource IDs)",
    findingLines,
    "",
    "## Full auditContext JSON",
    "```json",
    JSON.stringify(auditContext ?? MOCK_COST_AUDIT_SUMMARY, null, 2),
    "```",
  ].join("\n");
}

function buildLiveSystemPrompt(auditContext: unknown): string {
  return [
    "You are an Elite Enterprise FinOps Copilot (PulseAdvisor).",
    "Help the operator analyze cloud waste and propose safe Terraform remediations.",
    "Always reference real resource IDs from the audit findings below.",
    "Whenever you suggest an infrastructure change, you MUST execute the proposeTerraformRemediation tool so the UI can render a proposal card.",
    "Do not invent resources that are not present in the audit context.",
    "",
    "Situational grounding:",
    formatAuditContextMarkdown(auditContext),
  ].join("\n");
}

function messageText(message: ChatRequestMessage | undefined): string {
  if (!message) {
    return "";
  }

  if (typeof message.content === "string") {
    return message.content;
  }

  return (message.parts ?? [])
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("");
}

function toFallbackModelMessages(messages: ChatRequestMessage[]): ModelMessage[] {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: messageText(message),
    }))
    .filter(
      (message) =>
        message.role === "user" ||
        (message.role === "assistant" && message.content.length > 0),
    );
}

async function toLiveModelMessages(
  messages: ChatRequestMessage[],
): Promise<ModelMessage[]> {
  try {
    if (messages.some((message) => Array.isArray(message.parts))) {
      return await convertToModelMessages(messages as never);
    }
  } catch (error) {
    console.warn(
      "PulseAdvisor failed to convert UI messages; using text fallback",
      error,
    );
  }

  return toFallbackModelMessages(messages);
}

function isAnthropicFallbackError(error: unknown): boolean {
  if (APICallError.isInstance(error)) {
    const status = error.statusCode;
    if (status === 401 || status === 403 || status === 402 || status === 429 || status === 404) {
      return true;
    }
  }

  const status =
    typeof error === "object" && error !== null && "statusCode" in error
      ? Number((error as { statusCode?: number }).statusCode)
      : typeof error === "object" && error !== null && "status" in error
        ? Number((error as { status?: number }).status)
        : undefined;

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error ?? "");
  const normalized = message.toLowerCase();

  return (
    status === 401 ||
    status === 403 ||
    status === 402 ||
    status === 429 ||
    status === 404 ||
    normalized.includes("authentication") ||
    normalized.includes("unauthorized") ||
    normalized.includes("invalid api key") ||
    normalized.includes("invalid x-api-key") ||
    normalized.includes("rate limit") ||
    normalized.includes("rate-limit") ||
    normalized.includes("too many requests") ||
    normalized.includes("quota") ||
    normalized.includes("insufficient_quota") ||
    normalized.includes("credit balance") ||
    normalized.includes("not_found")
  );
}

function inspectWasteSummaryTool(auditContext: unknown) {
  return tool({
    description:
      "Fetches the current audit summary of the cloud infrastructure, detailing all active resources, spend, and potential savings.",
    inputSchema: z.object({}),
    execute: async () => auditContext || MOCK_COST_AUDIT_SUMMARY,
  });
}

function demoRemediationTool(auditContext: unknown) {
  return tool({
    description:
      "Proposes a terraform remediation pull request for a cloud resource. Returns structured patch metadata for the UI to render.",
    inputSchema: z.object({
      resourceId: z.string(),
      resourceType: z.enum(["RDS", "EBS", "ECS", "EC2", "LAMBDA"]),
      actionType: z.enum(["RESIZE", "TERMINATE", "SCHEDULE_SLEEP"]),
      targetBranch: z.string().optional(),
    }),
    execute: async (args): Promise<RemediationProposal> => {
      const findings = getAuditFindings(auditContext);
      const targetResource = findings.find((finding) => finding.id === args.resourceId);

      if (targetResource) {
        return createProposalFromFinding(targetResource);
      }

      return createProposalFromFinding({
        id: args.resourceId,
        resourceName: args.resourceId,
        resourceType: args.resourceType,
        recommendedAction: { actionType: args.actionType },
        potentialSavings: 0,
        findingType: "Unknown",
        severity: "LOW",
        details: "No details available",
      });
    },
  });
}

function liveRemediationTool() {
  return tool({
    description:
      "Propose a Terraform remediation for a real audited resource. Call this whenever you suggest an infrastructure change so the UI can render a proposal card.",
    inputSchema: remediationProposalSchema,
    execute: async (params): Promise<RemediationProposal> => ({
      ...params,
      isSimulated: params.isSimulated ?? false,
    }),
  });
}

function toAdvisorDataStreamResponse(result: {
  toDataStreamResponse?: () => Response;
  toUIMessageStreamResponse: () => Response;
}): Response {
  if (typeof result.toDataStreamResponse === "function") {
    return result.toDataStreamResponse();
  }

  return result.toUIMessageStreamResponse();
}

function createMockModel(auditContext: unknown) {
  return {
    specificationVersion: "v4",
    provider: "cloudpulse-mock",
    modelId: "mock-model",
    defaultObjectGenerationMode: "tool",
    async doGenerate() {
      throw new Error("Not implemented");
    },
    async doStream(options: {
      prompt?: Array<{ role?: string; content?: unknown }>;
    }) {
      return {
        stream: new ReadableStream({
          start(controller) {
            const prompt = options.prompt || [];
            const lastMessage = prompt.findLast((m) => m.role === "user");
            const lastMessageText = Array.isArray(lastMessage?.content)
              ? lastMessage.content
                  .map((c) =>
                    typeof c === "object" && c && "text" in c
                      ? String((c as { text?: string }).text || "")
                      : "",
                  )
                  .join("")
              : typeof lastMessage?.content === "string"
                ? lastMessage.content
                : "";

            const lastMessageOverall = prompt[prompt.length - 1];
            const isToolFollowUp =
              lastMessageOverall?.role === "tool" ||
              (lastMessageOverall?.role === "user" &&
                typeof lastMessageOverall?.content === "string" &&
                lastMessageOverall.content.includes("call tool"));

            if (!isToolFollowUp) {
              let toolName = "";
              let toolInput: Record<string, unknown> = {};
              let responseText = "";

              const findings = getAuditFindings(auditContext);
              const prMatch = lastMessageText.match(/Request PR proposal for (.+)/i);

              if (prMatch) {
                const resourceName = prMatch[1].trim();
                const finding = findings.find(
                  (r) => (r.resourceName || r.name) === resourceName,
                );
                if (finding) {
                  responseText = `Prepared remediation proposal for ${finding.resourceName || finding.name}.`;
                  toolName = "propose_terraform_remediation_pr";
                  toolInput = {
                    resourceId: finding.id,
                    resourceType: finding.resourceType || "EBS",
                    actionType: finding.recommendedAction?.actionType || "TERMINATE",
                  };
                } else {
                  responseText = `I couldn't find a resource named ${resourceName}.`;
                }
              } else if (lastMessageText.includes("Find zombie storage")) {
                const finding = findings.find(
                  (r) =>
                    r.status === "ZOMBIE" ||
                    r.findingType === "Zombie" ||
                    r.resourceType === "EBS",
                );
                if (finding) {
                  responseText = `I found an unattached ${finding.resourceType} volume \`${finding.resourceName || finding.name}\` costing $${finding.potentialMonthlySavings || finding.potentialSavings}/mo. I can propose a PR to terminate it.`;
                  toolName = "propose_terraform_remediation_pr";
                  toolInput = {
                    resourceId: finding.id,
                    resourceType: finding.resourceType || "EBS",
                    actionType: finding.recommendedAction?.actionType || "TERMINATE",
                  };
                } else {
                  responseText = "No zombie storage was detected in your infrastructure.";
                }
              } else if (lastMessageText.includes("Explain waste findings")) {
                const sorted = [...findings].sort(
                  (a, b) =>
                    (b.potentialMonthlySavings || b.potentialSavings || 0) -
                    (a.potentialMonthlySavings || a.potentialSavings || 0),
                );
                const topFinding = sorted[0];
                if (topFinding) {
                  responseText = `You have ${findings.length} findings. The largest contributor is \`${topFinding.resourceName || topFinding.name}\` wasting $${topFinding.potentialMonthlySavings || topFinding.potentialSavings}/mo. I can propose a PR to fix it.`;
                  toolName = "propose_terraform_remediation_pr";
                  toolInput = {
                    resourceId: topFinding.id,
                    resourceType: topFinding.resourceType,
                    actionType: topFinding.recommendedAction?.actionType || "TERMINATE",
                  };
                } else {
                  responseText = "You have no waste findings at the moment!";
                }
              } else if (lastMessageText.includes("Explain compliance score")) {
                const summary = auditContext as CostAuditSummaryDto | undefined;
                const activeCount = summary?.activeAssetCount || 0;
                const score = summary?.complianceScorePercent || 0;
                const wasteCount = findings.length;
                responseText = `Your score is ${score}% because ${wasteCount} of ${activeCount} monitored assets is flagged as non-compliant waste.`;
                const finding = findings[0];
                if (finding) {
                  toolName = "propose_terraform_remediation_pr";
                  toolInput = {
                    resourceId: finding.id,
                    resourceType: finding.resourceType,
                    actionType: finding.recommendedAction?.actionType || "TERMINATE",
                  };
                }
              } else if (
                lastMessageText.includes("Review RDS spend") ||
                lastMessageText.includes("How can I cut")
              ) {
                const finding =
                  findings.find((r) => r.resourceType === "RDS") || findings[0];
                if (finding) {
                  responseText = `I found an issue with \`${finding.resourceName || finding.name}\` wasting $${finding.potentialMonthlySavings || finding.potentialSavings}/mo. Should I draft a PR?`;
                  toolName = "propose_terraform_remediation_pr";
                  toolInput = {
                    resourceId: finding.id,
                    resourceType: finding.resourceType,
                    actionType: finding.recommendedAction?.actionType || "RESIZE",
                  };
                } else {
                  responseText = "I couldn't find any significant waste to review right now.";
                }
              } else {
                responseText =
                  "I'm currently in demo mode and don't have the capability to process this specific request.";
                toolName = "inspectWasteSummary";
              }
              // --- VERCEL AI SDK v4 CUSTOM PROVIDER COMPATIBILITY NOTES ---
              // When streaming custom UI text alongside tool calls, the AI SDK v4+ parser has very
              // strict requirements for the stream chunks.
              // 1. You CANNOT just emit a `text-delta` chunk. If you do, the AI SDK throws an internal
              //    error (`text part undefined not found`) because it hasn't registered an active text part.
              // 2. This internal error translates to an `{"type":"error"}` chunk sent to the frontend.
              // 3. When the `@ai-sdk/react` useChat hook receives an error chunk, it INSTANTLY aborts rendering
              //    the current assistant message, causing the UI to disappear (including the tool cards).
              // 4. FIX: You must emit a `text-start` chunk with a unique `id` first, and then emit the
              //    `text-delta` chunk using the EXACT SAME `id`.
              // 5. Property quirks: To satisfy both `@ai-sdk/core` type definitions and the internal parser
              //    (which checks `chunk.delta.length`), you must provide BOTH `textDelta` AND `delta`
              //    in the `text-delta` chunk.
              if (responseText) {
                const textId = `text_${Date.now()}`;

                controller.enqueue({ type: "text-start", id: textId });

                controller.enqueue({
                  type: "text-delta",
                  id: textId,
                  textDelta: responseText,
                  delta: responseText,
                });
              }

              if (toolName) {
                const toolCallId = `call_${Date.now()}_${String(toolInput.resourceId || "inspect")}`;
                controller.enqueue({
                  type: "tool-call",
                  toolCallId,
                  toolName,
                  input: JSON.stringify(toolInput),
                  args: JSON.stringify(toolInput),
                });
                controller.enqueue({
                  type: "finish",
                  finishReason: { unified: "tool-calls", raw: "tool-calls" },
                  usage: {
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
                  },
                });
              } else {
                controller.enqueue({
                  type: "finish",
                  finishReason: { unified: "stop", raw: "stop" },
                  usage: {
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
                  },
                });
              }
            } else {
              const followUpId = `text_followup_${Date.now()}`;
              controller.enqueue({ type: "text-start", id: followUpId });
              controller.enqueue({
                type: "text-delta",
                id: followUpId,
                textDelta: "Tool execution complete.",
                delta: "Tool execution complete.",
              });
              controller.enqueue({
                type: "finish",
                finishReason: { unified: "stop", raw: "stop" },
                usage: {
                  inputTokens: {
                    total: 20,
                    noCache: undefined,
                    cacheRead: undefined,
                    cacheWrite: undefined,
                  },
                  outputTokens: {
                    total: 10,
                    text: undefined,
                    reasoning: undefined,
                  },
                },
              });
            }
            controller.close();
          },
        }),
      };
    },
  };
}

function createDemoAdvisorResponse({
  messages,
  auditContext,
}: AdvisorRequest): Response {
  const result = streamText({
    model: createMockModel(auditContext) as never,
    stopWhen: stepCountIs(5),
    onError: ({ error }) => {
      console.error("STREAM ERROR:", error);
    },
    system:
      "You are a FinOps PulseAdvisor Copilot. Your goal is to help users analyze their cloud waste and remediate issues to save costs. You have access to the current waste summary, and can propose remediations. Context: " +
      JSON.stringify(auditContext || MOCK_COST_AUDIT_SUMMARY),
    messages: toFallbackModelMessages(messages),
    tools: {
      inspectWasteSummary: inspectWasteSummaryTool(auditContext),
      propose_terraform_remediation_pr: demoRemediationTool(auditContext),
    },
  });

  return toAdvisorDataStreamResponse(result);
}

async function createLiveAdvisorResponse({
  messages,
  auditContext,
}: AdvisorRequest): Promise<Response> {
  const result = streamText({
    model: anthropic(PULSE_ADVISOR_MODEL),
    // AI SDK 7 equivalent of maxSteps: 3
    stopWhen: stepCountIs(3),
    onError: ({ error }) => {
      console.error("PulseAdvisor Anthropic stream error:", error);
    },
    system: buildLiveSystemPrompt(auditContext),
    messages: await toLiveModelMessages(messages),
    tools: {
      inspectWasteSummary: inspectWasteSummaryTool(auditContext),
      proposeTerraformRemediation: liveRemediationTool(),
    },
  });

  return toAdvisorDataStreamResponse(result);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      messages?: ChatRequestMessage[];
      auditContext?: unknown;
      data?: { auditContext?: unknown };
    };
    const messages = body.messages || [];
    const auditContext =
      body.auditContext || (body.data && body.data.auditContext) || undefined;

    const isDemoMode =
      process.env.DEMO_MODE === "true" || !process.env.ANTHROPIC_API_KEY;

    if (isDemoMode) {
      console.log(DEMO_MODE_NOTICE);
      return createDemoAdvisorResponse({ messages, auditContext });
    }

    try {
      return await createLiveAdvisorResponse({ messages, auditContext });
    } catch (error) {
      if (isAnthropicFallbackError(error)) {
        console.error(
          "PulseAdvisor Anthropic error, falling back to deterministic DEMO mode",
          error,
        );
        console.log(DEMO_MODE_NOTICE);
        return createDemoAdvisorResponse({ messages, auditContext });
      }

      throw error;
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.stack || e.message : String(e);
    return new Response(message, { status: 500 });
  }
}
