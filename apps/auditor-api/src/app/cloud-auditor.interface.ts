import {
  CostAuditSummaryDto,
  RemediationRequestDto,
  RemediationResponseDto,
} from '@cloudpulse/api-contracts';

export const CLOUD_AUDITOR_SERVICE = Symbol('CLOUD_AUDITOR_SERVICE');

export interface ICloudAuditorService {
  getAuditSummary(): Promise<CostAuditSummaryDto>;
  remediateResource(
    request: RemediationRequestDto,
  ): Promise<RemediationResponseDto>;
}
