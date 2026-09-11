import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller';
import { GitFlowMcpServer } from './gitflow-mcp.server';
import { MockCloudAuditorService } from '../mocks/cloud-auditor.mock';
import { AwsCloudAuditorService } from '../auditor/aws-cloud-auditor.service';
import { applyLiveAwsEnv } from '../auditor/aws-client-config';
import { CLOUD_AUDITOR_SERVICE } from '../app/cloud-auditor.interface';

@Module({
  controllers: [McpController],
  providers: [
    GitFlowMcpServer,
    {
      provide: CLOUD_AUDITOR_SERVICE,
      useFactory: () => {
        if (process.env.USE_LIVE_AWS === 'true') {
          applyLiveAwsEnv();
          return new AwsCloudAuditorService();
        }
        return new MockCloudAuditorService();
      },
    },
  ],
})
export class McpModule {}
