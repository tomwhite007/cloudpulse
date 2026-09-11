import { z } from 'zod';

export const RecommendedActionSchema = z.object({
  actionId: z.string(),
  label: z.string(),
  actionType: z.enum(['RESIZE', 'TERMINATE', 'SCHEDULE_SLEEP']),
  terraformPatchPreview: z.string(),
});

export const ResourceStatusCardSchema = z.object({
  id: z.string(),
  resourceName: z.string(),
  resourceType: z.enum(['RDS', 'EBS', 'ECS', 'EC2', 'LAMBDA']),
  status: z.enum(['HEALTHY', 'IDLE', 'OVER_PROVISIONED', 'ZOMBIE']),
  region: z.string(),
  monthlyCost: z.number(),
  potentialMonthlySavings: z.number(),
  telemetrySummary: z.string(),
  recommendedAction: RecommendedActionSchema,
});

export const SpendCategorySchema = z.object({
  serviceName: z.string(),
  amount: z.number(),
});

export const CostAuditSummarySchema = z.object({
  totalMonthlySpend: z.number(),
  currency: z.literal('USD'),
  totalIdentifiedWaste: z.number(),
  activeAssetCount: z.number(),
  complianceScorePercent: z.number(),
  spendByService: z.array(SpendCategorySchema),
  resources: z.array(ResourceStatusCardSchema),
});

export const RemediationRequestSchema = z.object({
  resourceId: z.string(),
  actionId: z.string(),
});

export const RemediationResponseSchema = z.object({
  success: z.boolean(),
  resourceId: z.string(),
  message: z.string(),
  queuedAt: z.string(),
});

export type RecommendedActionDto = z.infer<typeof RecommendedActionSchema>;
export type ResourceStatusCardDto = z.infer<typeof ResourceStatusCardSchema>;
export type SpendCategoryDto = z.infer<typeof SpendCategorySchema>;
export type CostAuditSummaryDto = z.infer<typeof CostAuditSummarySchema>;
export type RemediationRequestDto = z.infer<typeof RemediationRequestSchema>;
export type RemediationResponseDto = z.infer<typeof RemediationResponseSchema>;

export const AuditStatusSchema = z.object({
  mode: z.enum(['SIMULATED', 'LIVE']),
  profile: z.string().optional(),
});
export type AuditStatusDto = z.infer<typeof AuditStatusSchema>;
