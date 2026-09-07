import { MOCK_COST_AUDIT_SUMMARY } from '@cloudpulse/api-contracts';
import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

const mockModel = {
  specificationVersion: 'v3',
  provider: 'mock',
  modelId: 'mock-model',
  defaultObjectGenerationMode: 'tool',
  async doGenerate() { throw new Error('Not implemented'); },
  async doStream(options: any) {
    return {
      stream: new ReadableStream({
        start(controller) {
          const prompt = options.prompt || [];
          const isToolFollowUp = prompt.some(
            (msg: any) => msg.role === 'tool' || (msg.role === 'user' && typeof msg.content === 'string' && msg.content.includes('call tool'))
          );

          if (!isToolFollowUp) {
            controller.enqueue({ 
              type: 'tool-call', 
              toolCallType: 'function', 
              toolCallId: 'call_mock_123', 
              toolName: 'propose_terraform_remediation_pr', 
              input: '{"resourceId":"res-ebs-analytics-scratch","resourceType":"EBS","actionType":"TERMINATE"}' 
            });
            controller.enqueue({ 
              type: 'finish', 
              finishReason: { unified: 'tool-calls' }, 
              usage: { inputTokens: { total: 10 }, outputTokens: { total: 20 } } 
            });
          } else {
            controller.enqueue({ type: 'text-delta', delta: 'I have successfully terminated the EBS volume.' });
            controller.enqueue({ 
              type: 'finish', 
              finishReason: { unified: 'stop' }, 
              usage: { inputTokens: { total: 20 }, outputTokens: { total: 10 } } 
            });
          }
          controller.close();
        }
      })
    };
  }
};

export async function POST(req: Request) {
  try {
  const { messages }: { messages: any[] } = await req.json();

  const isDemoMode = !process.env.OPENAI_API_KEY;

  const result = streamText({
    model: isDemoMode ? (mockModel as any) : openai('gpt-4o-mini'),
    onError: (error) => console.error("STREAM ERROR:", error),
    system: 'You are a FinOps PulseAdvisor Copilot. Your goal is to help users analyze their cloud waste and remediate issues to save costs. You have access to the current waste summary, and can propose remediations.',
    messages,
    tools: {
      inspectWasteSummary: tool({
        description: 'Fetches the current audit summary of the cloud infrastructure, detailing all active resources, spend, and potential savings.',
        parameters: z.object({}),
        execute: async (_args: any): Promise<any> => MOCK_COST_AUDIT_SUMMARY,
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
            
            // Also need resourceName and actionLabel for the UI
            const resource = MOCK_COST_AUDIT_SUMMARY.resources.find(r => r.id === args.resourceId);
            
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
