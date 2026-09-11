import { QueryProvider } from '@/components/providers/query-provider';
import { act, fireEvent, render } from '@testing-library/react';
import axe from 'axe-core';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, expect, vi } from 'vitest';
import { resetDashboardStore } from '../store/dashboard-store';

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
  });
}

function formatAxeViolations(violations: axe.Result[]) {
  return violations
    .map((violation) => {
      const nodes = violation.nodes.map((node) => `  ${node.target.join(', ')}`).join('\n');
      return `${violation.id} (${violation.impact}): ${violation.help}\n${nodes}`;
    })
    .join('\n\n');
}

export async function assertNoAxeViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa'],
    },
    rules: {
      'color-contrast': { enabled: false },
    },
  });

  expect(results.violations, formatAxeViolations(results.violations)).toEqual([]);
}

export function setupPresenterTest() {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new Error('offline'))),
  );
  HTMLElement.prototype.scrollIntoView = vi.fn();
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  resetDashboardStore();
}

export function teardownPresenterTest() {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetDashboardStore();
}

export async function renderPresenter(ui: ReactElement) {
  const view = render(<QueryProvider>{ui}</QueryProvider>);
  await flushMicrotasks();
  return view;
}

export async function clickControl(element: HTMLElement) {
  await act(async () => {
    fireEvent.click(element);
  });
  await flushMicrotasks();
}

export function usePresenterTestLifecycle() {
  beforeEach(setupPresenterTest);
  afterEach(teardownPresenterTest);
}
