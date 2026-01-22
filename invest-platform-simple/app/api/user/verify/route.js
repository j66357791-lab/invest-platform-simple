// app/api/user/verify/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { verifyToken } from '@/lib/middleware';

export async function POST(req) {
  try {
    // 1. 验证用户登录
    const user = verifyToken(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await req.json();
    const { realName, idCard, idCardFront, idCardBack } = body;

    // 2. 验证参数
    if (!realName || !idCard) {
      return NextResponse.json(
        { success: false, message: '请填写完整的实名信息' },
        { status: 400 }
      );
    }

    // 验证身份证格式（简单验证）
    const idCardRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
    if (!idCardRegex.test(idCard)) {
      return NextResponse.json(
        { success: false, message: '身份证号格式不正确' },
        { status: 400 }
      );
    }

    // 3. 更新用户实名信息
    const updatedUser = await User.findByIdAndUpdate(
      user.userId,
      {
        realName,
        idCard,
        idCardFront: idCardFront || '',
        idCardBack: idCardBack || '',
        // 注意：不自动设置为已认证，需要管理员审核
        // isVerified: true,
        // verifiedAt: new Date()
      },
      { new: true }
    ).select('-password');

    return NextResponse.json({
      success: true,
      message: '实名信息提交成功，等待管理员审核',
      data: {
        realName: updatedUser.realName,
        idCard: updatedUser.idCard,
        isVerified: updatedUser.isVerified
      }
    });

  } catch (error) {
    console.error('提交实名认证失败:', error);
    return NextResponse.json(
      { success: false, message: '提交失败' },
      { status: 500 }
    );
  }
}
