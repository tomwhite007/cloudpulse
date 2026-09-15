import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import {
  CostAuditSummaryDto,
  RemediationRequestDto,
  RemediationResponseDto,
} from '@cloudpulse/api-contracts';
import { AppService } from './app.service';
import { CLOUD_AUDITOR_SERVICE, ICloudAuditorService } from './cloud-auditor.interface';
import { resolveLiveAwsProfile } from '../auditor/aws-client-config';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject(CLOUD_AUDITOR_SERVICE)
    private readonly cloudAuditor: ICloudAuditorService,
  ) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('audit/status')
  getAuditStatus() {
    return {
      mode: 'LIVE' as const,
      profile: resolveLiveAwsProfile(),
    };
  }

  @Get('audit/summary')
  getAuditSummary(): Promise<CostAuditSummaryDto> {
    return this.cloudAuditor.getAuditSummary();
  }

  @Post('audit/remediate')
  remediateResource(@Body() request: RemediationRequestDto): Promise<RemediationResponseDto> {
    return this.cloudAuditor.remediateResource(request);
  }
}
