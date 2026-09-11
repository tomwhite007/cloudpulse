import { MOCK_COST_AUDIT_SUMMARY } from '@cloudpulse/api-contracts/mocks';
import { describe, expect, it } from 'vitest';
import {
  advisorChatEndpoint,
  auditChatBody,
  createAdvisorChatFetch,
  createAdvisorChatTransport,
  mergeAuditContextIntoChatBody,
} from '../utils/advisor-chat';

describe('advisorChatEndpoint', () => {
  it('uses the Next.js chat route by default', () => {
    expect(advisorChatEndpoint()).toBe('/api/chat');
  });

  it('prefers an explicit chat URL', () => {
    expect(advisorChatEndpoint({ chatUrl: 'https://portal.test/chat' })).toBe(
      'https://portal.test/chat',
    );
  });
});

describe('auditChatBody', () => {
  it('places context at both body.auditContext and body.data.auditContext', () => {
    expect(auditChatBody(MOCK_COST_AUDIT_SUMMARY)).toEqual({
      auditContext: MOCK_COST_AUDIT_SUMMARY,
      data: { auditContext: MOCK_COST_AUDIT_SUMMARY },
    });
  });
});

describe('mergeAuditContextIntoChatBody', () => {
  it('injects live findings without dropping messages', () => {
    const merged = JSON.parse(
      mergeAuditContextIntoChatBody(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Find zombie storage' }],
          data: { sessionId: 'abc' },
        }),
        MOCK_COST_AUDIT_SUMMARY,
      ),
    );

    expect(merged.messages).toEqual([
      { role: 'user', content: 'Find zombie storage' },
    ]);
    expect(merged.auditContext).toEqual(MOCK_COST_AUDIT_SUMMARY);
    expect(merged.data).toEqual({
      sessionId: 'abc',
      auditContext: MOCK_COST_AUDIT_SUMMARY,
    });
  });

  it('replaces a non-object data field with the audit context', () => {
    const merged = JSON.parse(
      mergeAuditContextIntoChatBody(
        JSON.stringify({ data: ['stale'] }),
        MOCK_COST_AUDIT_SUMMARY,
      ),
    );

    expect(merged.data).toEqual({
      auditContext: MOCK_COST_AUDIT_SUMMARY,
    });
  });
});

describe('createAdvisorChatFetch', () => {
  it('rewrites JSON POST bodies with the latest audit context', async () => {
    let received: RequestInit | undefined;
    const fetchImpl: typeof fetch = async (_input, init) => {
      received = init;
      return new Response('ok');
    };

    const chatFetch = createAdvisorChatFetch(
      () => MOCK_COST_AUDIT_SUMMARY,
      fetchImpl,
    );

    await chatFetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: [] }),
    });

    expect(received?.body).toBe(
      mergeAuditContextIntoChatBody(
        JSON.stringify({ messages: [] }),
        MOCK_COST_AUDIT_SUMMARY,
      ),
    );
  });

  it('passes non-JSON bodies through unchanged', async () => {
    let received: RequestInit | undefined;
    const fetchImpl: typeof fetch = async (_input, init) => {
      received = init;
      return new Response('ok');
    };

    const chatFetch = createAdvisorChatFetch(
      () => MOCK_COST_AUDIT_SUMMARY,
      fetchImpl,
    );

    await chatFetch('/api/chat', {
      method: 'POST',
      body: '{not-json',
    });

    expect(received?.body).toBe('{not-json');
  });

  it('leaves requests without a JSON body untouched', async () => {
    let received: RequestInit | undefined;
    const fetchImpl: typeof fetch = async (_input, init) => {
      received = init;
      return new Response('ok');
    };

    const chatFetch = createAdvisorChatFetch(
      () => MOCK_COST_AUDIT_SUMMARY,
      fetchImpl,
    );

    await chatFetch('/api/chat', { method: 'GET' });

    expect(received).toEqual({ method: 'GET' });
  });
});

describe('createAdvisorChatTransport', () => {
  it('builds a DefaultChatTransport against the chat endpoint', () => {
    const transport = createAdvisorChatTransport(() => MOCK_COST_AUDIT_SUMMARY, {
      chatUrl: 'https://portal.test/chat',
      fetchImpl: async () => new Response('ok'),
    });

    expect(transport).toBeDefined();
    expect(typeof transport.sendMessages).toBe('function');
  });
});
