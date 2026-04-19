import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Cloudflare Pages
  experimental: {
    runtime: "edge",
  },
};

export default nextConfig;