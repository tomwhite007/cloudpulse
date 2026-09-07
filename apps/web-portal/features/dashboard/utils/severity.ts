import type { ResourceStatusCardDto } from '@cloudpulse/api-contracts';

export interface SeverityStyle {
  badge: string;
  bar: string;
  label: string;
}

export const SEVERITY_STYLES: Record<
  ResourceStatusCardDto['status'],
  SeverityStyle
> = {
  OVER_PROVISIONED: {
    badge: 'border-amber-400/40 bg-amber-500/15 text-amber-300',
    bar: 'bg-amber-400',
    label: 'Warning',
  },
  ZOMBIE: {
    badge: 'border-rose-400/40 bg-rose-500/15 text-rose-300',
    bar: 'bg-rose-400',
    label: 'Critical',
  },
  IDLE: {
    badge: 'border-sky-400/40 bg-sky-500/15 text-sky-300',
    bar: 'bg-sky-300',
    label: 'Info',
  },
  HEALTHY: {
    badge: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300',
    bar: 'bg-emerald-400',
    label: 'Healthy',
  },
};

export function getSeverityStyle(
  status: ResourceStatusCardDto['status'],
): SeverityStyle {
  return SEVERITY_STYLES[status];
}
