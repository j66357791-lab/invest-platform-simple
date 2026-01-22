'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, User, LogOut, ShieldCheck, Wallet } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const isActive = (path) => pathname === path;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold mr-2">
                超玩
              </div>
              <span className="text-xl font-bold text-gray-900">指数</span>
            </Link>
            
            {/* Desktop Nav: 左侧固定链接 */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                  isActive('/') ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                首页
              </Link>
              <Link
                href="/market"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                  isActive('/market') ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                市场行情
              </Link>
            </div>
          </div>

          {/* Desktop Nav: 右侧用户操作（唯一的地方） */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {!user ? (
              <>
                <Link
                  href="/login"
                  className="text-gray-900 hover:text-blue-600 px-3 py-2 text-sm font-medium"
                >
                  登录
                </Link>
                <Link
                  href="/login?mode=register"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  注册
                </Link>
              </>
            ) : (
              <>
                {/* 管理员入口 */}
                {(user.role === 'admin' || user.role === 'superadmin') && (
                  <Link
                    href="/admin"
                    className="flex items-center mr-4 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <ShieldCheck className="h-4 w-4 mr-1.5" />
                    管理后台
                  </Link>
                )}

                {/* 钱包入口 */}
                <Link
                  href="/wallet"
                  className={`flex items-center mr-4 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive('/wallet') ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Wallet className="h-4 w-4 mr-1.5" />
                  钱包
                </Link>

                {/* 用户信息 + 退出 */}
                <div className="ml-3 relative flex items-center">
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{user.username}</div>
                      <div className="text-xs text-gray-500">
                        {user.role === 'superadmin' ? '超级管理员' : user.role === 'admin' ? '管理员' : '用户'}
                      </div>
                    </div>
                    <button
                      onClick={logout}
                      className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                      title="退出登录"
                    >
                      <LogOut className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="sm:hidden border-t border-gray-200">
          <div className="pt-2 pb-3 space-y-1">
            <Link
              href="/"
              className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                isActive('/') ? 'border-blue-500 text-blue-700 bg-blue-50' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300'
              }`}
              onClick={() => setIsOpen(false)}
            >
              首页
            </Link>
            <Link
              href="/market"
              className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                isActive('/market') ? 'border-blue-500 text-blue-700 bg-blue-50' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300'
              }`}
              onClick={() => setIsOpen(false)}
            >
              市场行情
            </Link>

            {user ? (
              <>
                {(user.role === 'admin' || user.role === 'superadmin') && (
                  <Link
                    href="/admin"
                    className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                      pathname.startsWith('/admin') ? 'border-blue-500 text-blue-700 bg-blue-50' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    管理后台
                  </Link>
                )}

                <Link
                  href="/wallet"
                  className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                    isActive('/wallet') ? 'border-blue-500 text-blue-700 bg-blue-50' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  我的钱包
                </Link>

                <button
                  onClick={() => {
                    logout();
                    setIsOpen(false);
                  }}
                  className="w-full text-left block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                >
                  退出登录
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                  onClick={() => setIsOpen(false)}
                >
                  登录
                </Link>
                <Link
                  href="/login?mode=register"
                  className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                  onClick={() => setIsOpen(false)}
                >
                  注册
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
