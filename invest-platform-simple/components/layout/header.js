'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X, Wallet, User, LogOut, Bell, Settings } from 'lucide-react';
import Button from '@/components/ui/button';

const Header = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      // 调用 API，让服务器验证 Cookie
      const res = await fetch('/api/user', {
        method: 'GET',
        credentials: 'include', // 关键：携带 Cookie
      });
      
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else if (res.status === 401) {
        // 401 时清除所有本地状态
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      }
    } catch (error) {
      console.error('获取用户信息失败', error);
    }
  };

  const handleLogout = () => {
    // 清除前端状态
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    
    // 调用后端登出接口（清除 Cookie）
    fetch('/api/auth/logout', { 
      method: 'POST', 
      credentials: 'include' 
    })
      .then(() => router.push('/login'))
      .catch(() => router.push('/login'));
  };

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <button
              onClick={() => router.push('/')}
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">投</span>
              </div>
              <span className="text-xl font-bold text-gray-900">超玩投资</span>
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => router.push('/')}
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              首页
            </button>
            <button
              onClick={() => router.push('/market')}
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              市场
            </button>
            <button
              onClick={() => router.push('/rankings')}
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              排行榜
            </button>
            {user && (
              <>
                <button
                  onClick={() => router.push('/wallet')}
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  钱包
                </button>
                {user.role === 'admin' && (
                  <button
                    onClick={() => router.push('/admin')}
                    className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    管理后台
                  </button>
                )}
              </>
            )}
          </nav>

          {/* User Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-lg">
                  <Wallet className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-900">
                    ¥{user.balance?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Bell className="h-5 w-5 text-gray-500" />
                  </button>
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-100 p-4 z-50">
                      <h3 className="font-medium text-gray-900 mb-3">通知</h3>
                      <p className="text-sm text-gray-500">暂无新通知</p>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center space-x-2 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{user.username}</span>
                  </button>
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50">
                      <button
                        onClick={() => router.push('/profile')}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                      >
                        <User className="h-4 w-4 mr-3" />
                        个人中心
                      </button>
                      <button
                        onClick={() => router.push('/profile')}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                      >
                        <Settings className="h-4 w-4 mr-3" />
                        设置
                      </button>
                      <hr className="my-2" />
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        退出登录
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/login')}
                >
                  登录
                </Button>
                <Button
                  onClick={() => router.push('/register')}
                >
                  注册
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6 text-gray-500" />
              ) : (
                <Menu className="h-6 w-6 text-gray-500" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <nav className="flex flex-col space-y-3">
              <button
                onClick={() => router.push('/')}
                className="text-left px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                首页
              </button>
              <button
                onClick={() => router.push('/market')}
                className="text-left px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                市场
              </button>
              <button
                onClick={() => router.push('/rankings')}
                className="text-left px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                排行榜
              </button>
              {user ? (
                <>
                  <button
                    onClick={() => router.push('/wallet')}
                    className="text-left px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
                  >
                    钱包
                  </button>
                  {user.role === 'admin' && (
                    <button
                      onClick={() => router.push('/admin')}
                      className="text-left px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      管理后台
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    退出登录
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => router.push('/login')}
                    className="text-left px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
                  >
                    登录
                  </button>
                  <button
                    onClick={() => router.push('/register')}
                    className="text-left px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    注册
                  </button>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
