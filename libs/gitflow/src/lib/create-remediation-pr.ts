import { Octokit } from '@octokit/rest';
import {
  buildRemediationPrBody,
  remediationPrTitle,
  updateConsolidatedPrBody,
  updateConsolidatedPrTitle,
  type DraftPrRequest,
  type DraftPrResponse,
} from './draft-pr';
import {
  gitFlowEnvFromProcess,
  resolveGitFlowBranchName,
  resolveTerraformPath,
  shouldUseSandboxFallback,
  slugResourceName,
  type GitFlowEnv,
} from './gitflow-config';
import { collectTombstoneTargets, tombstoneTargetedResource } from './hcl-tombstone';

const FALLBACK_SANDBOX_STORAGE = `# CloudPulse Monitored Storage
resource "aws_ebs_volume" "cloudpulse_test_waste" {
  availability_zone = "eu-west-1a"
  size              = 1
  type              = "gp3"

  tags = {
    Name        = "cloudpulse-test-waste"
    Environment = "sandbox"
    ManagedBy   = "Terraform"
  }
}
`;

export async function createGitHubRemediationPr(
  input: DraftPrRequest,
  env: GitFlowEnv = gitFlowEnvFromProcess(),
): Promise<DraftPrResponse> {
  const octokit = new Octokit({ auth: env.GITHUB_TOKEN });
  const repo = env.GITHUB_REPO_NAME || 'cloudpulse';
  const owner = env.GITHUB_REPO_OWNER || (await resolveAuthenticatedOwner(octokit));
  const terraformPath = resolveTerraformPath(env);

  // Check if an open finops/ remediation PR already exists to consolidate changes
  const openPr = await findOpenRemediationPr(octokit, owner, repo);

  if (openPr) {
    const branchName = openPr.branch;
    const maxAttempts = 5;
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        const existing = await readTerraformFile(octokit, owner, repo, branchName, terraformPath);
        const currentHcl = existing.content ?? FALLBACK_SANDBOX_STORAGE;
        const tombstoneOptions = {
          resourceName: input.resourceName,
          resourceId: input.resourceId,
          hclDiff: input.hclDiff,
        };
        const patched = tombstoneTargetedResource(currentHcl, tombstoneOptions);

        await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: terraformPath,
          message: input.commitMessage,
          content: Buffer.from(patched, 'utf8').toString('base64'),
          branch: branchName,
          ...(existing.sha ? { sha: existing.sha } : {}),
        });

        const updatedBody = updateConsolidatedPrBody(openPr.body, input);
        const updatedTitle = updateConsolidatedPrTitle(openPr.title, input);

        await octokit.rest.pulls.update({
          owner,
          repo,
          pull_number: openPr.number,
          title: updatedTitle,
          body: updatedBody,
        });

        return {
          success: true,
          simulated: false,
          prNumber: openPr.number,
          prUrl: openPr.html_url,
        };
      } catch (err) {
        if (attempt >= maxAttempts) {
          throw err;
        }
        await new Promise((res) => setTimeout(res, 300 * attempt));
      }
    }
  }

  // Standard flow for creating a new PR
  const { sha: baseSha, branch: baseBranch } = await resolveBaseBranch(octokit, owner, repo);
  const requestedBranch = resolveGitFlowBranchName(input, env);
  const defaultBranchName = requestedBranch.startsWith('finops/')
    ? requestedBranch
    : `finops/remediate-${slugResourceName(input.resourceName)}`;
  const branchName = await createUniqueBranch(
    octokit,
    owner,
    repo,
    defaultBranchName,
    baseSha,
  );

  const existing = await readTerraformFile(octokit, owner, repo, branchName, terraformPath);
  const currentHcl = existing.content ?? FALLBACK_SANDBOX_STORAGE;
  const tombstoneOptions = {
    resourceName: input.resourceName,
    resourceId: input.resourceId,
    hclDiff: input.hclDiff,
  };
  const remediatedTargets = collectTombstoneTargets(currentHcl, tombstoneOptions);
  const patched = tombstoneTargetedResource(currentHcl, tombstoneOptions);

  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: terraformPath,
    message: input.commitMessage,
    content: Buffer.from(patched, 'utf8').toString('base64'),
    branch: branchName,
    ...(existing.sha ? { sha: existing.sha } : {}),
  });

  const { data: prData } = await octokit.rest.pulls.create({
    owner,
    repo,
    title: remediationPrTitle(input.commitMessage),
    head: branchName,
    base: baseBranch,
    body: buildRemediationPrBody({
      ...input,
      remediatedResources:
        remediatedTargets.length > 0
          ? remediatedTargets.map((target) => ({
              type: target.type,
              name: target.name,
              role: target.role,
            }))
          : input.remediatedResources,
    }),
  });

  return {
    success: true,
    simulated: false,
    prNumber: prData.number,
    prUrl: prData.html_url,
  };
}

async function resolveAuthenticatedOwner(octokit: Octokit): Promise<string> {
  try {
    const { data } = await octokit.rest.users.getAuthenticated();
    return data.login;
  } catch {
    return 'tomwhite007';
  }
}

async function findOpenRemediationPr(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<{ number: number; branch: string; html_url: string; body: string; title: string } | null> {
  try {
    const { data: openPrs } = await octokit.rest.pulls.list({
      owner,
      repo,
      state: 'open',
    });

    const finopsPr = openPrs.find((p) => p.head.ref.startsWith('finops/'));
    if (finopsPr) {
      return {
        number: finopsPr.number,
        branch: finopsPr.head.ref,
        html_url: finopsPr.html_url,
        body: finopsPr.body ?? '',
        title: finopsPr.title,
      };
    }

    return null;
  } catch {
    return null;
  }
}

async function resolveBaseBranch(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<{ sha: string; branch: string }> {
  try {
    const { data } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: 'heads/main',
    });
    return { sha: data.object.sha, branch: 'main' };
  } catch (error) {
    if (getHttpStatus(error) !== 404) {
      throw error;
    }

    const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
    const branch = repoData.default_branch;
    const { data } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });
    return { sha: data.object.sha, branch };
  }
}

async function createUniqueBranch(
  octokit: Octokit,
  owner: string,
  repo: string,
  branchName: string,
  sha: string,
): Promise<string> {
  try {
    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha,
    });
    return branchName;
  } catch (error) {
    if (getHttpStatus(error) !== 422) {
      throw error;
    }
  }

  const uniqueName = `${branchName}-${Date.now().toString(36)}`;
  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${uniqueName}`,
    sha,
  });
  return uniqueName;
}

async function readTerraformFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
  path: string,
): Promise<{ content: string; sha?: string }> {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    if (Array.isArray(data) || data.type !== 'file' || !('content' in data)) {
      throw new Error(`Expected a file at ${path}`);
    }

    const encoding = data.encoding === 'base64' ? 'base64' : 'utf8';
    const raw = data.content.replace(/\n/g, '');
    return {
      content: Buffer.from(raw, encoding).toString('utf8'),
      sha: data.sha,
    };
  } catch (error) {
    if (getHttpStatus(error) === 404) {
      if (shouldUseSandboxFallback(path)) {
        return { content: FALLBACK_SANDBOX_STORAGE };
      }
      throw new Error(`Terraform file not found at ${path}`);
    }
    throw error;
  }
}

function getHttpStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}
