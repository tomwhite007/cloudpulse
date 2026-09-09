import { getGitFlowConfig } from './gitflow-config';

export type HclResourceBlock = {
  type: string;
  name: string;
  start: number;
  end: number;
  text: string;
};

export function hclResourceIdentifier(resourceName: string): string {
  const identifier = resourceName.replace(/[^A-Za-z0-9_]/g, '_');
  return identifier.length > 0 ? identifier : 'resource';
}

export function generateTombstoneDiffPreview(
  resourceName: string,
  filePath?: string,
): string {
  const resolvedPath =
    filePath?.trim() || getGitFlowConfig().terraformPath;
  const hclName = hclResourceIdentifier(resourceName);

  return [
    `# ${resolvedPath}`,
    `- resource "aws_ebs_volume" "${hclName}" {`,
    `-   ...`,
    `- }`,
    `+ # TOMBSTONED by CloudPulse (FinOps Remediation)`,
    `+ # resource "aws_ebs_volume" "${hclName}" { ... }`,
  ].join('\n');
}

export function findResourceBlocks(hcl: string): HclResourceBlock[] {
  const headerRe = /resource\s+"([^"]+)"\s+"([^"]+)"\s*\{/g;
  const blocks: HclResourceBlock[] = [];
  let match = headerRe.exec(hcl);

  while (match) {
    const braceStart = match.index + match[0].length - 1;
    const braceEnd = findMatchingBrace(hcl, braceStart);
    if (braceEnd !== -1) {
      blocks.push({
        type: match[1],
        name: match[2],
        start: match.index,
        end: braceEnd + 1,
        text: hcl.slice(match.index, braceEnd + 1),
      });
    }
    match = headerRe.exec(hcl);
  }

  return blocks;
}

export function commentOutLines(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      if (line.trimStart().startsWith('#')) {
        return line;
      }
      return line.length === 0 ? '#' : `# ${line}`;
    })
    .join('\n');
}

export function tombstoneTargetedResource(
  hcl: string,
  options: {
    resourceName: string;
    resourceId: string;
    hclDiff?: string;
  },
): string {
  const blocks = findResourceBlocks(hcl);
  const target = blocks.find((block) =>
    blockMatchesTarget(block, options.resourceName, options.resourceId),
  );

  if (target) {
    const header = `# TOMBSTONED by CloudPulse — ${options.resourceName} (${options.resourceId})\n`;
    return (
      hcl.slice(0, target.start) +
      header +
      commentOutLines(target.text) +
      hcl.slice(target.end)
    );
  }

  const appendix = [
    '',
    `# TOMBSTONED by CloudPulse — ${options.resourceName} (${options.resourceId})`,
    options.hclDiff
      ? commentOutLines(options.hclDiff)
      : `# resource removed: ${options.resourceName}`,
    '',
  ].join('\n');

  return `${hcl.trimEnd()}${appendix}`;
}

function blockMatchesTarget(
  block: HclResourceBlock,
  resourceName: string,
  resourceId: string,
): boolean {
  const haystack = normalizeIdentity(`${block.type} ${block.name} ${block.text}`);
  const needles = [resourceName, resourceId, resourceName.replace(/-/g, '_')].filter(
    (value) => value.trim().length > 0,
  );

  return needles.some((needle) => haystack.includes(normalizeIdentity(needle)));
}

function normalizeIdentity(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findMatchingBrace(source: string, openIndex: number): number {
  let depth = 0;

  for (let i = openIndex; i < source.length; i += 1) {
    const char = source[i];

    if (char === '"' || char === "'") {
      i = skipQuoted(source, i);
      continue;
    }

    if (char === '#') {
      while (i < source.length && source[i] !== '\n') {
        i += 1;
      }
      continue;
    }

    if (char === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') {
        i += 1;
      }
      continue;
    }

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}

function skipQuoted(source: string, quoteIndex: number): number {
  const quote = source[quoteIndex];
  let i = quoteIndex + 1;

  while (i < source.length) {
    if (source[i] === '\\') {
      i += 2;
      continue;
    }
    if (source[i] === quote) {
      return i;
    }
    i += 1;
  }

  return source.length - 1;
}
