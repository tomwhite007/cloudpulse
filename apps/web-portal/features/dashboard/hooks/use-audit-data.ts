'use client';

import type { RemediationRequestDto } from '@cloudpulse/api-contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchAuditSummary,
  fetchAuditStatus,
  postRemediation,
  type AuditApiDeps,
} from '../utils/audit-api';

export const auditKeys = {
  all: ['audit'] as const,
  summary: () => [...auditKeys.all, 'summary'] as const,
  status: () => [...auditKeys.all, 'status'] as const,
};

export function useAuditStatus(deps?: AuditApiDeps) {
  return useQuery({
    queryKey: auditKeys.status(),
    queryFn: () => fetchAuditStatus(deps),
    refetchInterval: 30000,
  });
}

export function useAuditSummary(deps?: AuditApiDeps) {
  return useQuery({
    queryKey: auditKeys.summary(),
    queryFn: () => fetchAuditSummary(deps),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
}

export function useRemediateResource(deps?: AuditApiDeps) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { resourceId: string; actionId: string }) =>
      postRemediation(variables, deps),
    onSuccess: () => {
      // Refresh the audit summary after a successful remediation queue
      void queryClient.invalidateQueries({
        queryKey: auditKeys.summary(),
      });
    },
  });
}
