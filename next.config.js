/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/ProPicks',
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'a.espncdn.com',
      },
      {
        protocol: 'https',
        hostname: '*.espncdn.com',
      },
      {
        protocol: 'https',
        hostname: 'media.espn.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.nba.com',
      },
      {
        protocol: 'https',
        hostname: 'img.mlbstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.nhle.com',
      },
    ],
  },
};

module.exports = nextConfig;
