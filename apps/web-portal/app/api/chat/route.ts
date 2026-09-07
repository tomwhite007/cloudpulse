import { MOCK_COST_AUDIT_SUMMARY } from '@cloudpulse/api-contracts';
import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';

const mockModel = {
  specificationVersion: 'v3',
  provider: 'mock',
  modelId: 'mock-model',
  defaultObjectGenerationMode: 'tool',
  async doGenerate() { throw new Error('Not implemented'); },
  async doStream(options) {
    return {
      stream: new ReadableStream({
        start(controller) {
          const prompt = options.prompt || [];
          const isToolFollowUp = prompt.some(
            (msg) => msg.role === 'tool' || (msg.role === 'user' && typeof msg.content === 'string' && msg.content.includes('call tool'))
          );

          if (!isToolFollowUp) {
            controller.enqueue({ 
              type: 'tool-call', 
              toolCallType: 'function', 
              toolCallId: 'call_mock_123', 
              toolName: 'proposeRemediation', 
              input: '{"resourceId":"res-ebs-analytics-scratch","actionType":"TERMINATE"}' 
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
    model: isDemoMode ? mockModel : openai('gpt-4o-mini'),
    onError: (error) => console.error("STREAM ERROR:", error),
    system: 'You are a FinOps PulseAdvisor Copilot. Your goal is to help users analyze their cloud waste and remediate issues to save costs. You have access to the current waste summary, and can propose remediations.',
    messages,
    maxSteps: 5,
    tools: {
      inspectWasteSummary: tool({
        description: 'Fetches the current audit summary of the cloud infrastructure, detailing all active resources, spend, and potential savings.',
        parameters: z.object({}),
        execute: async (_args: any): Promise<any> => MOCK_COST_AUDIT_SUMMARY,
      } as any),
      proposeRemediation: tool({
        description: 'Proposes a remediation action for a given resource. Returns structured patch metadata for the UI to render.',
        parameters: z.object({
          resourceId: z.string(),
          actionType: z.enum(['RESIZE', 'TERMINATE', 'SCHEDULE_SLEEP']),
        }),
        execute: async ({ resourceId, actionType }: any): Promise<any> => {
          const resource = MOCK_COST_AUDIT_SUMMARY.resources.find(r => r.id === resourceId);
          if (!resource) {
            throw new Error(`Resource ${resourceId} not found`);
          }
          return {
            resourceId: resource.id,
            resourceName: resource.resourceName,
            monthlySavings: resource.potentialMonthlySavings,
            terraformPatchPreview: resource.recommendedAction.terraformPatchPreview,
            actionType,
            actionLabel: resource.recommendedAction.label,
          };
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
