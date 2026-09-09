import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CLOUD_AUDITOR_SERVICE } from './cloud-auditor.interface';
import { MockCloudAuditorService } from './mock-cloud-auditor.service';
import { AwsCloudAuditorService } from '../auditor/aws-cloud-auditor.service';
import { applyLiveAwsEnv } from '../auditor/aws-client-config';
import { McpModule } from '../mcp/mcp.module';

@Module({
  imports: [McpModule],
  controllers: [AppController],
  providers: [
    AppService,
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
export class AppModule {}
