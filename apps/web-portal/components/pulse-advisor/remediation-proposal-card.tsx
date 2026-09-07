import { useDashboardStore } from '../../features/dashboard/store/dashboard-store';
import { CheckCircle } from 'lucide-react';
import { useState } from 'react';

export interface RemediationProposalProps {
  resourceId: string;
  resourceName: string;
  monthlySavings: number;
  terraformPatchPreview: string;
  actionType: string;
  actionLabel: string;
}

export function RemediationProposalCard({
  resourceId,
  resourceName,
  monthlySavings,
  terraformPatchPreview,
  actionLabel
}: RemediationProposalProps) {
  const queueRemediation = useDashboardStore(state => state.queueRemediation);
  const [isApproved, setIsApproved] = useState(false);

  const handleApprove = () => {
    queueRemediation(resourceId);
    setIsApproved(true);
  };

  return (
    <div className="my-4 rounded-xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur-md transition-all duration-300">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-lg font-medium text-white">{actionLabel}</h4>
        <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-300">
          Save ${monthlySavings}/mo
        </span>
      </div>
      <div className="mb-4 text-sm text-zinc-300">
        <span className="font-semibold text-white">Target Resource:</span> {resourceName}
      </div>
      
      <div className="mb-4 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900">
        <div className="border-b border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400">
          Terraform Patch Preview
        </div>
        <pre className="overflow-x-auto p-3 text-xs text-zinc-300">
          <code>{terraformPatchPreview}</code>
        </pre>
      </div>

      <div className="flex justify-end">
        {isApproved ? (
          <button
            disabled
            className="flex items-center gap-2 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400 transition-colors"
          >
            <CheckCircle className="size-4" />
            Queued for Next Plan
          </button>
        ) : (
          <button
            onClick={handleApprove}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 transition-all active:scale-95"
          >
            Approve & Apply
          </button>
        )}
      </div>
    </div>
  );
}
