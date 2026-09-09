import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Workspace packages are consumed as TypeScript source, so Next must transpile them.
  transpilePackages: ['@quizbyte/shared', '@quizbyte/database'],
  typedRoutes: true,
};

export default nextConfig;
