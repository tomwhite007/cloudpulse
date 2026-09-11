import { useDashboardStore } from '../../features/dashboard/store/dashboard-store';
import { CheckCircle, GitBranch, Loader2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { DraftPrResponse } from '@cloudpulse/gitflow';
import type { RemediationProposal } from '../../features/dashboard/utils/pulse-advisor-tools';

type DraftState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; prNumber: number; prUrl: string };

export function RemediationProposalCard({
  resourceId,
  resourceName,
  monthlySavingsUsd,
  hclDiff,
  actionType,
  branchName,
  commitMessage,
  safetyChecks,
  isSimulated,
}: RemediationProposal) {
  const queueRemediation = useDashboardStore((state) => state.queueRemediation);
  const [draftState, setDraftState] = useState<DraftState>({ status: 'idle' });

  const handleApprove = async () => {
    if (draftState.status === 'loading') {
      return;
    }

    setDraftState({ status: 'loading' });

    try {
      const response = await fetch('/api/remediation/draft-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId,
          resourceName,
          actionType,
          branchName,
          commitMessage,
          hclDiff,
          monthlySavingsUsd,
        }),
      });

      const payload = (await response.json()) as DraftPrResponse & {
        error?: string;
      };

      if (!response.ok || !payload.success || !payload.prUrl) {
        throw new Error(payload.error || 'Failed to create draft pull request');
      }

      queueRemediation(resourceId, {
        prNumber: payload.prNumber,
        prUrl: payload.prUrl,
      });
      setDraftState({
        status: 'success',
        prNumber: payload.prNumber,
        prUrl: payload.prUrl,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create draft pull request';
      toast.error(message);
      setDraftState({ status: 'idle' });
    }
  };

  return (
    <div className="my-4 rounded-xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur-md transition-all duration-300">
      {isSimulated && (
        <div className="mb-3 inline-flex items-center rounded bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">
          SIMULATED PROPOSAL (MOCK)
        </div>
      )}
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-lg font-medium text-white">{commitMessage}</h4>
        <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-300">
          +${monthlySavingsUsd}/mo
        </span>
      </div>

      <div className="mb-4 flex flex-col gap-2 text-sm text-zinc-300">
        <div>
          <span className="font-semibold text-white">Target Resource:</span> {resourceName}
        </div>
        {branchName && (
          <div className="flex items-center gap-2">
            <GitBranch className="size-4 text-blue-400" />
            <code className="rounded bg-blue-500/20 px-1.5 py-0.5 text-xs text-blue-300">
              git checkout -b {branchName}
            </code>
          </div>
        )}
      </div>

      {safetyChecks && safetyChecks.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {safetyChecks.map((check, idx) => (
            <span
              key={idx}
              className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300"
            >
              <ShieldCheck className="size-3" />
              {check}
            </span>
          ))}
        </div>
      )}

      <div className="mb-4 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900">
        <div className="border-b border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400">
          Terraform Patch Preview
        </div>
        <pre className="overflow-x-auto p-3 text-xs text-emerald-400 font-mono">
          <code>{hclDiff}</code>
        </pre>
      </div>

      <div className="flex justify-end">
        {draftState.status === 'success' ? (
          <a
            href={draftState.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
          >
            <CheckCircle className="size-4" />
            Open PR #{draftState.prNumber} ↗
          </a>
        ) : (
          <button
            onClick={() => {
              void handleApprove();
            }}
            disabled={draftState.status === 'loading'}
            aria-busy={draftState.status === 'loading'}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 transition-all active:scale-95 disabled:cursor-wait disabled:opacity-80"
          >
            {draftState.status === 'loading' ? (
              <>
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                Creating branch & PR...
              </>
            ) : (
              'Draft Pull Request'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
