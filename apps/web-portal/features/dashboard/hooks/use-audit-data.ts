import { useQuery } from '@tanstack/react-query';
import { fetchAuditSummary, fetchAuditStatus, type AuditApiDeps } from '../utils/audit-api';

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
    retry: false,
  });
}

export function useAuditSummary(deps?: AuditApiDeps) {
  return useQuery({
    queryKey: auditKeys.summary(),
    queryFn: () => fetchAuditSummary(deps),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: false,
  });
}
