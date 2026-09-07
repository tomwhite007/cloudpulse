import { describe, expect, it } from 'vitest';
import { auditKeys } from '../utils/audit-keys';

describe('auditKeys', () => {
  it('nests summary keys under a shared summaries prefix', () => {
    expect(auditKeys.all).toEqual(['audit']);
    expect(auditKeys.summaries()).toEqual(['audit', 'summary']);
    expect(auditKeys.summary('SIMULATED')).toEqual([
      'audit',
      'summary',
      'SIMULATED',
    ]);
    expect(auditKeys.summary('LIVE')).toEqual(['audit', 'summary', 'LIVE']);
  });

  it('keeps invalidation tuples as a prefix of per-mode keys', () => {
    const summaries = auditKeys.summaries();
    const simulated = auditKeys.summary('SIMULATED');
    expect(simulated.slice(0, summaries.length)).toEqual(summaries);
  });
});
