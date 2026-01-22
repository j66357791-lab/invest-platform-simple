'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 初始化：检查用户是否登录
  useEffect(() => {
    async function loadUser() {
      console.log('[Auth] 正在检查登录状态...');
      try {
        // 1. 尝试从 API 获取（基于 Cookie 或 Bearer Token）
        const res = await fetch('/api/user', {
          credentials: 'include',
        });

        let apiUser = null;

        // 如果 API 返回成功，提取用户信息
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            apiUser = data.data;
            console.log('[Auth] 从 API 获取到用户:', apiUser.username);
          }
        }

        // 2. 无论 API 成功与否，都检查一下 localStorage (作为保底)
        // 这保证了即使后端报错或 Cookie 丢失，只要本地有数据，前端就显示登录状态
        const storedUserStr = localStorage.getItem('user');
        let storedUser = null;
        if (storedUserStr) {
          try {
            storedUser = JSON.parse(storedUserStr);
          } catch (e) {
            console.error('[Auth] localStorage 解析失败，清除脏数据');
            localStorage.removeItem('user');
          }
        }

        // 3. 决定最终使用哪个数据
        // 如果 API 有数据，优先用 API 的（保证实时性），并同步到 localStorage
        if (apiUser) {
          setUser(apiUser);
          localStorage.setItem('user', JSON.stringify(apiUser));
        } 
        // 如果 API 没数据，但 localStorage 有数据，就用 localStorage 的（保证刷新不掉线）
        else if (storedUser) {
          console.log('[Auth] API 获取失败，使用 localStorage 缓存:', storedUser.username);
          setUser(storedUser);
        } 
        // 两个都没有，那就是真的没登录
        else {
          console.log('[Auth] 未找到登录信息');
          setUser(null);
        }

      } catch (error) {
        console.error('[Auth] 获取用户信息发生错误:', error);
        // 发生网络错误等异常时，尝试回退到 localStorage
        const storedUserStr = localStorage.getItem('user');
        if (storedUserStr) {
          try {
            setUser(JSON.parse(storedUserStr));
            console.log('[Auth] 发生错误，回退到 localStorage');
          } catch (e) { setUser(null); }
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  // 登录动作
  const login = async (userData) => {
    console.log('[Auth] 登录成功，更新全局状态:', userData.username);
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // 登出动作
  const logout = async () => {
    console.log('[Auth] 执行退出登录');
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('[Auth] 登出请求失败', error);
    } finally {
      // 只有用户主动点退出时，才真正清除本地数据
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
