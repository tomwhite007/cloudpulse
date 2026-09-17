import { anthropic } from '@ai-sdk/anthropic';
import { stepCountIs, streamText } from 'ai';
import type { LanguageModel, UIMessage } from 'ai';
import { createMockAdvisorLanguageModel } from '@/features/dashboard/mocks/pulse-advisor-model.mock';
import {
  buildAdvisorSystemPrompt,
  createAdvisorTools,
  isAnthropicFallbackError,
  isPulseAdvisorDemoMode,
  parseAuditContext,
  toAdvisorModelMessages,
} from '@/features/dashboard/utils/pulse-advisor-tools';
import { getCloudPulseSession, isEvaluatorSession } from '@/lib/session';

const DEMO_MODE_NOTICE = 'PulseAdvisor running in deterministic DEMO mode';
const PULSE_ADVISOR_MODEL = 'claude-sonnet-5';

type AdvisorChatBody = {
  messages?: UIMessage[];
  auditContext?: unknown;
  data?: { auditContext?: unknown };
};

async function streamAdvisorResponse(options: {
  model: LanguageModel;
  messages: UIMessage[];
  auditContext: ReturnType<typeof parseAuditContext>;
}): Promise<Response> {
  const result = streamText({
    model: options.model,
    stopWhen: stepCountIs(3),
    onError: ({ error }) => {
      console.error('PulseAdvisor stream error:', error);
    },
    system: buildAdvisorSystemPrompt(options.auditContext),
    messages: await toAdvisorModelMessages(options.messages),
    tools: createAdvisorTools(options.auditContext),
  });

  return result.toUIMessageStreamResponse();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AdvisorChatBody;
    const messages = body.messages ?? [];
    const auditContext = parseAuditContext(body.auditContext ?? body.data?.auditContext);

    const session = await getCloudPulseSession();
    const isDemoMode = isPulseAdvisorDemoMode({
      isEvaluator: isEvaluatorSession(session),
    });

    if (isDemoMode) {
      console.log(DEMO_MODE_NOTICE);
      return await streamAdvisorResponse({
        model: createMockAdvisorLanguageModel(auditContext),
        messages,
        auditContext,
      });
    }

    try {
      return await streamAdvisorResponse({
        model: anthropic(PULSE_ADVISOR_MODEL),
        messages,
        auditContext,
      });
    } catch (error) {
      if (isAnthropicFallbackError(error)) {
        console.error(
          'PulseAdvisor Anthropic error, falling back to deterministic DEMO mode',
          error,
        );
        console.log(DEMO_MODE_NOTICE);
        return await streamAdvisorResponse({
          model: createMockAdvisorLanguageModel(auditContext),
          messages,
          auditContext,
        });
      }

      throw error;
    }
  } catch (e: unknown) {
    console.error('PulseAdvisor chat handler error:', e);
    const message =
      e instanceof Error && e.message ? e.message : 'An internal error occurred.';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
