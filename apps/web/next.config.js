/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mctrack/shared'],
  experimental: {
    serverComponentsExternalPackages: ['bcrypt'],
  },
};

module.exports = nextConfig;
