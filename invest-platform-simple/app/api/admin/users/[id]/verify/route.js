import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { User } from '@/lib/models';
import { connectDB } from '@/lib/db';

export async function POST(request) {
  try {
    // ✅ 关键修复：必须与 route.js 使用完全一致的 Header 解析方式
    const authHeader = request.headers.get('authorization');
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      return NextResponse.json({ message: '未登录' }, { status: 401 });
    }

    // ✅ 验证 Token
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: 'Token 无效' }, { status: 401 });
    }

    // 查询用户
    await connectDB();
    const user = await User.findById(decoded.userId);

    if (!user) {
      return NextResponse.json({ message: '用户不存在' }, { status: 404 });
    }

    // 获取提交的数据
    const body = await request.json();
    const { realName, idCard, idCardFront, idCardBack } = body;

    // 简单校验
    if (!realName || !idCard) {
      return NextResponse.json({ message: '请填写完整信息' }, { status: 400 });
    }

    // 更新用户实名信息
    user.realName = realName;
    user.idCard = idCard;
    user.idCardFront = idCardFront;
    user.idCardBack = idCardBack;
    user.isVerified = true; // 或者设置为 'pending' 如果需要人工审核
    // 如果需要人工审核，可以使用: user.verifyStatus = 'pending';
    
    await user.save();

    return NextResponse.json({ 
      success: true, 
      message: '实名认证信息提交成功',
      data: { isVerified: true }
    });

  } catch (error) {
    console.error('实名认证错误:', error);
    return NextResponse.json({ message: '服务器错误' }, { status: 500 });
  }
}
