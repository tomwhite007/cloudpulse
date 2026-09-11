import {
  createGitHubRemediationPr,
  draftPrRequestSchema,
  isGitFlowDemoMode,
} from '@cloudpulse/gitflow';
import { MOCK_DRAFT_PR } from '@cloudpulse/gitflow/mocks';
import { NextResponse } from 'next/server';
import { fetchAuditStatus } from '@/features/dashboard/utils/audit-api';

const DEMO_MODE_NOTICE =
  'GitFlow draft PR running in deterministic DEMO mode; skipping GitHub';

export async function POST(req: Request) {
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

    const auditorStatus = await fetchAuditStatus();
    if (
      isGitFlowDemoMode({
        githubToken: process.env.GITHUB_TOKEN,
        demoMode: process.env.DEMO_MODE,
        auditorMode: auditorStatus.mode,
      })
    ) {
      console.log(DEMO_MODE_NOTICE);
      return NextResponse.json(MOCK_DRAFT_PR);
    }

    const result = await createGitHubRemediationPr(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create draft pull request';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
