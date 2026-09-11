import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CostAuditSummaryDto,
  RemediationRequestDto,
  RemediationRequestSchema,
  RemediationResponseDto,
} from '@cloudpulse/api-contracts';
import {
  MOCK_AUDIT_RESOURCES,
  MOCK_COST_AUDIT_SUMMARY,
} from '@cloudpulse/api-contracts/mocks';
import { ICloudAuditorService } from '../app/cloud-auditor.interface';

@Injectable()
export class MockCloudAuditorService implements ICloudAuditorService {
  async getAuditSummary(): Promise<CostAuditSummaryDto> {
    return MOCK_COST_AUDIT_SUMMARY;
  }

  async remediateResource(
    request: RemediationRequestDto,
  ): Promise<RemediationResponseDto> {
    const parsed = RemediationRequestSchema.safeParse(request);
    if (!parsed.success) {
      throw new BadRequestException('Invalid remediation request.');
    }

    const { resourceId, actionId } = parsed.data;
    const resource = MOCK_AUDIT_RESOURCES.find((item) => item.id === resourceId);
    const actionMatches = resource?.recommendedAction.actionId === actionId;

    if (!resource || !actionMatches) {
      return {
        success: false,
        resourceId,
        message: `No matching 1-click remediation found for resource ${resourceId}.`,
        queuedAt: new Date().toISOString(),
      };
    }

    return {
      success: true,
      resourceId,
      message: `Queued ${resource.recommendedAction.label} for ${resource.resourceName}. Terraform patch will apply in the next plan.`,
      queuedAt: new Date().toISOString(),
    };
  }
}
