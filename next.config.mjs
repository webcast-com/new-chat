import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  // Allow preview / codespace / E2B hosts (fixes "Cross origin request detected")
  allowedDevOrigins: ['*.e2b.app', '*.e2b.dev', '*.app.github.dev'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Allow embedding in E2B / Arena preview iframe
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
        ],
      },
    ];
  },
  // Keep the same path aliases as vite.config.ts
  webpack: (config) => {
    config.resolve.alias['@movies'] = path.resolve(__dirname, 'src/movies');
    config.resolve.alias['@/app'] = path.resolve(__dirname, 'src/livescore');
    config.resolve.alias['@/lib/supabase'] = path.resolve(__dirname, 'src/livescore-lib/supabase.ts');
    config.resolve.alias['@/utils'] = path.resolve(__dirname, 'src/livescore-utils');
    config.resolve.alias['/utils/supabase/info'] = path.resolve(__dirname, 'src/livescore-supabase/info.ts');
    return config;
  },
  // Replicate Vite dev proxy for local dev (production uses Next API routes)
  async rewrites() {
    // Only proxy when RAPIDAPI_KEY is set; otherwise Next API routes return 503 gracefully.
    // These rewrites mirror the old Vite proxy for external APIs (fallback path).
    return [];
  },
  // Allow large client bundle like Vite's default
  experimental: {
    // Needed for three.js, peerjs etc that rely on browser APIs
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  // Ensure Next can handle three.js and other heavy deps
  transpilePackages: ['three'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
    unoptimized: true, // keep compatibility with Vite's unoptimized images
  },
  // Expose env for backwards compatibility: VITE_* -> NEXT_PUBLIC_*
  env: {},
};

export default nextConfig;
