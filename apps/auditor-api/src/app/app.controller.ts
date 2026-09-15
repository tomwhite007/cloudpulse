import { Body, Controller, Get, Headers, Inject, Post } from '@nestjs/common';
import {
  CostAuditSummaryDto,
  RemediationRequestDto,
  RemediationResponseDto,
} from '@cloudpulse/api-contracts';
import { AppService } from './app.service';
import { CLOUD_AUDITOR_SERVICE, ICloudAuditorService } from './cloud-auditor.interface';
import { resolveLiveAwsProfile } from '../auditor/aws-client-config';
import { MockCloudAuditorService } from '../mocks/cloud-auditor.mock';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject(CLOUD_AUDITOR_SERVICE)
    private readonly cloudAuditor: ICloudAuditorService,
    private readonly mockCloudAuditor: MockCloudAuditorService,
  ) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  private getAuditor(mode?: string): ICloudAuditorService {
    return mode === 'demo' ? this.mockCloudAuditor : this.cloudAuditor;
  }

  @Get('audit/status')
  getAuditStatus(@Headers('x-cloudpulse-mode') mode?: string) {
    if (mode === 'demo') {
      return {
        mode: 'SIMULATED' as const,
        profile: 'mock',
      };
    }
    return {
      mode: 'LIVE' as const,
      profile: resolveLiveAwsProfile(),
    };
  }

  @Get('audit/summary')
  getAuditSummary(@Headers('x-cloudpulse-mode') mode?: string): Promise<CostAuditSummaryDto> {
    return this.getAuditor(mode).getAuditSummary();
  }

  @Post('audit/remediate')
  remediateResource(
    @Body() request: RemediationRequestDto,
    @Headers('x-cloudpulse-mode') mode?: string,
  ): Promise<RemediationResponseDto> {
    return this.getAuditor(mode).remediateResource(request);
  }
}
