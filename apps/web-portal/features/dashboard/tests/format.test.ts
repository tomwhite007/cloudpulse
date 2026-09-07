import { describe, expect, it } from 'vitest';
import { formatInteger, formatUsd } from '../utils/format';

describe('formatUsd', () => {
  it('formats a whole dollar amount with two fraction digits', () => {
    expect(formatUsd(2100)).toBe('$2,100.00');
  });

  it('formats cents', () => {
    expect(formatUsd(18420.75)).toBe('$18,420.75');
  });

  it('formats zero', () => {
    expect(formatUsd(0)).toBe('$0.00');
  });
});

describe('formatInteger', () => {
  it('groups thousands', () => {
    expect(formatInteger(12840)).toBe('12,840');
  });

  it('formats zero', () => {
    expect(formatInteger(0)).toBe('0');
  });
});
