import { MOCK_COST_AUDIT_SUMMARY } from '@cloudpulse/api-contracts';
import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
// A simple mock model to ensure the UI works locally without an OpenAI API Key.
const mockModel: any = {
  specificationVersion: 'v1',
  provider: 'mock',
  modelId: 'mock-model',
  defaultObjectGenerationMode: 'json',
  async doGenerate() {
    throw new Error('Not implemented');
  },
  async doStream() {
    return {
      stream: new ReadableStream<any>({
        start(controller) {
          controller.enqueue({ type: 'text-delta', textDelta: 'I am a mock PulseAdvisor. Since no OPENAI_API_KEY is set, I am simulating a response to help you save costs.\n\nHere is a recommendation:\n' });
          
          controller.enqueue({
            type: 'tool-call-delta',
            toolCallType: 'function',
            toolCallId: 'call_mock_123',
            toolName: 'proposeRemediation',
            argsTextDelta: '{"resourceId":"res-ebs-analytics-scratch","actionType":"TERMINATE"}',
          });

          controller.enqueue({
             type: 'tool-call',
             toolCallType: 'function',
             toolCallId: 'call_mock_123',
             toolName: 'proposeRemediation',
             args: '{"resourceId":"res-ebs-analytics-scratch","actionType":"TERMINATE"}',
          });

          controller.enqueue({
             type: 'finish',
             finishReason: 'stop',
             usage: { promptTokens: 0, completionTokens: 0 }
          });
          controller.close();
        },
      }),
      rawCall: { rawPrompt: null, rawSettings: {} },
    };
  },
};

export async function POST(req: Request) {
  const { messages }: { messages: any[] } = await req.json();

  const isDemoMode = !process.env.OPENAI_API_KEY;

  const result = streamText({
    model: isDemoMode ? mockModel : openai('gpt-4o-mini'),
    system: 'You are a FinOps PulseAdvisor Copilot. Your goal is to help users analyze their cloud waste and remediate issues to save costs. You have access to the current waste summary, and can propose remediations.',
    messages,
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
  return result.toDataStreamResponse ? result.toDataStreamResponse() : (result as any).toTextStreamResponse();
}
