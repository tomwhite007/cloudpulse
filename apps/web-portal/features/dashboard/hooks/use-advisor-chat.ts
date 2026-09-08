'use client';

import { useChat } from '@ai-sdk/react';
import { useCallback, useRef } from 'react';
import {
  auditChatBody,
  createAdvisorChatTransport,
} from '../utils/advisor-chat';
import { useAuditSummary } from './use-audit-data';

export function useAdvisorChat() {
  const auditSummary = useAuditSummary();
  const auditContextRef = useRef(auditSummary.data);
  auditContextRef.current = auditSummary.data;

  const transportRef = useRef<ReturnType<
    typeof createAdvisorChatTransport
  > | null>(null);
  if (transportRef.current === null) {
    transportRef.current = createAdvisorChatTransport(
      () => auditContextRef.current,
    );
  }

  const { messages, status, sendMessage, setMessages } = useChat({
    transport: transportRef.current,
  });

  const sendAdvisorMessage = useCallback(
    (content: string) => {
      void sendMessage(
        { role: 'user', content } as never,
        { body: auditChatBody(auditContextRef.current) },
      );
    },
    [sendMessage],
  );

  return {
    messages,
    status,
    isLoading: status === 'submitted' || status === 'streaming',
    setMessages,
    sendAdvisorMessage,
    auditSummary,
  };
}
