'use client';

import {
  MOCK_COST_AUDIT_SUMMARY,
  type RemediationRequestDto,
} from '@cloudpulse/api-contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDashboardStore } from '../store/dashboard-store';
import { fetchAuditSummary, postRemediation } from '../utils/audit-api';
import { auditKeys } from '../utils/audit-keys';

export function useAuditSummary() {
  const mode = useDashboardStore((state) => state.mode);

  return useQuery({
    queryKey: auditKeys.summary(mode),
    queryFn: () => fetchAuditSummary(mode),
    placeholderData: mode === 'SIMULATED' ? MOCK_COST_AUDIT_SUMMARY : undefined,
  });
}

export function useRemediateResource() {
  const queryClient = useQueryClient();
  const mode = useDashboardStore((state) => state.mode);

  return useMutation({
    mutationFn: (request: RemediationRequestDto) =>
      postRemediation(request, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: auditKeys.summaries() });
    },
  });
}
