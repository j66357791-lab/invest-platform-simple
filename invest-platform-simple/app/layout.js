// app/layout.js
import './globals.css';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

const inter = Inter({ subsets: ['latin'] });

// 必须单独导出 viewport
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export const metadata = {
  title: '超玩指数 - 游戏道具投资平台',
  description: '专业的游戏道具指数展示与投资平台',
  keywords: '游戏道具, 投资指数, 基金交易, 虚拟资产, K线图',
  authors: [{ name: 'Super Admin' }],
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased min-h-screen flex flex-col`}>
        <Navbar />
        <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <Footer />
        <Toaster 
          position="top-right" 
          richColors 
          closeButton 
          duration={3000}
        />
      </body>
    </html>
  );
}
