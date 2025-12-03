/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mctrack/shared'],
  serverExternalPackages: ['bcrypt'],
};

module.exports = nextConfig;
