import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Deposit } from '@/lib/models';
import { verifyToken } from '@/lib/middleware';

export async function POST(req, { params }) {
  try {
    const { id } = await params; // 🔑 新增这一行
    const user = verifyToken(req);
    if (!user) return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });

    await connectDB();

    const deposit = await Deposit.findById(id);

    if (!deposit) {
      return NextResponse.json({ success: false, message: '订单不存在' }, { status: 404 });
    }

    // 只有 pending 状态且未过期的订单可以确认
    if (deposit.status !== 'pending') {
      return NextResponse.json({ success: false, message: '订单状态异常' }, { status: 400 });
    }

    const now = new Date();
    if (now > deposit.expiresAt) {
      // 自动过期
      deposit.status = 'expired';
      await deposit.save();
      return NextResponse.json({ success: false, message: '订单已过期' }, { status: 400 });
    }

    // 确认支付 -> 变为审核中
    deposit.status = 'reviewing';
    deposit.paidAt = now;
    await deposit.save();

    return NextResponse.json({ success: true, message: '已提交审核，请等待管理员到账', data: deposit });
  } catch (error) {
    console.error('确认支付失败:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
