/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Force Next.js to minify the server bundle to fit under Cloudflare's 3MB limit
  experimental: {
    serverMinification: true,
  },
};

export default nextConfig;