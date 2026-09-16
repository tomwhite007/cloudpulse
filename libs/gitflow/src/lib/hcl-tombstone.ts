import { getGitFlowConfig } from './gitflow-config';

export const COUPLED_SATELLITE_TYPES = [
  'aws_eip_association',
  'aws_eip',
  'aws_volume_attachment',
] as const;

export type CoupledSatelliteType = (typeof COUPLED_SATELLITE_TYPES)[number];

export type HclResourceBlock = {
  type: string;
  name: string;
  start: number;
  end: number;
  text: string;
};

export type TombstoneRole = 'primary' | 'satellite';

export type TombstoneTarget = HclResourceBlock & {
  role: TombstoneRole;
};

export type TombstoneBlockReplacement = string | { type?: string; name: string } | HclResourceBlock;

export type TombstonePreviewTarget =
  | string
  | {
      resourceName: string;
      resourceType?: string;
    };

export type TombstoneOptions = {
  resourceName: string;
  resourceId: string;
  hclDiff?: string;
  additionalBlocks?: TombstoneBlockReplacement | TombstoneBlockReplacement[];
};

export function hclResourceIdentifier(resourceName: string): string {
  const identifier = resourceName.replace(/[^A-Za-z0-9_]/g, '_');
  return identifier.length > 0 ? identifier : 'resource';
}

export function generateTombstoneDiffPreview(
  resourceNameOrTargets: TombstonePreviewTarget | readonly TombstonePreviewTarget[],
  filePath?: string,
): string {
  const resolvedPath = filePath?.trim() || getGitFlowConfig().terraformPath;
  const targets = normalizePreviewTargets(resourceNameOrTargets);

  const hunks = targets.map((target) => {
    const hclName = hclResourceIdentifier(target.resourceName);
    return [
      `- resource "${target.resourceType}" "${hclName}" {`,
      `-   ...`,
      `- }`,
      `+ # TOMBSTONED by CloudPulse (FinOps Remediation)`,
      `+ # resource "${target.resourceType}" "${hclName}" { ... }`,
    ].join('\n');
  });

  return [`# ${resolvedPath}`, ...hunks].join('\n');
}

