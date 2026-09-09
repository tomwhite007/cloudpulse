export type AdvisorMessageLike = {
  content?: unknown;
  parts?: Array<{ type?: string; text?: string }>;
};

export function advisorMessageMarkdown(message: AdvisorMessageLike): string {
  const fromParts = (message.parts ?? [])
    .filter((part) => part.type === 'text')
    .map((part) => part.text ?? '')
    .join('');

  if (fromParts.length > 0) {
    return fromParts;
  }

  return typeof message.content === 'string' ? message.content : '';
}
