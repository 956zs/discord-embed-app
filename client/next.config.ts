import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允許 Discord Embedded App 的跨域請求
  allowedDevOrigins: [
    "https://1401130025411018772.discordsays.com",
  ],
  
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3008/api/:path*',
      },
    ];
  },
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://1401130025411018772.discordsays.com',
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
