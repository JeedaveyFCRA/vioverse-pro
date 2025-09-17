/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { instrumentationHook: true },
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false }
};
export default nextConfig;
