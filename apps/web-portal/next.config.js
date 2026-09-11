//@ts-check

const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Next.js 16: formerly experimental.outputFileTracingRoot.
  // Traces workspace libs (@cloudpulse/*) from the monorepo root into standalone.
  outputFileTracingRoot: path.join(__dirname, '../..'),
};

module.exports = nextConfig;
