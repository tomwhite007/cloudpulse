import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CLOUD_AUDITOR_SERVICE } from './cloud-auditor.interface';
import { createCloudAuditorService } from '../auditor/cloud-auditor.factory';
import { McpModule } from '../mcp/mcp.module';

@Module({
  imports: [McpModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: CLOUD_AUDITOR_SERVICE,
      useFactory: createCloudAuditorService,
    },
  ],
})
export class AppModule {}
