import { AwsCloudAuditorService } from './aws-cloud-auditor.service';
import { applyLiveAwsEnv } from './aws-client-config';
import type { ICloudAuditorService } from '../app/cloud-auditor.interface';

export function createCloudAuditorService(): ICloudAuditorService {
  applyLiveAwsEnv();
  return new AwsCloudAuditorService();
}
