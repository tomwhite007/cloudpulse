module.exports = {
  displayName: 'auditor-api',
  preset: '../../jest.preset.js',
  coverageDirectory: '../../coverage/apps/auditor-api',
  moduleNameMapper: {
    '^@cloudpulse/api-contracts/mocks$': '<rootDir>/../../libs/api-contracts/src/mocks/index.ts',
    '^@cloudpulse/api-contracts$': '<rootDir>/../../libs/api-contracts/src/index.ts',
  },
};
