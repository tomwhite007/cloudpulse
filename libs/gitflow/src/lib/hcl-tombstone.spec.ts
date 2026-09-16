import { DEFAULT_TERRAFORM_PATH } from './gitflow-config';
import {
  commentOutLines,
  commentOutResourceBlocks,
  findResourceBlocks,
  generateTombstoneDiffPreview,
  hclResourceIdentifier,
  parseResourceHeadersFromHcl,
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

const INSTANCE_WITH_EIP_ASSOCIATION = `resource "aws_instance" "web" {
  ami           = "ami-12345678"
  instance_type = "t3.micro"
}

resource "aws_eip_association" "web_eip" {
  instance_id   = aws_instance.web.id
  allocation_id = aws_eip.web.id
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

  it('comments out an aws_instance and its aws_eip_association satellite', () => {
    const patched = tombstoneTargetedResource(INSTANCE_WITH_EIP_ASSOCIATION, {
      resourceName: 'web',
      resourceId: 'i-0123456789abcdefg',
    });

    expect(patched).toContain('# TOMBSTONED by CloudPulse — web (i-0123456789abcdefg)');
    expect(patched).toContain(
      '# TOMBSTONED by CloudPulse — coupled satellite of web (i-0123456789abcdefg)',
    );
    expect(patched).toContain('# resource "aws_instance" "web" {');
    expect(patched).toContain('# resource "aws_eip_association" "web_eip" {');
    expect(patched).toContain('#   instance_id   = aws_instance.web.id');
    expect(patched).not.toMatch(/^resource "aws_instance"/m);
    expect(patched).not.toMatch(/^resource "aws_eip_association"/m);
  });

  it('appends an import and removed destroy block when no resource block matches', () => {
    const patched = tombstoneTargetedResource('locals { env = "sandbox" }\n', {
      resourceName: 'missing-volume',
      resourceId: 'vol-missing',
      hclDiff: 'resource "aws_ebs_volume" "gone" {}',
    });

    expect(patched).toContain('import {');
    expect(patched).toContain('id = "vol-missing"');
    expect(patched).toContain('removed {');
    expect(patched).toContain('destroy = true');
    expect(patched).toContain('locals { env = "sandbox" }');
  });
});

describe('commentOutLines', () => {
  it('prefixes each line with a hash comment', () => {
    expect(commentOutLines('foo\nbar')).toBe('# foo\n# bar');
  });
});

describe('commentOutResourceBlocks', () => {
  it('comments out an array of blocks from last to first', () => {
    const blocks = findResourceBlocks(INSTANCE_WITH_EIP_ASSOCIATION);
    const patched = commentOutResourceBlocks(
      INSTANCE_WITH_EIP_ASSOCIATION,
      blocks,
      '# TOMBSTONED\n',
    );

    expect(patched).toContain('# TOMBSTONED\n# resource "aws_instance" "web" {');
    expect(patched).toContain('# resource "aws_eip_association" "web_eip" {');
    expect(patched).not.toMatch(/^resource "/m);
  });
});

describe('generateTombstoneDiffPreview', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('formats a tombstone diff against the default terraform path', () => {
    const preview = generateTombstoneDiffPreview('cloudpulse-test-waste', DEFAULT_TERRAFORM_PATH);

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

  it('formats a multi-block preview when passed an array of targets', () => {
    const preview = generateTombstoneDiffPreview(
      [
        { resourceName: 'web', resourceType: 'aws_instance' },
        { resourceName: 'web_eip', resourceType: 'aws_eip_association' },
      ],
      'apps/infra/environments/sandbox/compute.tf',
    );

    expect(preview).toContain('- resource "aws_instance" "web" {');
    expect(preview).toContain('- resource "aws_eip_association" "web_eip" {');
    expect(preview).toContain('+ # resource "aws_instance" "web" { ... }');
    expect(preview).toContain('+ # resource "aws_eip_association" "web_eip" { ... }');
  });

  it('uses an explicit file path when provided', () => {
    const preview = generateTombstoneDiffPreview('cloudpulse-test-waste', 'infra/live/ebs.tf');

    expect(preview.startsWith('# infra/live/ebs.tf\n')).toBe(true);
    expect(preview).toContain('+ # TOMBSTONED by CloudPulse (FinOps Remediation)');
  });

  it('resolves GITFLOW_TERRAFORM_PATH when filePath is omitted', () => {
    vi.stubEnv('GITFLOW_TERRAFORM_PATH', 'infra/live/ebs.tf');

    expect(
      generateTombstoneDiffPreview('cloudpulse-test-waste').startsWith('# infra/live/ebs.tf\n'),
    ).toBe(true);
  });
});

describe('parseResourceHeadersFromHcl', () => {
  it('extracts unique resource headers from a composite diff', () => {
    expect(
      parseResourceHeadersFromHcl(
        [
          '- resource "aws_instance" "web" {',
          '+ # resource "aws_instance" "web" { ... }',
          '- resource "aws_eip_association" "web_eip" {',
        ].join('\n'),
      ),
    ).toEqual([
      { type: 'aws_instance', name: 'web' },
      { type: 'aws_eip_association', name: 'web_eip' },
    ]);
  });
});

describe('hclResourceIdentifier', () => {
  it('converts hyphens into terraform identifiers', () => {
    expect(hclResourceIdentifier('cloudpulse-test-waste')).toBe('cloudpulse_test_waste');
  });
});
