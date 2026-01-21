import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Deposit } from '@/lib/models';
import { verifyToken } from '@/lib/middleware';

// 生成6位随机数字
function generateOrderNo() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req) {
  try {
    const user = verifyToken(req);
    if (!user) return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });

    const body = await req.json();
    const { amount } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, message: '金额必须大于0' }, { status: 400 });
    }

    await connectDB();

    const orderNo = generateOrderNo();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15分钟后过期

    const deposit = await Deposit.create({
      userId: user.userId,
      orderNo,
      amount: parseFloat(amount),
      paymentMethod: 'alipay',
      targetAccount: '18679012034',
      status: 'pending',
      expiresAt,
    });

    return NextResponse.json({ success: true, data: deposit });
  } catch (error) {
    console.error('创建充值订单失败:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
