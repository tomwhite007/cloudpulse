import { Octokit } from '@octokit/rest';
import {
  buildRemediationPrBody,
  sanitizeBranchName,
  type DraftPrRequest,
  type DraftPrResponse,
} from './draft-pr';
import { tombstoneTargetedResource } from './hcl-tombstone';

export type GitFlowEnv = {
  GITHUB_TOKEN?: string;
  GITHUB_REPO_OWNER?: string;
  GITHUB_REPO_NAME?: string;
  DEMO_MODE?: string;
};

export const SANDBOX_STORAGE_PATH =
  'apps/infra/environments/sandbox/storage.tf';

export const FALLBACK_SANDBOX_STORAGE = `# CloudPulse Monitored Storage
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

function gitFlowEnvFromProcess(): GitFlowEnv {
  return {
    GITHUB_TOKEN: process.env['GITHUB_TOKEN'],
    GITHUB_REPO_OWNER: process.env['GITHUB_REPO_OWNER'],
    GITHUB_REPO_NAME: process.env['GITHUB_REPO_NAME'],
    DEMO_MODE: process.env['DEMO_MODE'],
  };
}

export async function createGitHubRemediationPr(
  input: DraftPrRequest,
  env: GitFlowEnv = gitFlowEnvFromProcess(),
): Promise<DraftPrResponse> {
  const octokit = new Octokit({ auth: env.GITHUB_TOKEN });
  const repo = env.GITHUB_REPO_NAME || 'cloudpulse';
  const owner =
    env.GITHUB_REPO_OWNER ||
    (await octokit.rest.users.getAuthenticated()).data.login;

  const { sha: baseSha, branch: baseBranch } = await resolveBaseBranch(
    octokit,
    owner,
    repo,
  );
  const branchName = await createUniqueBranch(
    octokit,
    owner,
    repo,
    sanitizeBranchName(input.branchName),
    baseSha,
  );

  const existing = await readSandboxStorage(octokit, owner, repo, branchName);
  const patched = tombstoneTargetedResource(
    existing.content ?? FALLBACK_SANDBOX_STORAGE,
    {
      resourceName: input.resourceName,
      resourceId: input.resourceId,
      hclDiff: input.hclDiff,
    },
  );

  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: SANDBOX_STORAGE_PATH,
    message: input.commitMessage,
    content: Buffer.from(patched, 'utf8').toString('base64'),
    branch: branchName,
    ...(existing.sha ? { sha: existing.sha } : {}),
  });

  const { data: prData } = await octokit.rest.pulls.create({
    owner,
    repo,
    title: input.commitMessage,
    head: branchName,
    base: baseBranch,
    body: buildRemediationPrBody(input),
  });

  return {
    success: true,
    simulated: false,
    prNumber: prData.number,
    prUrl: prData.html_url,
  };
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

async function readSandboxStorage(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
): Promise<{ content: string; sha?: string }> {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: SANDBOX_STORAGE_PATH,
      ref: branch,
    });

    if (Array.isArray(data) || data.type !== 'file' || !('content' in data)) {
      throw new Error(`Expected a file at ${SANDBOX_STORAGE_PATH}`);
    }

    const encoding = data.encoding === 'base64' ? 'base64' : 'utf8';
    const raw = data.content.replace(/\n/g, '');
    return {
      content: Buffer.from(raw, encoding).toString('utf8'),
      sha: data.sha,
    };
  } catch (error) {
    if (getHttpStatus(error) === 404) {
      return { content: FALLBACK_SANDBOX_STORAGE };
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
