import { QueryProvider } from '@/components/providers/query-provider';
import { act, fireEvent, render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, vi } from 'vitest';
import { resetDashboardStore } from '../store/dashboard-store';

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
  });
}

export function setupPresenterTest() {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new Error('offline'))),
  );
  resetDashboardStore();
}

export function teardownPresenterTest() {
  vi.unstubAllGlobals();
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
