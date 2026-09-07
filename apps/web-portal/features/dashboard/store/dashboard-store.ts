'use client';

import { create } from 'zustand';
import {
  isResourceTypeFilter,
  isStatusFilter,
  type AuditMode,
  type ResourceTypeFilter,
  type StatusFilter,
} from '../utils/filters';

export type { AuditMode, ResourceTypeFilter, StatusFilter };

interface DashboardStore {
  mode: AuditMode;
  selectedResourceType: ResourceTypeFilter;
  statusFilter: StatusFilter;
  queuedRemediations: string[];
  setMode: (mode: AuditMode) => void;
  toggleMode: () => void;
  setSelectedResourceType: (type: string) => void;
  setStatusFilter: (status: string) => void;
  queueRemediation: (resourceId: string) => void;
  removeQueuedRemediation: (resourceId: string) => void;
}

const initialChrome = {
  mode: 'SIMULATED' as AuditMode,
  selectedResourceType: 'ALL' as ResourceTypeFilter,
  statusFilter: 'all' as StatusFilter,
  queuedRemediations: [] as string[],
};

export const useDashboardStore = create<DashboardStore>((set) => ({
  ...initialChrome,
  setMode: (mode) => set({ mode }),
  toggleMode: () =>
    set((state) => ({
      mode: state.mode === 'SIMULATED' ? 'LIVE' : 'SIMULATED',
    })),
  setSelectedResourceType: (type) => {
    if (!isResourceTypeFilter(type)) {
      return;
    }
    set({ selectedResourceType: type });
  },
  setStatusFilter: (status) => {
    if (!isStatusFilter(status)) {
      return;
    }
    set({ statusFilter: status });
  },
  queueRemediation: (resourceId) =>
    set((state) => ({
      queuedRemediations: state.queuedRemediations.includes(resourceId)
        ? state.queuedRemediations
        : [...state.queuedRemediations, resourceId],
    })),
  removeQueuedRemediation: (resourceId) =>
    set((state) => ({
      queuedRemediations: state.queuedRemediations.filter(
        (id) => id !== resourceId,
      ),
    })),
}));

export function resetDashboardStore() {
  useDashboardStore.setState({ ...initialChrome });
}
