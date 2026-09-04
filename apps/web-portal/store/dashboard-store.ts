'use client';

import type { ResourceStatusCardDto } from '@cloudpulse/api-contracts';
import { create } from 'zustand';

export type AuditMode = 'SIMULATED' | 'LIVE';
export type ResourceTypeFilter = 'ALL' | ResourceStatusCardDto['resourceType'];

const RESOURCE_TYPE_FILTERS: ResourceTypeFilter[] = [
  'ALL',
  'RDS',
  'EBS',
  'ECS',
  'EC2',
  'LAMBDA',
];

function isResourceTypeFilter(value: string): value is ResourceTypeFilter {
  return RESOURCE_TYPE_FILTERS.includes(value as ResourceTypeFilter);
}

interface DashboardStore {
  mode: AuditMode;
  selectedResourceType: ResourceTypeFilter;
  queuedRemediations: string[];
  setMode: (mode: AuditMode) => void;
  toggleMode: () => void;
  setSelectedResourceType: (type: string) => void;
  queueRemediation: (resourceId: string) => void;
  removeQueuedRemediation: (resourceId: string) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  mode: 'SIMULATED',
  selectedResourceType: 'ALL',
  queuedRemediations: [],
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
