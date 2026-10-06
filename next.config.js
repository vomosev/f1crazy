/**
 * Next.js configuration for F1 Crazy (frontend lives at the repository root).
 *
 * Environment:
 *   NEXT_PUBLIC_API_BASE_URL — public base URL of the Express API.
 *   Defaults to https://f1crazy-api.arx-app.com:4119 when not provided at build time.
 *
 * No rewrites/proxying are configured: the browser talks to the API directly
 * over its own HTTPS origin using credentialed (cookie) requests.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_API_BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL || 'https://f1crazy-api.arx-app.com:4119',
  },
  eslint: {
    // Builds should not fail on lint warnings during deployment.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;