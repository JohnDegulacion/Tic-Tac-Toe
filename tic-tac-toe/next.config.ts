/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["ogl"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
