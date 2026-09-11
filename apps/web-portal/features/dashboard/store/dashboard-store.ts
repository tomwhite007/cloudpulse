'use client';

import { create } from 'zustand';
import type { ResourceStatusCardDto } from '@cloudpulse/api-contracts';
import {
  isResourceTypeFilter,
  isStatusFilter,
  type AuditMode,
  type ResourceTypeFilter,
  type StatusFilter,
} from '../utils/filters';

export type { AuditMode, ResourceTypeFilter, StatusFilter };

export type QueuedRemediationPr = {
  prNumber: number;
  prUrl: string;
};

export type AdvisorPrompt = {
  prompt: string;
  resource?: ResourceStatusCardDto;
};

interface DashboardStore {
  selectedResourceType: ResourceTypeFilter;
  statusFilter: StatusFilter;
  queuedRemediations: string[];
  queuedRemediationPrs: Record<string, QueuedRemediationPr>;
  reviewingRemediations: string[];
  advisorPrompt: AdvisorPrompt | null;
  setSelectedResourceType: (type: string) => void;
  setStatusFilter: (status: string) => void;
  queueRemediation: (resourceId: string, pr?: QueuedRemediationPr) => void;
  removeQueuedRemediation: (resourceId: string) => void;
  setReviewingRemediation: (resourceId: string) => void;
  removeReviewingRemediation: (resourceId: string) => void;
  triggerAdvisorPrompt: (
    prompt: string | null,
    resource?: ResourceStatusCardDto,
  ) => void;
}

const initialChrome = {
  selectedResourceType: 'ALL' as ResourceTypeFilter,
  statusFilter: 'all' as StatusFilter,
  queuedRemediations: [] as string[],
  queuedRemediationPrs: {} as Record<string, QueuedRemediationPr>,
  reviewingRemediations: [] as string[],
  advisorPrompt: null as AdvisorPrompt | null,
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
  queueRemediation: (resourceId, pr) =>
    set((state) => ({
      queuedRemediations: state.queuedRemediations.includes(resourceId)
        ? state.queuedRemediations
        : [...state.queuedRemediations, resourceId],
      queuedRemediationPrs: pr
        ? { ...state.queuedRemediationPrs, [resourceId]: pr }
        : state.queuedRemediationPrs,
    })),
  removeQueuedRemediation: (resourceId) =>
    set((state) => {
      const nextPrs = { ...state.queuedRemediationPrs };
      delete nextPrs[resourceId];
      return {
        queuedRemediations: state.queuedRemediations.filter(
          (id) => id !== resourceId,
        ),
        queuedRemediationPrs: nextPrs,
      };
    }),
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
