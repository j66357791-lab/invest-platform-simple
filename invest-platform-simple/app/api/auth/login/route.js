// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';

export async function POST(req) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: '请输入用户名和密码' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({
      $or: [
        { username },
        { phone: username }
      ]
    }).select('+password');

    if (!user) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 401 }
      );
    }

    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: '密码错误' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: '账户已被禁用' },
        { status: 403 }
      );
    }

    if (user.isFrozen) {
      return NextResponse.json(
        { success: false, message: '账户已被冻结' },
        { status: 403 }
      );
    }

    // 生成 JWT Token
    const token = jwt.sign(
      { 
        userId: user._id.toString(),
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // 更新最后登录时间
    const headersList = headers();
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || '';
    
    await User.findByIdAndUpdate(user._id, {
      lastLoginAt: new Date(),
      lastLoginIp: ip,
    });

    // ===== 关键修改：设置 Cookie =====
    const response = NextResponse.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          role: user.role,
          balance: user.balance,
          isVerified: user.isVerified,
          realName: user.realName,
        },
      },
    });

    // 将 token 写入 Cookie，供 middleware.js 使用
    // httpOnly: true 防止 XSS 攻击，前端 JS 无法读取（为了安全，但我们需要 localStorage 给前端 UI 用，所以两个并存）
    // 注意：这里为了简单，允许 JS 读取以便同步，或者你可以只依赖 Cookie
    response.cookies.set('token', token, {
      httpOnly: false, // 设为 false 以便前端也能在需要时读取（虽然我们主要靠 localStorage 给 UI 用）
      secure: process.env.NODE_ENV === 'production', // 生产环境必须是 https
      sameSite: 'lax', // 防止 CSRF
      maxAge: 60 * 60 * 24 * 7, // 7天
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('登录错误:', error);
    return NextResponse.json(
      { success: false, message: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}
