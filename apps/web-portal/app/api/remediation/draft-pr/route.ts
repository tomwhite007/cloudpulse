import {
  createGitHubRemediationPr,
  draftPrRequestSchema,
  isGitFlowDemoMode,
  SIMULATED_DRAFT_PR,
} from '@cloudpulse/gitflow';
import { NextResponse } from 'next/server';

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

    if (isGitFlowDemoMode(process.env)) {
      return NextResponse.json(SIMULATED_DRAFT_PR);
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
