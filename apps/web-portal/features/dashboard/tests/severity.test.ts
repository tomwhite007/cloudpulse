import { describe, expect, it } from 'vitest';
import { getSeverityStyle, SEVERITY_STYLES } from '../utils/severity';

describe('getSeverityStyle', () => {
  it('returns the warning style for over-provisioned resources', () => {
    expect(getSeverityStyle('OVER_PROVISIONED')).toEqual(
      SEVERITY_STYLES.OVER_PROVISIONED,
    );
    expect(getSeverityStyle('OVER_PROVISIONED').label).toBe('Warning');
  });

  it('returns the critical style for zombie resources', () => {
    expect(getSeverityStyle('ZOMBIE').label).toBe('Critical');
    expect(getSeverityStyle('ZOMBIE').bar).toBe('bg-rose-400');
  });

  it('returns the info style for idle resources', () => {
    expect(getSeverityStyle('IDLE').label).toBe('Info');
  });

  it('returns the healthy style for healthy resources', () => {
    expect(getSeverityStyle('HEALTHY').label).toBe('Healthy');
    expect(getSeverityStyle('HEALTHY').badge).toContain('emerald');
  });
});
