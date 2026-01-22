// app/login/page.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { LogIn, UserPlus, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// 👈 新增：引入全局认证 Hook
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  
  // 👈 新增：获取 login 方法
  const { login } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // 表单数据
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    phone: '',
    inviteCode: '',
  });

  const handleToggle = () => {
    setIsLogin(!isLogin);
    setFormData({ username: '', password: '', email: '', phone: '', inviteCode: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = '/api/auth/' + (isLogin ? 'login' : 'register');
      const payload = isLogin 
        ? { username: formData.username, password: formData.password }
        : { 
            username: formData.username, 
            password: formData.password, 
            email: formData.email,
            phone: formData.phone,
            inviteCode: formData.inviteCode || undefined 
          };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 👈 建议：带上 credentials，确保 Cookie 能正确设置
        credentials: 'include', 
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || '操作失败');
      }

      toast.success(data.message || (isLogin ? '登录成功' : '注册成功'));

      if (isLogin) {
        // 1. 保存 Token (保持兼容性)
        if (data.data.token) {
          localStorage.setItem('token', data.data.token);
        }

        // 👈 2. 关键步骤：调用全局 login，更新用户状态
        // 这一步会让导航栏立刻感知到登录状态
        await login(data.data.user);

        // 3. 跳转首页
        router.push('/');
      } else {
        // 注册成功，切换到登录
        setIsLogin(true);
        toast.info('请使用注册的账号登录');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        {/* 头部 */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl mb-4">
            CW
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            {isLogin ? '欢迎回来' : '创建账户'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin ? '登录以访问您的投资组合' : '加入超玩指数，开启投资之旅'}
          </p>
        </div>

        {/* 切换 Tab */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setIsLogin(true)}
            className={cn(
              "flex-1 pb-4 text-sm font-medium text-center",
              isLogin ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"
            )}
          >
            登录
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={cn(
              "flex-1 pb-4 text-sm font-medium text-center",
              !isLogin ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"
            )}
          >
            注册
          </button>
        </div>

        {/* 表单 */}
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {!isLogin && (
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                邮箱地址
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              {isLogin ? '用户名/手机号' : '用户名'}
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="请输入用户名"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              密码
            </label>
            <div className="mt-1 relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  手机号 (选填)
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="请输入手机号"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700">
                  邀请码 (选填)
                </label>
                <input
                  id="inviteCode"
                  name="inviteCode"
                  type="text"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="请输入邀请码"
                  value={formData.inviteCode}
                  onChange={(e) => setFormData({ ...formData, inviteCode: e.target.value })}
                />
              </div>
            </>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '处理中...' : isLogin ? '登 录' : '注 册'}
            </button>
          </div>
        </form>

        <div className="text-center text-sm text-gray-500">
          {isLogin ? '还没有账号？' : '已有账号？'}
          <button
            type="button"
            onClick={handleToggle}
            className="font-medium text-blue-600 hover:text-blue-500 ml-1"
          >
            {isLogin ? '立即注册' : '立即登录'}
          </button>
        </div>
      </div>
    </div>
  );
}
