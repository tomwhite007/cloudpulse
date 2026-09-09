export const DEFAULT_LIVE_AWS_PROFILE = 'cloudpulse';
export const DEFAULT_AWS_REGION = 'eu-west-1';

export function resolveLiveAwsProfile(): string {
  const profile = process.env.AWS_PROFILE?.trim();
  return profile && profile.length > 0 ? profile : DEFAULT_LIVE_AWS_PROFILE;
}

export function resolveAwsRegion(): string {
  const region = process.env.AWS_REGION?.trim();
  return region && region.length > 0 ? region : DEFAULT_AWS_REGION;
}

/** Ensure the AWS SDK default provider chain uses the same profile as `--profile`. */
export function applyLiveAwsEnv(): { profile: string; region: string } {
  const profile = resolveLiveAwsProfile();
  const region = resolveAwsRegion();
  process.env.AWS_PROFILE = profile;
  process.env.AWS_REGION = region;
  return { profile, region };
}

export function awsClientConfig() {
  const { region } = applyLiveAwsEnv();
  return { region };
}
