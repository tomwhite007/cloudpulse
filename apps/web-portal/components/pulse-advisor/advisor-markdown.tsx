'use client';

import type { Components } from 'react-markdown';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h3 className="mt-3 mb-2 text-base font-semibold text-white first:mt-0">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="mt-3 mb-2 text-base font-semibold text-white first:mt-0">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="mt-3 mb-1.5 text-sm font-semibold text-white first:mt-0">{children}</h4>
  ),
  p: ({ children }) => <p className="mb-2 leading-relaxed last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }) => <em className="italic text-zinc-100">{children}</em>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-blue-400 underline underline-offset-2 hover:text-blue-300"
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-blue-500/40 pl-3 text-zinc-400 last:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-white/10" />,
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded-lg border border-zinc-700 bg-zinc-950 p-3 last:mb-0">
      {children}
    </pre>
  ),
  code: ({ className, children }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return <code className="font-mono text-xs text-emerald-400">{children}</code>;
    }

    return (
      <code className="rounded bg-zinc-950 px-1.5 py-0.5 font-mono text-xs text-emerald-300">
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full min-w-[20rem] border-collapse text-left text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-zinc-950/80 text-zinc-300">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-white/10 px-2.5 py-1.5 font-semibold whitespace-nowrap">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-white/5 px-2.5 py-1.5 align-top text-zinc-300">{children}</td>
  ),
};

export function AdvisorMarkdown({ children }: { children: string }) {
  if (!children.trim()) {
    return null;
  }

  return (
    <div className="advisor-markdown">
      <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {children}
      </Markdown>
    </div>
  );
}
