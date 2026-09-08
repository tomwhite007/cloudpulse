import { openai } from "@ai-sdk/openai";
import { MOCK_COST_AUDIT_SUMMARY } from "@cloudpulse/api-contracts";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { streamText, tool } from "ai";
import { z } from "zod";

function createProposalFromFinding(finding: any) {
  const name = finding.resourceName || finding.name || finding.id || 'unknown';
  const type = finding.resourceType || 'EBS';
  const actionType = finding.recommendedAction?.actionType || finding.actionType || 'TERMINATE';
  const savings = finding.potentialMonthlySavings || finding.potentialSavings || 0;
  
  return {
    resourceId: finding.id,
    resourceName: name,
    actionType: actionType,
    monthlySavingsUsd: savings,
    branchName: `finops/remediate-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    commitMessage: `fix(infra): remediate ${type.toLowerCase()} ${name}`,
    hclDiff: `- resource "aws_${type.toLowerCase()}_volume" "${name.replace(/[^a-zA-Z0-9_]/g, '_')}" {\n-   id = "${finding.id}"\n- }`,
    safetyChecks: [
      `Finding classification: ${finding.findingType || finding.status || 'Waste'} (${finding.severity || 'HIGH'})`,
      `${finding.details || finding.telemetrySummary || 'Identified as idle/zombie resource'}`,
      'Final snapshot verification required prior to apply'
    ],
    isSimulated: true
  };
}

function createMockModel(auditContext: any) {
  return {
    specificationVersion: "v4",
    provider: "cloudpulse-mock",
    modelId: "mock-model",
    defaultObjectGenerationMode: "tool",
    async doGenerate() {
      throw new Error("Not implemented");
    },
    async doStream(options: any) {
      return {
        stream: new ReadableStream({
          start(controller) {
            const prompt = options.prompt || [];
            const lastMessage = prompt.findLast((m: any) => m.role === "user");
            const lastMessageText = Array.isArray(lastMessage?.content)
              ? lastMessage.content.map((c: any) => c.text || "").join("")
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
              let toolInput: any = {};
              let responseText = "";

              const findings = auditContext?.resources || auditContext?.findings || [];
              const prMatch = lastMessageText.match(/Request PR proposal for (.+)/i);

              if (prMatch) {
                const resourceName = prMatch[1].trim();
                const finding = findings.find((r: any) => (r.resourceName || r.name) === resourceName);
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
                const finding = findings.find((r: any) => r.status === 'ZOMBIE' || r.findingType === 'Zombie' || r.resourceType === 'EBS');
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
                const sorted = [...findings].sort((a, b) => ((b.potentialMonthlySavings || b.potentialSavings) || 0) - ((a.potentialMonthlySavings || a.potentialSavings) || 0));
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
                const activeCount = auditContext?.activeAssetCount || 0;
                const score = auditContext?.complianceScorePercent || 0;
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
              } else if (lastMessageText.includes("Review RDS spend") || lastMessageText.includes("How can I cut")) {
                const finding = findings.find((r: any) => r.resourceType === 'RDS') || findings[0];
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
                responseText = "I'm currently in demo mode and don't have the capability to process this specific request.";
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

                // Initialize the text part so the AI SDK parser doesn't crash
                controller.enqueue({ type: "text-start", id: textId } as any);

                // Stream the actual delta using the identical ID and both delta properties
                controller.enqueue({
                  type: "text-delta",
                  id: textId,
                  textDelta: responseText,
                  delta: responseText,
                } as any);
              }

              // --- TOOL CALL COMPATIBILITY ---
              // Tool calls in AI SDK v4 expect `args` as a stringified JSON string.
              if (toolName) {
                const toolCallId = `call_${Date.now()}_${toolInput.resourceId || "inspect"}`;
                controller.enqueue({
                  type: "tool-call",
                  toolCallId,
                  toolName,
                  input: JSON.stringify(toolInput),
                  args: JSON.stringify(toolInput),
                } as any);
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
              controller.enqueue({
                type: "text-delta",
                id: `text_followup_${Date.now()}`,
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages || [];
    const auditContext = body.auditContext || (body.data && body.data.auditContext) || undefined;

    const isDemoMode = !process.env.OPENAI_API_KEY;

    const result = streamText({
      model: isDemoMode
        ? (createMockModel(auditContext) as any)
        : openai("gpt-4o-mini"),
      // @ts-ignore - 'maxSteps' is supported by Vercel AI SDK 3.3.0+ but may cause type errors in mismatched local environments
      maxSteps: 5,
      onError: (error: any) => {
        console.error("STREAM ERROR:", error);
        require("fs").writeFileSync(
          "/tmp/stream-error.log",
          `Error name: ${error?.name}, message: ${error?.message}, stack: ${error?.stack}, cause: ${error?.cause}`,
        );
      },
      system:
        "You are a FinOps PulseAdvisor Copilot. Your goal is to help users analyze their cloud waste and remediate issues to save costs. You have access to the current waste summary, and can propose remediations. Context: " +
        JSON.stringify(auditContext || MOCK_COST_AUDIT_SUMMARY),
      messages: (messages || [])
        .filter(
          (m: any) =>
            m.role === "user" ||
            (m.role === "assistant" &&
              typeof m.content === "string" &&
              m.content),
        )
        .map((m: any) => ({ role: m.role, content: m.content })),
      tools: {
        inspectWasteSummary: tool({
          description:
            "Fetches the current audit summary of the cloud infrastructure, detailing all active resources, spend, and potential savings.",
          parameters: z.object({}),
          execute: async (_args: any): Promise<any> =>
            auditContext || MOCK_COST_AUDIT_SUMMARY,
        } as any),
        propose_terraform_remediation_pr: tool({
          description:
            "Proposes a terraform remediation pull request for a cloud resource. Returns structured patch metadata for the UI to render.",
          parameters: z.object({
            resourceId: z.string(),
            resourceType: z.enum(["RDS", "EBS", "ECS", "EC2", "LAMBDA"]),
            actionType: z.enum(["RESIZE", "TERMINATE", "SCHEDULE_SLEEP"]),
            targetBranch: z.string().optional(),
          }),
          execute: async (args: any): Promise<any> => {
            if (isDemoMode) {
              const findings = auditContext?.resources || auditContext?.findings || [];
              const targetResource = findings.find((r: any) => r.id === args.resourceId);

              if (targetResource) {
                return createProposalFromFinding(targetResource);
              }

              return createProposalFromFinding({
                id: args.resourceId,
                resourceName: args.resourceId,
                resourceType: args.resourceType,
                recommendedAction: { actionType: args.actionType },
                potentialSavings: 0,
                findingType: 'Unknown',
                severity: 'LOW',
                details: 'No details available'
              });
            }

            try {
              const transport = new SSEClientTransport(
                new URL("http://localhost:3000/api/mcp/sse"),
              );
              const client = new Client(
                { name: "web-portal", version: "1.0.0" },
                { capabilities: {} },
              );
              await client.connect(transport);

              const result = await client.callTool({
                name: "propose_terraform_remediation_pr",
                arguments: args,
              });

              const content = (result as any).content[0] as {
                type: "text";
                text: string;
              };
              const payload = JSON.parse(content.text);

              const resource = (
                auditContext || MOCK_COST_AUDIT_SUMMARY
              ).resources.find((r: any) => r.id === args.resourceId);

              return {
                ...payload,
                resourceId: args.resourceId,
                resourceName: resource?.resourceName || args.resourceId,
                actionLabel:
                  resource?.recommendedAction?.label || args.actionType,
              };
            } catch (e) {
              console.error("MCP Tool Call Error:", e);
              throw e;
            }
          },
        } as any),
      },
    });

    // @ts-ignore - toUIMessageStreamResponse exists in newer AI SDK versions, but the local type definition may not recognize it.
    return result.toUIMessageStreamResponse
      ? result.toUIMessageStreamResponse()
      : (result as any).toDataStreamResponse();
  } catch (e: any) {
    return new Response(e.stack || e.message, { status: 500 });
  }
}
