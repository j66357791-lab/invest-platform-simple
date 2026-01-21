// components/layout/navbar.js
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, User, LogOut, ShieldCheck, LayoutDashboard, Wallet } from 'lucide-react';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const pathname = usePathname();
  const router = useRouter();

  // 页面加载时从 localStorage 获取用户信息
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // 监听登录状态变化（可选：如果使用 EventSource 或 Context）
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

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
            
            {/* Desktop Nav */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                  isActive('/') 
                    ? 'border-blue-500 text-gray-900' 
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                首页
              </Link>
              <Link
                href="/market"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                  isActive('/market') 
                    ? 'border-blue-500 text-gray-900' 
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                市场行情
              </Link>
            </div>
          </div>

          {/* Desktop Right Menu */}
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
                {/* 管理后台链接：仅管理员可见 */}
                {(user.role === 'admin' || user.role === 'superadmin') && (
                  <Link
                    href="/admin"
                    className={`flex items-center mr-6 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      pathname.startsWith('/admin') 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4 mr-1.5" />
                    管理后台
                  </Link>
                )}

                <Link
                  href="/dashboard"
                  className={`flex items-center mr-4 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive('/dashboard') 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4 mr-1.5" />
                  个人中心
                </Link>
                
                <Link
                  href="/wallet"
                  className={`flex items-center mr-4 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive('/wallet') 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Wallet className="h-4 w-4 mr-1.5" />
                  钱包
                </Link>

                <div className="ml-3 relative flex items-center">
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{user.username}</div>
                      <div className="text-xs text-gray-500">{user.role === 'superadmin' ? '超级管理员' : user.role === 'admin' ? '管理员' : '用户'}</div>
                    </div>
                    <button
                      onClick={handleLogout}
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
                {/* 移动端管理后台入口：仅管理员可见 */}
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
                  href="/dashboard"
                  className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                    isActive('/dashboard') ? 'border-blue-500 text-blue-700 bg-blue-50' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  个人中心
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
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
