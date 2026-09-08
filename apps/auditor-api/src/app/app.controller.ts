import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import {
  CostAuditSummaryDto,
  RemediationRequestDto,
  RemediationResponseDto,
} from '@cloudpulse/api-contracts';
import { AppService } from './app.service';
import {
  CLOUD_AUDITOR_SERVICE,
  ICloudAuditorService,
} from './cloud-auditor.interface';

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
    const isLive = process.env.USE_LIVE_AWS === 'true';
    return {
      mode: isLive ? 'LIVE' : 'SIMULATED',
      profile: isLive ? process.env.AWS_PROFILE || 'default' : undefined,
    };
  }

  @Get('audit/summary')
  getAuditSummary(): Promise<CostAuditSummaryDto> {
    return this.cloudAuditor.getAuditSummary();
  }

  @Post('audit/remediate')
  remediateResource(
    @Body() request: RemediationRequestDto,
  ): Promise<RemediationResponseDto> {
    return this.cloudAuditor.remediateResource(request);
  }
}
