import { describe, expect, it } from 'vitest';
import { advisorMessageMarkdown } from '../utils/advisor-markdown';

describe('advisorMessageMarkdown', () => {
  it('joins streamed text parts so markdown tables stay intact', () => {
    expect(
      advisorMessageMarkdown({
        content: '',
        parts: [
          { type: 'text', text: '| Resource | Status |\n' },
          { type: 'text', text: '| --- | --- |\n| `vol-1` | ZOMBIE |\n' },
        ],
      }),
    ).toBe('| Resource | Status |\n| --- | --- |\n| `vol-1` | ZOMBIE |\n');
  });

  it('falls back to message.content when there are no text parts', () => {
    expect(
      advisorMessageMarkdown({
        content: '**Terminate** the unattached volume.',
        parts: [{ type: 'tool-proposeTerraformRemediation' }],
      }),
    ).toBe('**Terminate** the unattached volume.');
  });

  it('returns an empty string when the message has no text', () => {
    expect(advisorMessageMarkdown({ parts: [] })).toBe('');
  });
});
