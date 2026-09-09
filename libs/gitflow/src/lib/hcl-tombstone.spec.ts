import { DEFAULT_TERRAFORM_PATH } from './gitflow-config';
import {
  commentOutLines,
  findResourceBlocks,
  generateTombstoneDiffPreview,
  hclResourceIdentifier,
  tombstoneTargetedResource,
} from './hcl-tombstone';

const SANDBOX_STORAGE = `# CloudPulse Monitored Storage
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

describe('findResourceBlocks', () => {
  it('parses nested terraform resource blocks', () => {
    const blocks = findResourceBlocks(SANDBOX_STORAGE);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('aws_ebs_volume');
    expect(blocks[0].name).toBe('cloudpulse_test_waste');
    expect(blocks[0].text).toContain('Name        = "cloudpulse-test-waste"');
  });
});

describe('tombstoneTargetedResource', () => {
  it('comments out the sandbox volume when the AWS name matches', () => {
    const patched = tombstoneTargetedResource(SANDBOX_STORAGE, {
      resourceName: 'cloudpulse-test-waste',
      resourceId: 'vol-0123456789abcdefg',
    });

    expect(patched).toContain(
      '# TOMBSTONED by CloudPulse — cloudpulse-test-waste (vol-0123456789abcdefg)',
    );
    expect(patched).toContain('# resource "aws_ebs_volume" "cloudpulse_test_waste" {');
    expect(patched).not.toMatch(/^resource "aws_ebs_volume"/m);
  });

  it('appends a commented patch when no resource block matches', () => {
    const patched = tombstoneTargetedResource('locals { env = "sandbox" }\n', {
      resourceName: 'missing-volume',
      resourceId: 'vol-missing',
      hclDiff: 'resource "aws_ebs_volume" "gone" {}',
    });

    expect(patched).toContain('# resource "aws_ebs_volume" "gone" {}');
    expect(patched).toContain('locals { env = "sandbox" }');
  });
});

describe('commentOutLines', () => {
  it('prefixes each line with a hash comment', () => {
    expect(commentOutLines('foo\nbar')).toBe('# foo\n# bar');
  });
});

describe('generateTombstoneDiffPreview', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('formats a tombstone diff against the default terraform path', () => {
    const preview = generateTombstoneDiffPreview(
      'cloudpulse-test-waste',
      DEFAULT_TERRAFORM_PATH,
    );

    expect(preview).toBe(
      [
        `# ${DEFAULT_TERRAFORM_PATH}`,
        '- resource "aws_ebs_volume" "cloudpulse_test_waste" {',
        '-   ...',
        '- }',
        '+ # TOMBSTONED by CloudPulse (FinOps Remediation)',
        '+ # resource "aws_ebs_volume" "cloudpulse_test_waste" { ... }',
      ].join('\n'),
    );
  });

  it('uses an explicit file path when provided', () => {
    const preview = generateTombstoneDiffPreview(
      'cloudpulse-test-waste',
      'infra/live/ebs.tf',
    );

    expect(preview.startsWith('# infra/live/ebs.tf\n')).toBe(true);
    expect(preview).toContain(
      '+ # TOMBSTONED by CloudPulse (FinOps Remediation)',
    );
  });

  it('resolves GITFLOW_TERRAFORM_PATH when filePath is omitted', () => {
    vi.stubEnv('GITFLOW_TERRAFORM_PATH', 'infra/live/ebs.tf');

    expect(
      generateTombstoneDiffPreview('cloudpulse-test-waste').startsWith(
        '# infra/live/ebs.tf\n',
      ),
    ).toBe(true);
  });
});

describe('hclResourceIdentifier', () => {
  it('converts hyphens into terraform identifiers', () => {
    expect(hclResourceIdentifier('cloudpulse-test-waste')).toBe(
      'cloudpulse_test_waste',
    );
  });
});
