import {
  DEFAULT_BRANCH_PREFIX,
  DEFAULT_TERRAFORM_PATH,
  getGitFlowConfig,
  interpolateBranchTemplate,
  lastBranchSegment,
  resolveBranchPrefix,
  resolveGitFlowBranchName,
  resolveTerraformPath,
  shouldUseSandboxFallback,
  slugResourceName,
} from './gitflow-config';

const draftInput = {
  resourceId: 'vol-0123456789abcdefg',
  resourceName: 'cloudpulse-test-waste',
  actionType: 'TERMINATE',
  branchName: 'finops/terminate-vol-0123456789',
};

describe('resolveTerraformPath', () => {
  it('defaults to the sandbox storage file', () => {
    expect(resolveTerraformPath({})).toBe(DEFAULT_TERRAFORM_PATH);
  });

  it('uses GITFLOW_TERRAFORM_PATH when set', () => {
    expect(
      resolveTerraformPath({
        GITFLOW_TERRAFORM_PATH: '/infra/live/ebs.tf',
      }),
    ).toBe('infra/live/ebs.tf');
  });

  it('ignores a blank override', () => {
    expect(resolveTerraformPath({ GITFLOW_TERRAFORM_PATH: '   ' })).toBe(
      DEFAULT_TERRAFORM_PATH,
    );
  });
});

describe('resolveBranchPrefix', () => {
  it('defaults to finops', () => {
    expect(resolveBranchPrefix({})).toBe(DEFAULT_BRANCH_PREFIX);
  });

  it('strips slashes from a custom prefix', () => {
    expect(resolveBranchPrefix({ GITFLOW_BRANCH_PREFIX: '/cloudpulse/' })).toBe(
      'cloudpulse',
    );
  });
});

describe('lastBranchSegment', () => {
  it('strips an existing folder so a new prefix can be applied', () => {
    expect(lastBranchSegment('finops/terminate-vol-0123456789')).toBe(
      'terminate-vol-0123456789',
    );
  });
});

describe('interpolateBranchTemplate', () => {
  it('fills action, id, and slug name placeholders', () => {
    expect(
      interpolateBranchTemplate('{actionType}-vol-{resourceName}', {
        actionType: 'TERMINATE',
        resourceId: 'vol-0123',
        resourceName: 'cloudpulse-test-waste',
      }),
    ).toBe('terminate-vol-cloudpulse-test-waste');
  });
});

describe('resolveGitFlowBranchName', () => {
  it('re-applies the default prefix to the advisor suffix', () => {
    expect(resolveGitFlowBranchName(draftInput, {})).toBe(
      'finops/terminate-vol-0123456789',
    );
  });

  it('replaces the folder when GITFLOW_BRANCH_PREFIX is set', () => {
    expect(
      resolveGitFlowBranchName(draftInput, {
        GITFLOW_BRANCH_PREFIX: 'remediation',
      }),
    ).toBe('remediation/terminate-vol-0123456789');
  });

  it('uses GITFLOW_BRANCH_TEMPLATE instead of the advisor suffix', () => {
    expect(
      resolveGitFlowBranchName(draftInput, {
        GITFLOW_BRANCH_PREFIX: 'finops',
        GITFLOW_BRANCH_TEMPLATE: '{actionType}-vol-{resourceId}',
      }),
    ).toBe('finops/terminate-vol-vol-0123456789abcdefg');
  });
});

describe('slugResourceName', () => {
  it('lowercases and hyphenates the resource name', () => {
    expect(slugResourceName('CloudPulse Test Waste')).toBe(
      'cloudpulse-test-waste',
    );
  });
});

describe('shouldUseSandboxFallback', () => {
  it('allows the dogfood HCL only for the default sandbox path', () => {
    expect(shouldUseSandboxFallback(DEFAULT_TERRAFORM_PATH)).toBe(true);
    expect(shouldUseSandboxFallback('infra/live/ebs.tf')).toBe(false);
  });
});

describe('getGitFlowConfig', () => {
  it('exposes the resolved terraform path and branch prefix', () => {
    expect(getGitFlowConfig({})).toEqual({
      terraformPath: DEFAULT_TERRAFORM_PATH,
      branchPrefix: DEFAULT_BRANCH_PREFIX,
    });
  });

  it('includes a custom branch template when configured', () => {
    expect(
      getGitFlowConfig({
        GITFLOW_TERRAFORM_PATH: 'infra/live/ebs.tf',
        GITFLOW_BRANCH_PREFIX: 'remediation',
        GITFLOW_BRANCH_TEMPLATE: '{actionType}-{resourceName}',
      }),
    ).toEqual({
      terraformPath: 'infra/live/ebs.tf',
      branchPrefix: 'remediation',
      branchTemplate: '{actionType}-{resourceName}',
    });
  });
});
