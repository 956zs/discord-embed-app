import type { NextConfig } from "next";

const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '';
const DISCORD_ORIGIN = `https://${DISCORD_CLIENT_ID}.discordsays.com`;

const nextConfig: NextConfig = {
  // Allow Discord Embedded App cross-origin requests
  allowedDevOrigins: DISCORD_CLIENT_ID ? [DISCORD_ORIGIN] : [],
  
  // Configure external image domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
        pathname: '/emojis/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
        pathname: '/attachments/**',
      },
    ],
    // Disable image optimization to avoid Discord CDN issues
    unoptimized: true,
  },
  
  // Note: API requests are now handled by Next.js API routes (app/api/)
  // which proxy to the Express backend using BACKEND_URL environment variable
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: DISCORD_CLIENT_ID ? DISCORD_ORIGIN : '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
