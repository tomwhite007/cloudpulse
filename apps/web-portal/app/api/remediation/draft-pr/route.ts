import { CostAuditSummarySchema } from '@cloudpulse/api-contracts';
import {
  createGitHubRemediationPr,
  draftPrRequestSchema,
  isGitFlowDemoMode,
} from '@cloudpulse/gitflow';
import { MOCK_DRAFT_PR } from '@cloudpulse/gitflow/mocks';
import { NextResponse } from 'next/server';
import { auditorApiBaseUrl, REQUEST_TIMEOUT_MS } from '@/features/dashboard/utils/audit-api';
import { getCloudPulseSession, isEvaluatorSession } from '@/lib/session';

const DEMO_MODE_NOTICE = 'GitFlow draft PR running in deterministic DEMO mode; skipping GitHub';

export interface DraftPrRouteDeps {
  fetchImpl?: typeof fetch;
  getSession?: typeof getCloudPulseSession;
}

export async function fetchActiveResourceIds(fetchImpl: typeof fetch = fetch): Promise<string[]> {
  const response = await fetchImpl(`${auditorApiBaseUrl({ isBrowser: false })}/api/audit/summary`, {
    headers: { 'x-cloudpulse-mode': 'live' },
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Live audit request failed with status ${response.status}`);
  }

  const summary = CostAuditSummarySchema.parse(await response.json());
  return [...new Set(summary.resources.map((resource) => resource.id))];
}

export async function postDraftPr(req: Request, deps: DraftPrRouteDeps = {}) {
  try {
    const body: unknown = await req.json();
    const parsed = draftPrRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid draft PR payload',
          issues: parsed.error.issues.map((issue) => issue.message),
        },
        { status: 400 },
      );
    }

    const getSession = deps.getSession ?? getCloudPulseSession;
    const session = await getSession();
    if (
      isGitFlowDemoMode({
        githubToken: process.env.GITHUB_TOKEN,
        demoMode: process.env.DEMO_MODE,
        isEvaluator: isEvaluatorSession(session),
      })
    ) {
      console.log(DEMO_MODE_NOTICE);
      return NextResponse.json(MOCK_DRAFT_PR);
    }

    let activeResourceIds: string[] | undefined;
    try {
      activeResourceIds = await fetchActiveResourceIds(deps.fetchImpl);
    } catch {
      activeResourceIds = undefined;
    }

    const result = await createGitHubRemediationPr({
      ...parsed.data,
      activeResourceIds,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create draft pull request';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return postDraftPr(req);
}
