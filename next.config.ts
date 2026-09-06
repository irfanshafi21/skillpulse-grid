import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: { '/api/**/*': ['./data/demo.db'] },
  reactStrictMode: false,
};

export default nextConfig;
