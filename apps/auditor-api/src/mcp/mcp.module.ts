import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller';
import { GitFlowMcpServer } from './gitflow-mcp.server';
import { MockCloudAuditorService } from '../app/mock-cloud-auditor.service';
import { AwsCloudAuditorService } from '../auditor/aws-cloud-auditor.service';
import { CLOUD_AUDITOR_SERVICE } from '../app/cloud-auditor.interface';

@Module({
  controllers: [McpController],
  providers: [
    GitFlowMcpServer,
    {
      provide: CLOUD_AUDITOR_SERVICE,
      useFactory: () => {
        if (process.env.USE_LIVE_AWS === 'true') {
          return new AwsCloudAuditorService();
        }
        return new MockCloudAuditorService();
      },
    },
  ],
})
export class McpModule {}
