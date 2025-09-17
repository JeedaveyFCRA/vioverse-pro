// Safety valve: Allow type errors only in CI on non-main branches
const allowTypeErrors = process.env['CI'] && process.env['BRANCH'] !== 'main';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode for React
  reactStrictMode: true,

  // Disable x-powered-by header
  poweredByHeader: false,

  // Output configuration
  output: 'standalone',

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [320, 375, 414, 768, 1024, 1280, 1440, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // TypeScript - strict on main, flexible in CI for other branches
  typescript: {
    ignoreBuildErrors: !!allowTypeErrors,
  },

  // ESLint - strict on main, flexible in CI for other branches
  eslint: {
    ignoreDuringBuilds: !!allowTypeErrors,
  },

  // Trailing slashes
  trailingSlash: false,

  // Page extensions
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],

  // Environment variables
  env: {
    NEXT_PUBLIC_APP_URL: process.env['NEXT_PUBLIC_APP_URL'],
    NEXT_PUBLIC_API_URL: process.env['NEXT_PUBLIC_API_URL'],
  },
};

export default nextConfig;