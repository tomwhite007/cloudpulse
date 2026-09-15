import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller';
import { GitFlowMcpServer } from './gitflow-mcp.server';
import { createCloudAuditorService } from '../auditor/cloud-auditor.factory';
import { CLOUD_AUDITOR_SERVICE } from '../app/cloud-auditor.interface';

@Module({
  controllers: [McpController],
  providers: [
    GitFlowMcpServer,
    {
      provide: CLOUD_AUDITOR_SERVICE,
      useFactory: createCloudAuditorService,
    },
  ],
})
export class McpModule {}
