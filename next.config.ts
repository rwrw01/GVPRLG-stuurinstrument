import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  typescript: {
    // The production type check covers the app, not the tests: colocated *.test.ts files and the
    // tests/ folder (excluded from the image by .dockerignore) are checked by `tsc --noEmit`.
    tsconfigPath: 'tsconfig.build.json',
  },
};

export default nextConfig;
