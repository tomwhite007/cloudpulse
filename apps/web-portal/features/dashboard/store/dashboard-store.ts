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
  selectedResourceType: ResourceTypeFilter;
  statusFilter: StatusFilter;
  queuedRemediations: string[];
  reviewingRemediations: string[];
  advisorPrompt: { prompt: string; resource?: any } | null;
  setSelectedResourceType: (type: string) => void;
  setStatusFilter: (status: string) => void;
  queueRemediation: (resourceId: string) => void;
  removeQueuedRemediation: (resourceId: string) => void;
  setReviewingRemediation: (resourceId: string) => void;
  removeReviewingRemediation: (resourceId: string) => void;
  triggerAdvisorPrompt: (prompt: string | null, resource?: any) => void;
}

const initialChrome = {
  selectedResourceType: 'ALL' as ResourceTypeFilter,
  statusFilter: 'all' as StatusFilter,
  queuedRemediations: [] as string[],
  reviewingRemediations: [] as string[],
  advisorPrompt: null as { prompt: string; resource?: any } | null,
};

export const useDashboardStore = create<DashboardStore>((set) => ({
  ...initialChrome,
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
  setReviewingRemediation: (resourceId) =>
    set((state) => ({
      reviewingRemediations: state.reviewingRemediations.includes(resourceId)
        ? state.reviewingRemediations
        : [...state.reviewingRemediations, resourceId],
    })),
  removeReviewingRemediation: (resourceId) =>
    set((state) => ({
      reviewingRemediations: state.reviewingRemediations.filter(
        (id) => id !== resourceId,
      ),
    })),
  triggerAdvisorPrompt: (prompt, resource) => 
    set({ advisorPrompt: prompt ? { prompt, resource } : null }),
}));

export function resetDashboardStore() {
  useDashboardStore.setState({ ...initialChrome });
}
