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

export function applyLiveAwsEnv(): { profile: string; region: string } {
  const region = resolveAwsRegion();
  process.env.AWS_REGION = region;

  const hasStaticEnvCreds = Boolean(
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY,
  );

  if (!hasStaticEnvCreds) {
    const profile = resolveLiveAwsProfile();
    process.env.AWS_PROFILE = profile;
    return { profile, region };
  }

  return { profile: process.env.AWS_PROFILE || '', region };
}

export function awsClientConfig() {
  const { region } = applyLiveAwsEnv();
  return { region };
}
