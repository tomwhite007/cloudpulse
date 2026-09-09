import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdvisorMarkdown } from '../../../components/pulse-advisor/advisor-markdown';

describe('AdvisorMarkdown', () => {
  it('renders GFM tables, bold text, and inline code', () => {
    render(
      <AdvisorMarkdown>
        {`Found **1 zombie** volume \`vol-1\`

| Resource | Status |
| --- | --- |
| vol-1 | ZOMBIE |
`}
      </AdvisorMarkdown>,
    );

    expect(screen.getByText('1 zombie')).toBeDefined();
    expect(screen.getByText('vol-1', { selector: 'code' })).toBeDefined();
    expect(screen.getByRole('table')).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Resource' })).toBeDefined();
    expect(screen.getByRole('cell', { name: 'ZOMBIE' })).toBeDefined();
  });

  it('renders a markdown list', () => {
    render(
      <AdvisorMarkdown>
        {`- Unattached
- Zero I/O`}
      </AdvisorMarkdown>,
    );

    expect(screen.getByRole('list')).toBeDefined();
    expect(screen.getByText('Unattached')).toBeDefined();
  });
});
