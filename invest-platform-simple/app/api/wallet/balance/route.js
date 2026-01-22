// app/api/wallet/balance/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { verifyToken } from '@/lib/middleware';

export async function GET(req) {
  try {
    // 1. 验证用户登录（使用与 login/route.js 一致的方式）
    const user = verifyToken(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }

    await connectDB();

    // 2. 从数据库获取用户实时余额
    const userData = await User.findById(user.userId)
      .select('balance frozenBalance isVerified realName idCard idCardFront idCardBack phone email')
      .lean();

    if (!userData) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        balance: userData.balance || 0,
        frozenBalance: userData.frozenBalance || 0,
        isVerified: userData.isVerified || false,
        realName: userData.realName || '',
        idCard: userData.idCard || '',
        phone: userData.phone || '',
        email: userData.email || '',
        hasIdImages: !!(userData.idCardFront && userData.idCardBack)
      }
    });

  } catch (error) {
    console.error('[Get Balance Error]', error);
    return NextResponse.json(
      { success: false, message: '获取余额失败' },
      { status: 500 }
    );
  }
}
