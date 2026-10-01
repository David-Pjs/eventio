import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@eventio/radar-sources'],
  images: { unoptimized: true },
};

export default config;
