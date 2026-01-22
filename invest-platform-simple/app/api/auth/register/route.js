// app/api/auth/register/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { hashPassword, generateInviteCode } from '@/lib/auth';

export async function POST(req) {
  try {
    const { username, password, email, phone, inviteCode } = await req.json();

    // 参数校验
    if (!username || !password || !email) {
      return NextResponse.json(
        { success: false, message: '请填写完整的注册信息' },
        { status: 400 }
      );
    }

    // 连接数据库
    await connectDB();

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: '用户名已存在' },
        { status: 400 }
      );
    }

    // 检查邮箱是否已存在
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return NextResponse.json(
        { success: false, message: '邮箱已被注册' },
        { status: 400 }
      );
    }

    // 检查手机号是否已存在
    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return NextResponse.json(
          { success: false, message: '手机号已被注册' },
          { status: 400 }
        );
      }
    }

    // 处理邀请码
    let invitedBy = null;
    if (inviteCode) {
      const inviter = await User.findOne({ inviteCode });
      if (inviter) {
        invitedBy = inviter._id;
      }
    }

    // 生成用户自己的邀请码
    const myInviteCode = generateInviteCode();

    // 加密密码
    const hashedPassword = await hashPassword(password);

    // 创建用户
    const user = await User.create({
      username,
      password: hashedPassword,
      email,
      phone,
      inviteCode: myInviteCode,
      invitedBy,
      role: 'user',
      isActive: true,
      balance: 0,
      frozenBalance: 0,
    });

    return NextResponse.json({
      success: true,
      message: '注册成功',
      data: {
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          phone: user.phone,
          inviteCode: user.inviteCode,
        },
      },
    });
  } catch (error) {
    console.error('注册失败:', error);
    return NextResponse.json(
      { success: false, message: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}
