import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@scp/domain", "@scp/event-contracts"],
};

export default nextConfig;
