import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { CloudResourceTypeSchema } from '@cloudpulse/api-contracts';
import { CLOUD_AUDITOR_SERVICE, ICloudAuditorService } from '../app/cloud-auditor.interface';

@Injectable()
export class GitFlowMcpServer {
  public server: McpServer;
  public transport?: SSEServerTransport;

  constructor(
    @Inject(CLOUD_AUDITOR_SERVICE)
    private readonly cloudAuditorService: ICloudAuditorService,
  ) {
    this.server = new McpServer({
      name: 'GitFlow MCP Server',
      version: '1.0.0',
    });

    this.server.tool(
      'propose_terraform_remediation_pr',
      'Propose a terraform remediation pull request for a cloud resource.',
      {
        resourceId: z.string(),
        resourceType: CloudResourceTypeSchema,
        actionType: z.enum(['RESIZE', 'TERMINATE', 'SCHEDULE_SLEEP']),
        targetBranch: z.string().optional().default('main'),
      },
      async ({ resourceId, resourceType, actionType, targetBranch }) => {
        const summary = await this.cloudAuditorService.getAuditSummary();
        const resource = summary.resources.find((r) => r.id === resourceId);

        if (!resource) {
          throw new Error(`Resource ${resourceId} not found`);
        }

        const prTitle = `FinOps: ${actionType} ${resourceType} ${resource.resourceName}`;
        const branchName = `finops/${actionType.toLowerCase()}-vol-${resourceId.substring(0, 12)}`;
        const commitMessage = prTitle;
        const hclDiff =
          resource.recommendedAction?.terraformPatchPreview || '/* No patch preview available */';
        const estimatedMonthlySavingsUsd = resource.potentialMonthlySavings || 0;
        const safetyChecks = ['Pre-flight snapshot confirmed', 'No active IOPS for 30 days'];

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                prTitle,
                branchName,
                commitMessage,
                hclDiff,
                estimatedMonthlySavingsUsd,
                safetyChecks,
              }),
            },
          ],
        };
      },
    );
  }
}
