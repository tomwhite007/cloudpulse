import {
  applyLiveAwsEnv,
  DEFAULT_AWS_REGION,
  DEFAULT_LIVE_AWS_PROFILE,
  resolveAwsRegion,
  resolveLiveAwsProfile,
} from './aws-client-config';

describe('resolveLiveAwsProfile', () => {
  const originalProfile = process.env.AWS_PROFILE;

  afterEach(() => {
    if (originalProfile === undefined) {
      delete process.env.AWS_PROFILE;
    } else {
      process.env.AWS_PROFILE = originalProfile;
    }
  });

  it('defaults to the existing cloudpulse CLI profile', () => {
    delete process.env.AWS_PROFILE;
    expect(resolveLiveAwsProfile()).toBe(DEFAULT_LIVE_AWS_PROFILE);
    expect(resolveLiveAwsProfile()).toBe('cloudpulse');
  });

  it('uses AWS_PROFILE when set', () => {
    process.env.AWS_PROFILE = 'CloudPulse-Deployer';
    expect(resolveLiveAwsProfile()).toBe('CloudPulse-Deployer');
  });

  it('trims whitespace from AWS_PROFILE', () => {
    process.env.AWS_PROFILE = 'cloudpulse ';
    expect(resolveLiveAwsProfile()).toBe('cloudpulse');
  });
});

describe('applyLiveAwsEnv', () => {
  const originalProfile = process.env.AWS_PROFILE;
  const originalRegion = process.env.AWS_REGION;
  const originalAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const originalSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  afterEach(() => {
    if (originalProfile === undefined) {
      delete process.env.AWS_PROFILE;
    } else {
      process.env.AWS_PROFILE = originalProfile;
    }
    if (originalRegion === undefined) {
      delete process.env.AWS_REGION;
    } else {
      process.env.AWS_REGION = originalRegion;
    }
    if (originalAccessKeyId === undefined) {
      delete process.env.AWS_ACCESS_KEY_ID;
    } else {
      process.env.AWS_ACCESS_KEY_ID = originalAccessKeyId;
    }
    if (originalSecretAccessKey === undefined) {
      delete process.env.AWS_SECRET_ACCESS_KEY;
    } else {
      process.env.AWS_SECRET_ACCESS_KEY = originalSecretAccessKey;
    }
  });

  it('writes the default auditor profile into AWS_PROFILE when static credentials are absent', () => {
    delete process.env.AWS_PROFILE;
    delete process.env.AWS_REGION;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;

    const applied = applyLiveAwsEnv();

    expect(applied).toEqual({
      profile: DEFAULT_LIVE_AWS_PROFILE,
      region: DEFAULT_AWS_REGION,
    });
    expect(process.env.AWS_PROFILE).toBe(DEFAULT_LIVE_AWS_PROFILE);
    expect(process.env.AWS_REGION).toBe(DEFAULT_AWS_REGION);
  });

  it('does not set default AWS_PROFILE when static credentials (AWS_ACCESS_KEY_ID & AWS_SECRET_ACCESS_KEY) are present', () => {
    delete process.env.AWS_PROFILE;
    delete process.env.AWS_REGION;
    process.env.AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
    process.env.AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

    const applied = applyLiveAwsEnv();

    expect(applied).toEqual({
      profile: '',
      region: DEFAULT_AWS_REGION,
    });
    expect(process.env.AWS_PROFILE).toBeUndefined();
    expect(process.env.AWS_REGION).toBe(DEFAULT_AWS_REGION);
  });

  it('preserves explicit AWS_PROFILE when set alongside static credentials', () => {
    process.env.AWS_PROFILE = 'custom-profile';
    process.env.AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
    process.env.AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

    const applied = applyLiveAwsEnv();

    expect(applied.profile).toBe('custom-profile');
    expect(process.env.AWS_PROFILE).toBe('custom-profile');
  });
});

describe('resolveAwsRegion', () => {
  const originalRegion = process.env.AWS_REGION;

  afterEach(() => {
    if (originalRegion === undefined) {
      delete process.env.AWS_REGION;
    } else {
      process.env.AWS_REGION = originalRegion;
    }
  });

  it('defaults to eu-west-1', () => {
    delete process.env.AWS_REGION;
    expect(resolveAwsRegion()).toBe(DEFAULT_AWS_REGION);
  });

  it('uses AWS_REGION when set', () => {
    process.env.AWS_REGION = 'us-east-1';
    expect(resolveAwsRegion()).toBe('us-east-1');
  });
});
