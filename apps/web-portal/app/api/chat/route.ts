import { openai } from "@ai-sdk/openai";
import { MOCK_COST_AUDIT_SUMMARY } from "@cloudpulse/api-contracts";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { streamText, tool } from "ai";
import { z } from "zod";

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

              if (lastMessageText.includes("Find zombie storage")) {
                responseText =
                  "I found an unattached EBS volume `analytics-scratch-vol-08f2` costing $950/mo. I can propose a PR to terminate it.";
                toolName = "propose_terraform_remediation_pr";
                toolInput = {
                  resourceId: "res-ebs-02",
                  resourceType: "EBS",
                  actionType: "TERMINATE",
                };
              } else if (lastMessageText.includes("How can I cut $2k?")) {
                responseText =
                  "You can resize `prod-payments-aurora` to save $2,100/mo. Should I draft a PR?";
                toolName = "propose_terraform_remediation_pr";
                toolInput = {
                  resourceId: "res-rds-01",
                  resourceType: "RDS",
                  actionType: "RESIZE",
                };
              } else if (lastMessageText.includes("Review RDS spend")) {
                responseText =
                  "Your RDS instance `prod-payments-aurora` is underutilized at 11% CPU. Resizing it will save significant costs. Here is the proposed patch:";
                toolName = "propose_terraform_remediation_pr";
                toolInput = {
                  resourceId: "res-rds-01",
                  resourceType: "RDS",
                  actionType: "RESIZE",
                };
              } else if (lastMessageText.includes("Request PR proposal for")) {
                const resourceName = lastMessageText
                  .replace("Request PR proposal for ", "")
                  .trim();
                const resource = auditContext?.resources?.find(
                  (r: any) => r.resourceName === resourceName,
                );
                const resourceId = resource?.id || "res-ebs-02";
                toolName = "propose_terraform_remediation_pr";
                toolInput = {
                  resourceId,
                  resourceType: resource?.resourceType || "EBS",
                  actionType:
                    resource?.recommendedAction?.actionType || "TERMINATE",
                };
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
    const { messages, auditContext }: { messages: any[]; auditContext?: any } =
      await req.json();

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
              if (args.resourceId === "res-rds-01") {
                return {
                  resourceId: "res-rds-01",
                  resourceName: "prod-payments-aurora",
                  actionType: "RESIZE",
                  monthlySavingsUsd: 2100.0,
                  branchName: "finops/resize-rds-01",
                  commitMessage:
                    "fix(infra): resize underutilized aurora cluster",
                  hclDiff:
                    '- instance_class = "db.r6g.8xlarge"\\n+ instance_class = "db.r6g.2xlarge"',
                  safetyChecks: [
                    "CPU < 15% for 30 days",
                    "Connection count within limits for 2xlarge",
                    "Automated backups enabled",
                  ],
                  isSimulated: true,
                };
              }

              const targetResource = auditContext?.resources?.find(
                (r: any) => r.id === args.resourceId,
              );

              return {
                resourceId: args.resourceId,
                resourceName:
                  targetResource?.resourceName || "analytics-scratch-vol-08f2",
                actionType: args.actionType || "TERMINATE",
                monthlySavingsUsd:
                  targetResource?.potentialMonthlySavings || 950.0,
                branchName: `finops/remediate-${args.resourceId}`,
                commitMessage: `fix(infra): ${args.actionType?.toLowerCase()} resource`,
                hclDiff:
                  '- resource "aws_ebs_volume" "analytics_scratch" {\\n-   availability_zone = "us-west-2a"\\n-   size              = 2048\\n-   type              = "io2"\\n- }',
                safetyChecks: [
                  "Volume detached > 30 days",
                  "Zero read/write IOPS recorded",
                  "Final EBS snapshot initiated",
                ],
                isSimulated: true,
              };
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
