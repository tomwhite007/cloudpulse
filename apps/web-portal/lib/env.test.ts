import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

describe('parseEnv', () => {
  it('defaults the auditor API URL when the public var is missing', () => {
    expect(parseEnv({}).NEXT_PUBLIC_AUDITOR_API_URL).toBe('http://localhost:3000');
  });

  it('treats an empty public var as missing', () => {
    expect(parseEnv({ NEXT_PUBLIC_AUDITOR_API_URL: '' }).NEXT_PUBLIC_AUDITOR_API_URL).toBe(
      'http://localhost:3000',
    );
  });

  it('strips a trailing slash from a valid URL', () => {
    expect(
      parseEnv({
        NEXT_PUBLIC_AUDITOR_API_URL: 'https://auditor.example.com/',
      }).NEXT_PUBLIC_AUDITOR_API_URL,
    ).toBe('https://auditor.example.com');
  });

  it('rejects a non-URL public var', () => {
    expect(() => parseEnv({ NEXT_PUBLIC_AUDITOR_API_URL: 'not-a-url' })).toThrow();
  });
});
