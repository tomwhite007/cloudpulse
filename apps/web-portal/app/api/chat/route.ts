import { MOCK_COST_AUDIT_SUMMARY } from '@cloudpulse/api-contracts';
import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

function createMockModel(auditContext: any) {
  return {
    specificationVersion: 'v4',
    provider: 'cloudpulse-mock',
    modelId: 'mock-model',
    defaultObjectGenerationMode: 'tool',
    async doGenerate() { throw new Error('Not implemented'); },
    async doStream(options: any) {
      return {
        stream: new ReadableStream({
          start(controller) {
            const prompt = options.prompt || [];
            const lastMessage = prompt.findLast((m: any) => m.role === 'user');
            const lastMessageText = Array.isArray(lastMessage?.content) 
              ? lastMessage.content.map((c: any) => c.text || '').join('') 
              : (typeof lastMessage?.content === 'string' ? lastMessage.content : '');
            
            const isToolFollowUp = prompt.some(
              (msg: any) => msg.role === 'tool' || (msg.role === 'user' && typeof msg.content === 'string' && msg.content.includes('call tool'))
            );

            if (!isToolFollowUp) {
              let toolName = '';
              let toolInput: any = {};
              let responseText = '';

              if (lastMessageText.includes('Find zombie storage')) {
                responseText = 'I found an unattached EBS volume `analytics-scratch-vol-08f2` costing $950/mo. I can propose a PR to terminate it.';
                toolName = 'propose_terraform_remediation_pr';
                toolInput = { resourceId: 'res-ebs-02', resourceType: 'EBS', actionType: 'TERMINATE' };
              } else if (lastMessageText.includes('How can I cut $2k?')) {
                responseText = 'You can resize `prod-payments-aurora` to save $2,100/mo. Should I draft a PR?';
                toolName = 'propose_terraform_remediation_pr';
                toolInput = { resourceId: 'res-rds-01', resourceType: 'RDS', actionType: 'RESIZE' };
              } else if (lastMessageText.includes('Review RDS spend')) {
                responseText = 'Your RDS instance `prod-payments-aurora` is underutilized at 11% CPU. Resizing it will save significant costs. Here is the proposed patch:';
                toolName = 'propose_terraform_remediation_pr';
                toolInput = { resourceId: 'res-rds-01', resourceType: 'RDS', actionType: 'RESIZE' };
              } else if (lastMessageText.includes('Request PR proposal for')) {
                const resourceName = lastMessageText.replace('Request PR proposal for ', '').trim();
                const resource = auditContext?.resources?.find((r: any) => r.resourceName === resourceName);
                const resourceId = resource?.id || 'res-ebs-02';
                toolName = 'propose_terraform_remediation_pr';
                toolInput = { 
                  resourceId, 
                  resourceType: resource?.resourceType || 'EBS', 
                  actionType: resource?.recommendedAction?.actionType || 'TERMINATE' 
                };
              } else {
                toolName = 'inspectWasteSummary';
                toolInput = {};
              }

              if (responseText && !toolName) {
                controller.enqueue({ type: 'text-delta', id: `text_${Date.now()}`, delta: responseText });
              }

              if (toolName) {
                const toolCallId = `call_${Date.now()}_${toolInput.resourceId || 'inspect'}`;
                controller.enqueue({ 
                  type: 'tool-call', 
                  toolCallId, 
                  toolName, 
                  input: JSON.stringify(toolInput),
                  args: JSON.stringify(toolInput)
                } as any);
                controller.enqueue({ 
                type: 'finish', 
                finishReason: { unified: 'tool-calls', raw: 'tool-calls' }, 
                usage: { 
                  inputTokens: { total: 10, noCache: undefined, cacheRead: undefined, cacheWrite: undefined }, 
                  outputTokens: { total: 20, text: undefined, reasoning: undefined } 
                } 
              });
              } else {
                controller.enqueue({ 
                  type: 'finish', 
                  finishReason: { unified: 'stop', raw: 'stop' }, 
                  usage: { 
                    inputTokens: { total: 10, noCache: undefined, cacheRead: undefined, cacheWrite: undefined }, 
                    outputTokens: { total: 20, text: undefined, reasoning: undefined } 
                  } 
                });
              }
            } else {
              controller.enqueue({ type: 'text-delta', id: `text_followup_${Date.now()}`, delta: 'Tool execution complete.' });
              controller.enqueue({ 
                type: 'finish', 
                finishReason: { unified: 'stop', raw: 'stop' }, 
                usage: { 
                  inputTokens: { total: 20, noCache: undefined, cacheRead: undefined, cacheWrite: undefined }, 
                  outputTokens: { total: 10, text: undefined, reasoning: undefined } 
                } 
              });
            }
            controller.close();
          }
        })
      };
    }
  };
}

