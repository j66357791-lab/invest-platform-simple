/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // 环境变量
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
  },

  // 图片优化
  images: {
    domains: ['your-cdn-domain.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // 生产环境优化
  swcMinify: true,
  compress: true,
  
  // 日志配置
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig;
