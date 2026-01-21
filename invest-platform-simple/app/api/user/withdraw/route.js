import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Withdraw } from '@/lib/models';
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
    const { amount, bankName, bankAccount, accountName } = body;

    if (!amount || amount <= 0) return NextResponse.json({ success: false, message: '金额必须大于0' }, { status: 400 });

    await connectDB();

    // 生成订单号
    const orderNo = generateOrderNo();

    const withdraw = await Withdraw.create({
      userId: user.userId,
      orderNo,
      amount: parseFloat(amount),
      fee: 0, // 暂无手续费
      actualAmount: parseFloat(amount),
      bankName,
      bankAccount,
      accountName,
      status: 'pending',
    });

    return NextResponse.json({ success: true, data: withdraw, message: '提现申请已提交' });
  } catch (error) {
    console.error('[User Withdraw Error]', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
