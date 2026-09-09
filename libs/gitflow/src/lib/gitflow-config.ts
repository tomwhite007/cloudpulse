import { sanitizeBranchName, type DraftPrRequest } from './draft-pr';

export const DEFAULT_TERRAFORM_PATH =
  'apps/infra/environments/sandbox/storage.tf';

export const DEFAULT_BRANCH_PREFIX = 'finops';

export type GitFlowEnv = {
  GITHUB_TOKEN?: string;
  GITHUB_REPO_OWNER?: string;
  GITHUB_REPO_NAME?: string;
  DEMO_MODE?: string;
  GITFLOW_TERRAFORM_PATH?: string;
  GITFLOW_BRANCH_PREFIX?: string;
  GITFLOW_BRANCH_TEMPLATE?: string;
};

export function gitFlowEnvFromProcess(
  source: NodeJS.ProcessEnv = process.env,
): GitFlowEnv {
  return {
    GITHUB_TOKEN: source['GITHUB_TOKEN'],
    GITHUB_REPO_OWNER: source['GITHUB_REPO_OWNER'],
    GITHUB_REPO_NAME: source['GITHUB_REPO_NAME'],
    DEMO_MODE: source['DEMO_MODE'],
    GITFLOW_TERRAFORM_PATH: source['GITFLOW_TERRAFORM_PATH'],
    GITFLOW_BRANCH_PREFIX: source['GITFLOW_BRANCH_PREFIX'],
    GITFLOW_BRANCH_TEMPLATE: source['GITFLOW_BRANCH_TEMPLATE'],
  };
}

export type GitFlowConfig = {
  terraformPath: string;
  branchPrefix: string;
  branchTemplate?: string;
};

export function getGitFlowConfig(
  env: GitFlowEnv = gitFlowEnvFromProcess(),
): GitFlowConfig {
  const branchTemplate = env.GITFLOW_BRANCH_TEMPLATE?.trim();

  return {
    terraformPath: resolveTerraformPath(env),
    branchPrefix: resolveBranchPrefix(env),
    ...(branchTemplate ? { branchTemplate } : {}),
  };
}

export function resolveTerraformPath(env: GitFlowEnv): string {
  const path = env.GITFLOW_TERRAFORM_PATH?.trim().replace(/^\/+/, '');
  return path && path.length > 0 ? path : DEFAULT_TERRAFORM_PATH;
}

export function shouldUseSandboxFallback(path: string): boolean {
  return path === DEFAULT_TERRAFORM_PATH;
}

export function resolveBranchPrefix(env: GitFlowEnv): string {
  const prefix = env.GITFLOW_BRANCH_PREFIX?.trim().replace(/^\/+|\/+$/g, '');
  return prefix && prefix.length > 0 ? prefix : DEFAULT_BRANCH_PREFIX;
}

export function lastBranchSegment(branchName: string): string {
  const segments = branchName
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter((segment) => segment.length > 0);

  return segments[segments.length - 1] || 'remediation';
}

export function slugResourceName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug.length > 0 ? slug : 'resource';
}

export function interpolateBranchTemplate(
  template: string,
  input: Pick<DraftPrRequest, 'actionType' | 'resourceId' | 'resourceName'>,
): string {
  return template
    .replace(/\{actionType\}/g, input.actionType.toLowerCase())
    .replace(/\{resourceId\}/g, input.resourceId)
    .replace(/\{resourceName\}/g, slugResourceName(input.resourceName));
}

export function resolveGitFlowBranchName(
  input: Pick<
    DraftPrRequest,
    'branchName' | 'actionType' | 'resourceId' | 'resourceName'
  >,
  env: GitFlowEnv,
): string {
  const prefix = resolveBranchPrefix(env);
  const template = env.GITFLOW_BRANCH_TEMPLATE?.trim();
  const suffix = template
    ? interpolateBranchTemplate(template, input)
    : lastBranchSegment(input.branchName);

  return sanitizeBranchName(`${prefix}/${suffix}`);
}
