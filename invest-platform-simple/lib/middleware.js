// lib/middleware.js
import jwt from 'jsonwebtoken';

/**
 * JWT 验证中间件
 * 优先从 Cookie 读取，如果没有则从 Header 读取
 */
export function verifyToken(req) {
  try {
    // 1. 尝试从 Cookie 获取 (用于页面访问时的 middleware 验证)
    let token = req.cookies.get('token')?.value;

    // 2. 如果 Cookie 没有，尝试从 Authorization Header 获取 (用于 API 调用)
    if (!token) {
      const authHeader = req.headers.get('authorization');
      token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    }

    // 3. 检查 token 是否有效
    if (!token || token === 'undefined' || token === 'null' || token === '') {
      return null;
    }

    // 4. 验证并解码
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    // Token 过期或无效
    if (error.name !== 'TokenExpiredError') {
      // console.error('Token 验证失败:', error.message);
    }
    return null;
  }
}

// ... 下面的代码保持不变 ...
export function requireAuth() {
  return async (req) => {
    const user = verifyToken(req);
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, message: '请先登录' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return null;
  };
}

export function requireAdmin() {
  return async (req) => {
    const user = verifyToken(req);
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, message: '请先登录' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return new Response(
        JSON.stringify({ success: false, message: '需要管理员权限' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return null;
  };
}

export async function logOperation({ adminId, action, module, details, req }) {
  try {
    const { AdminLog } = await import('./models.js');
    const ip = req?.headers?.get('x-forwarded-for') || req?.headers?.get('x-real-ip') || '';
    const userAgent = req?.headers?.get('user-agent') || '';
    await AdminLog.create({ adminId, action, module, details, ip, userAgent });
  } catch (error) {
    console.error('记录操作日志失败:', error);
  }
}

export async function getCurrentUser(req) {
  const user = verifyToken(req);
  if (!user) return null;
  try {
    const { User } = await import('./models.js');
    return await User.findById(user.userId);
  } catch (error) {
    return null;
  }
}