export async function POST(req: Request) {
  try {
    const { messages, auditContext }: { messages: any[], auditContext?: any } = await req.json();

    const isDemoMode = !process.env.OPENAI_API_KEY;

    const result = streamText({
      model: isDemoMode ? (createMockModel(auditContext) as any) : openai('gpt-4o-mini'),
      // @ts-ignore
      maxSteps: 5,
      onError: (error) => {
        console.error("STREAM ERROR:", error);
      },
      system: 'You are a FinOps PulseAdvisor Copilot. Your goal is to help users analyze their cloud waste and remediate issues to save costs. You have access to the current waste summary, and can propose remediations. Context: ' + JSON.stringify(auditContext || MOCK_COST_AUDIT_SUMMARY),
      messages,
      tools: {
        inspectWasteSummary: tool({
          description: 'Fetches the current audit summary of the cloud infrastructure, detailing all active resources, spend, and potential savings.',
          parameters: z.object({}),
          execute: async (_args: any): Promise<any> => auditContext || MOCK_COST_AUDIT_SUMMARY,
        } as any),
        propose_terraform_remediation_pr: tool({
          description: 'Proposes a terraform remediation pull request for a cloud resource. Returns structured patch metadata for the UI to render.',
          parameters: z.object({
            resourceId: z.string(),
            resourceType: z.enum(['RDS', 'EBS', 'ECS', 'EC2', 'LAMBDA']),
            actionType: z.enum(['RESIZE', 'TERMINATE', 'SCHEDULE_SLEEP']),
            targetBranch: z.string().optional(),
          }),
          execute: async (args: any): Promise<any> => {
            if (isDemoMode) {
              if (args.resourceId === 'res-rds-01') {
                return {
                  resourceId: 'res-rds-01',
                  resourceName: 'prod-payments-aurora',
                  actionType: 'RESIZE',
                  monthlySavingsUsd: 2100.00,
                  branchName: 'finops/resize-rds-01',
                  commitMessage: 'fix(infra): resize underutilized aurora cluster',
                  hclDiff: '- instance_class = "db.r6g.8xlarge"\\n+ instance_class = "db.r6g.2xlarge"',
                  safetyChecks: [
                    'CPU < 15% for 30 days',
                    'Connection count within limits for 2xlarge',
                    'Automated backups enabled'
                  ],
                  isSimulated: true
                };
              }
              
              const targetResource = auditContext?.resources?.find((r: any) => r.id === args.resourceId);
              
              return {
                resourceId: args.resourceId,
                resourceName: targetResource?.resourceName || 'analytics-scratch-vol-08f2',
                actionType: args.actionType || 'TERMINATE',
                monthlySavingsUsd: targetResource?.potentialMonthlySavings || 950.00,
                branchName: `finops/remediate-${args.resourceId}`,
                commitMessage: `fix(infra): ${args.actionType?.toLowerCase()} resource`,
                hclDiff: '- resource "aws_ebs_volume" "analytics_scratch" {\\n-   availability_zone = "us-west-2a"\\n-   size              = 2048\\n-   type              = "io2"\\n- }',
                safetyChecks: [
                  'Volume detached > 30 days',
                  'Zero read/write IOPS recorded',
                  'Final EBS snapshot initiated'
                ],
                isSimulated: true
              };
            }
            
            try {
              const transport = new SSEClientTransport(new URL('http://localhost:3000/api/mcp/sse'));
              const client = new Client({ name: 'web-portal', version: '1.0.0' }, { capabilities: {} });
              await client.connect(transport);
              
              const result = await client.callTool({
                name: 'propose_terraform_remediation_pr',
                arguments: args
              });
              
              const content = (result as any).content[0] as { type: 'text', text: string };
              const payload = JSON.parse(content.text);
              
              const resource = (auditContext || MOCK_COST_AUDIT_SUMMARY).resources.find((r: any) => r.id === args.resourceId);
              
              return {
                ...payload,
                resourceId: args.resourceId,
                resourceName: resource?.resourceName || args.resourceId,
                actionLabel: resource?.recommendedAction?.label || args.actionType,
              };
            } catch (e) {
              console.error('MCP Tool Call Error:', e);
              throw e;
            }
          }
        } as any)
      }
    });

    // @ts-ignore
    return result.toUIMessageStreamResponse ? result.toUIMessageStreamResponse() : (result as any).toDataStreamResponse();
  } catch(e: any) {
    return new Response(e.stack || e.message, { status: 500 });
  }
}
