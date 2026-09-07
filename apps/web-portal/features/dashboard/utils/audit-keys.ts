import type { AuditMode } from './filters';

export const auditKeys = {
  all: ['audit'] as const,
  summaries: () => [...auditKeys.all, 'summary'] as const,
  summary: (mode: AuditMode) => [...auditKeys.summaries(), mode] as const,
};
