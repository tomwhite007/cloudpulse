'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useEffect, useRef } from 'react';
import { useDashboardStore } from '../../features/dashboard/store/dashboard-store';
import { useAuditSummary } from '../../features/dashboard/hooks/use-audit-data';
import { Send, Bot, Loader2, CheckCircle, RefreshCcw } from 'lucide-react';
import { RemediationProposalCard } from './remediation-proposal-card';

export function PulseAdvisor() {
  const auditSummary = useAuditSummary();
  const { messages, status, sendMessage, setMessages } = useChat({
    api: '/api/chat',
    body: { auditContext: auditSummary.data },
  } as any) as any;
  const isLoading = status === 'submitted' || status === 'streaming';
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const advisorPrompt = useDashboardStore(state => state.advisorPrompt);
  const triggerAdvisorPrompt = useDashboardStore(state => state.triggerAdvisorPrompt);
  const setReviewingRemediation = useDashboardStore(state => state.setReviewingRemediation);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, status]);

  useEffect(() => {
    if (advisorPrompt) {
      void sendMessage({ role: 'user', content: advisorPrompt.prompt });
      if (advisorPrompt.resource) {
        setReviewingRemediation(advisorPrompt.resource.id);
      }
      triggerAdvisorPrompt(null);
    }
  }, [advisorPrompt, sendMessage, triggerAdvisorPrompt, setReviewingRemediation]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value);
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    void sendMessage({ role: 'user', content: input });
    setInput('');
  };

  const promptPills = [
    "Find zombie storage",
    "How can I cut $2k?",
    "Review RDS spend"
  ];

  const onPillClick = (prompt: string) => {
    void sendMessage({ role: 'user', content: prompt });
  };

  const handleReset = () => {
    setMessages([]);
  };

  return (
    <div role="complementary" aria-label="PulseAdvisor AI Assistant" className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-3 border-b border-white/10 p-4">
        <div className="flex size-8 items-center justify-center rounded-full bg-blue-600/20 text-blue-400">
          <Bot className="size-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-white">PulseAdvisor</h2>
          <p className="text-xs text-zinc-400">FinOps Generative UI Copilot</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-800/50 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white focus:outline-none"
            aria-label="Clear chat"
          >
            <RefreshCcw className="size-3.5" />
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-zinc-700">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-zinc-400">
            <Bot className="mb-4 size-12 opacity-50" />
            <p className="max-w-[250px] text-sm">
              I can analyze your cloud waste and help you automatically remediate it. How can I help today?
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {(messages || []).map((m: any) => (
              <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role !== 'user' && (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-blue-400">
                    <Bot className="size-5" />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  m.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-sm' 
                    : 'bg-zinc-800/80 text-zinc-200 rounded-tl-sm border border-white/5'
                }`}>
                  {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
                  
                  {/* Handle Tool Invocations */}
                  {(m.parts || m.toolInvocations || [])?.map((partOrTool: any, index: number) => {
                    let toolName = partOrTool.toolName;
                    let toolPayload = partOrTool;

                    if (partOrTool.type?.startsWith('tool-')) {
                      toolName = partOrTool.type.replace('tool-', '');
                      toolPayload = partOrTool;
                    } else if (partOrTool.type === 'tool-invocation') {
                      toolPayload = partOrTool.toolInvocation;
                      toolName = toolPayload.toolName;
                    }
                    
                    const toolCallId = toolPayload.toolCallId || index;
                    
                    if (toolName === 'propose_terraform_remediation_pr') {
                      const outputData = toolPayload.output || toolPayload.result;
                      if (outputData) {
                        return <RemediationProposalCard key={toolCallId} {...outputData} />;
                      }
                      return (
                        <div key={toolCallId} className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
                          <Loader2 className="size-3 animate-spin" />
                          Generating remediation proposal...
                        </div>
                      );
                    }
                    
                    if (toolName === 'inspectWasteSummary') {
                      const outputData = toolPayload.output || toolPayload.result;
                      return (
                        <div key={toolCallId} className="mt-2 flex items-center gap-2 rounded-md bg-zinc-900/50 p-2 text-xs text-zinc-400 border border-white/5">
                          {outputData ? (
                            <CheckCircle className="size-3 text-emerald-400" />
                          ) : (
                            <Loader2 className="size-3 animate-spin" />
                          )}
                          {outputData ? 'Analyzed Waste Summary' : 'Analyzing Waste Summary...'}
                        </div>
                      );
                    }
                    
                    return null;
                  })}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex items-center gap-3">
                 <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-blue-400">
                    <Bot className="size-5" />
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-zinc-800/80 px-4 py-4 border border-white/5">
                    <div className="size-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.3s]"></div>
                    <div className="size-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.15s]"></div>
                    <div className="size-1.5 animate-bounce rounded-full bg-zinc-500"></div>
                  </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-white/10 bg-zinc-950/50 p-4 backdrop-blur-md">
        {messages.length === 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {promptPills.map((pill) => (
              <button
                key={pill}
                onClick={() => onPillClick(pill)}
                className="rounded-full border border-white/10 bg-zinc-800/50 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white focus:outline-none"
              >
                {pill}
              </button>
            ))}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            id="advisor-input"
            name="advisor-input"
            type="text"
            value={input || ''}
            onChange={handleInputChange}
            placeholder="Ask about your infrastructure waste..."
            className="w-full rounded-xl border border-white/10 bg-zinc-900 py-3 pl-4 pr-12 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !(input || '').trim()}
            className="absolute right-2 flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600"
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