export function parseResourceHeadersFromHcl(hcl: string): Array<{ type: string; name: string }> {
  const headerRe = /resource\s+"([^"]+)"\s+"([^"]+)"/g;
  const seen = new Set<string>();
  const headers: Array<{ type: string; name: string }> = [];
  let match = headerRe.exec(hcl);

  while (match) {
    const key = `${match[1]}.${match[2]}`;
    if (!seen.has(key)) {
      seen.add(key);
      headers.push({ type: match[1], name: match[2] });
    }
    match = headerRe.exec(hcl);
  }

  return headers;
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

export function commentOutResourceBlocks(
  hcl: string,
  blocks: readonly HclResourceBlock[],
  header?: string | ((block: HclResourceBlock) => string),
): string {
  const unique = dedupeBlocks(blocks);
  const sorted = [...unique].sort((a, b) => b.start - a.start);
  let result = hcl;

  for (const block of sorted) {
    const prefix = typeof header === 'function' ? header(block) : (header ?? '');
    result =
      result.slice(0, block.start) + prefix + commentOutLines(block.text) + result.slice(block.end);
  }

  return result;
}

export function collectTombstoneTargets(
  hcl: string,
  options: Pick<TombstoneOptions, 'resourceName' | 'resourceId' | 'additionalBlocks' | 'hclDiff'>,
): TombstoneTarget[] {
  const blocks = findResourceBlocks(hcl);
  const primaries = blocks.filter((block) =>
    isPrimaryResourceBlock(block, options.resourceName, options.resourceId),
  );
  const extras = resolveAdditionalBlocks(
    blocks,
    mergeAdditionalBlocks(options.additionalBlocks, options.hclDiff),
  );
  const satellites = findCoupledSatelliteBlocks(blocks, primaries, options);

  const byStart = new Map<number, TombstoneTarget>();

  for (const primary of primaries) {
    byStart.set(primary.start, { ...primary, role: 'primary' });
  }

  for (const extra of extras) {
    if (!byStart.has(extra.start)) {
      byStart.set(extra.start, { ...extra, role: 'satellite' });
    }
  }

  for (const satellite of satellites) {
    if (!byStart.has(satellite.start)) {
      byStart.set(satellite.start, { ...satellite, role: 'satellite' });
    }
  }

  return [...byStart.values()].sort((a, b) => a.start - b.start);
}

export function resolveResourceType(options: TombstoneOptions): string {
  if (options.resourceId.startsWith('vol-')) {
    return 'aws_ebs_volume';
  }
  if (options.resourceId.startsWith('eipalloc-')) {
    return 'aws_eip';
  }
  if (options.resourceId.startsWith('db-')) {
    return 'aws_db_instance';
  }
  if (options.hclDiff) {
    const headers = parseResourceHeadersFromHcl(options.hclDiff);
    if (headers.length > 0 && headers[0].type) {
      return headers[0].type;
    }
  }
  return 'aws_ebs_volume';
}

export function tombstoneTargetedResource(hcl: string, options: TombstoneOptions): string {
  const targets = collectTombstoneTargets(hcl, options);

  if (targets.length > 0) {
    const roleByStart = new Map(targets.map((target) => [target.start, target.role]));
    return commentOutResourceBlocks(hcl, targets, (block) =>
      roleByStart.get(block.start) === 'satellite'
        ? `# TOMBSTONED by CloudPulse — coupled satellite of ${options.resourceName} (${options.resourceId})\n`
        : `# TOMBSTONED by CloudPulse — ${options.resourceName} (${options.resourceId})\n`,
    );
  }

  const tfType = resolveResourceType(options);
  const identifierName = hclResourceIdentifier(
    `remediated_${options.resourceName}_${options.resourceId}`,
  );

  const appendix = [
    '',
    `# TOMBSTONED by CloudPulse (FinOps Remediation) — ${options.resourceName} (${options.resourceId})`,
    `import {`,
    `  to = ${tfType}.${identifierName}`,
    `  id = "${options.resourceId}"`,
    `}`,
    '',
    `removed {`,
    `  from = ${tfType}.${identifierName}`,
    `  lifecycle {`,
    `    destroy = true`,
    `  }`,
    `}`,
    '',
  ].join('\n');

  return `${hcl.trimEnd()}${appendix}`;
}

function normalizePreviewTargets(
  input: TombstonePreviewTarget | readonly TombstonePreviewTarget[],
): Array<{ resourceName: string; resourceType: string }> {
  const items = Array.isArray(input) ? input : [input];

  return items.map((item) =>
    typeof item === 'string'
      ? { resourceName: item, resourceType: 'aws_ebs_volume' }
      : {
          resourceName: item.resourceName,
          resourceType: item.resourceType || 'aws_ebs_volume',
        },
  );
}

function mergeAdditionalBlocks(
  additionalBlocks: TombstoneOptions['additionalBlocks'],
  hclDiff?: string,
): TombstoneBlockReplacement[] | undefined {
  const extras: TombstoneBlockReplacement[] = [];

  if (additionalBlocks != null) {
    extras.push(...(Array.isArray(additionalBlocks) ? additionalBlocks : [additionalBlocks]));
  }

  if (hclDiff?.trim()) {
    extras.push(
      ...parseResourceHeadersFromHcl(hclDiff).map((header) => ({
        type: header.type,
        name: header.name,
      })),
    );
  }

  return extras.length > 0 ? extras : undefined;
}

function resolveAdditionalBlocks(
  blocks: readonly HclResourceBlock[],
  additional?: TombstoneBlockReplacement | TombstoneBlockReplacement[],
): HclResourceBlock[] {
  if (additional == null) {
    return [];
  }

  const items = Array.isArray(additional) ? additional : [additional];
  const resolved: HclResourceBlock[] = [];

  for (const item of items) {
    if (typeof item === 'string') {
      const headers = parseResourceHeadersFromHcl(item);
      if (headers.length > 0) {
        for (const header of headers) {
          resolved.push(
            ...blocks.filter((block) => block.type === header.type && block.name === header.name),
          );
        }
      } else {
        resolved.push(...blocks.filter((block) => blockMatchesTarget(block, item, item)));
      }
      continue;
    }

    if (isLocatedBlock(item)) {
      resolved.push(item);
      continue;
    }

    resolved.push(
      ...blocks.filter(
        (block) => (!item.type || block.type === item.type) && block.name === item.name,
      ),
    );
  }

  return dedupeBlocks(resolved);
}

function findCoupledSatelliteBlocks(
  blocks: readonly HclResourceBlock[],
  primaries: readonly HclResourceBlock[],
  options: { resourceName: string; resourceId: string },
): HclResourceBlock[] {
  if (primaries.length === 0) {
    return [];
  }

  const primaryStarts = new Set(primaries.map((primary) => primary.start));
  const satellites: HclResourceBlock[] = [];

  for (const block of blocks) {
    if (primaryStarts.has(block.start) || !isCoupledSatelliteType(block.type)) {
      continue;
    }

    if (primaries.some((primary) => referencesPrimary(block, primary, options))) {
      satellites.push(block);
    }
  }

  const associatedEipNames = new Set<string>();
  for (const satellite of satellites) {
    if (satellite.type !== 'aws_eip_association') {
      continue;
    }
    for (const name of extractPrefixedNames(satellite.text, 'aws_eip')) {
      associatedEipNames.add(name);
    }
  }

  for (const block of blocks) {
    if (block.type !== 'aws_eip' || primaryStarts.has(block.start)) {
      continue;
    }
    if (satellites.some((satellite) => satellite.start === block.start)) {
      continue;
    }
    if (associatedEipNames.has(block.name)) {
      satellites.push(block);
    }
  }

  return satellites;
}

function isPrimaryResourceBlock(
  block: HclResourceBlock,
  resourceName: string,
  resourceId: string,
): boolean {
  if (isDirectIdentityMatch(block, resourceName, resourceId)) {
    return true;
  }

  if (isCoupledSatelliteType(block.type)) {
    return false;
  }

  return blockMatchesTarget(block, resourceName, resourceId);
}

function isDirectIdentityMatch(
  block: HclResourceBlock,
  resourceName: string,
  resourceId: string,
): boolean {
  const identities = [block.name, `${block.type}.${block.name}`].map(normalizeIdentity);
  const needles = [resourceName, resourceId, resourceName.replace(/-/g, '_')]
    .filter((value) => value.trim().length > 0)
    .map(normalizeIdentity);

  return needles.some((needle) => identities.includes(needle));
}

function referencesPrimary(
  satellite: HclResourceBlock,
  primary: HclResourceBlock,
  options: { resourceName: string; resourceId: string },
): boolean {
  const text = satellite.text;

  if (text.includes(`${primary.type}.${primary.name}`)) {
    return true;
  }

  const resourceId = options.resourceId.trim();
  if (resourceId.length >= 4 && text.includes(resourceId)) {
    return true;
  }

  const resourceName = options.resourceName.trim();
  if (resourceName.length > 0) {
    if (text.includes(`"${resourceName}"`) || text.includes(`'${resourceName}'`)) {
      return true;
    }
  }

  return false;
}

function extractPrefixedNames(text: string, resourceType: string): string[] {
  const re = new RegExp(`${escapeRegExp(resourceType)}\\.([A-Za-z0-9_]+)`, 'g');
  const names: string[] = [];
  let match = re.exec(text);

  while (match) {
    names.push(match[1]);
    match = re.exec(text);
  }

  return names;
}

function isCoupledSatelliteType(type: string): type is CoupledSatelliteType {
  return (COUPLED_SATELLITE_TYPES as readonly string[]).includes(type);
}

function isLocatedBlock(
  value: Exclude<TombstoneBlockReplacement, string>,
): value is HclResourceBlock {
  return (
    'start' in value &&
    'end' in value &&
    'text' in value &&
    typeof value.start === 'number' &&
    typeof value.end === 'number'
  );
}

function dedupeBlocks(blocks: readonly HclResourceBlock[]): HclResourceBlock[] {
  const byStart = new Map<number, HclResourceBlock>();
  for (const block of blocks) {
    byStart.set(block.start, block);
  }
  return [...byStart.values()].sort((a, b) => a.start - b.start);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
