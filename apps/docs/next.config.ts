import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  agentRules: false,
  async redirects() {
    return [{ source: "/", destination: "/docs", permanent: false }];
  },
};

export default withMDX(nextConfig);
