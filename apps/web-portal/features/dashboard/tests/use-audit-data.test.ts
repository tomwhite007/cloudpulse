import { QueryClient } from '@tanstack/react-query';
import { MOCK_COST_AUDIT_SUMMARY } from '@cloudpulse/api-contracts/mocks';
import { describe, expect, it } from 'vitest';
import {
  applyEvaluatorSessionChange,
  auditKeys,
  evaluatorKeys,
} from '../hooks/use-audit-data';

describe('applyEvaluatorSessionChange', () => {
  it('clears cached audit data and the evaluator session', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(evaluatorKeys.session(), { isEvaluator: false });
    queryClient.setQueryData(auditKeys.summary(), MOCK_COST_AUDIT_SUMMARY);
    queryClient.setQueryData(auditKeys.status(), { mode: 'SIMULATED' });

    await applyEvaluatorSessionChange(queryClient);

    expect(queryClient.getQueryData(evaluatorKeys.session())).toBeUndefined();
    expect(queryClient.getQueryData(auditKeys.summary())).toBeUndefined();
    expect(queryClient.getQueryData(auditKeys.status())).toBeUndefined();
  });
});
