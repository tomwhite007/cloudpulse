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
  });

  it('writes the default auditor profile into AWS_PROFILE', () => {
    delete process.env.AWS_PROFILE;
    delete process.env.AWS_REGION;

    const applied = applyLiveAwsEnv();

    expect(applied).toEqual({
      profile: DEFAULT_LIVE_AWS_PROFILE,
      region: DEFAULT_AWS_REGION,
    });
    expect(process.env.AWS_PROFILE).toBe(DEFAULT_LIVE_AWS_PROFILE);
    expect(process.env.AWS_REGION).toBe(DEFAULT_AWS_REGION);
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
