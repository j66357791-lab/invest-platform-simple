// app/api/admin/users/[id]/balance/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User, Transaction } from '@/lib/models';
import { verifyToken, requireAdmin } from '@/lib/middleware';

export async function POST(req, { params }) {
  try {
    const { id } = await params; // 🔑 新增这一行
    const authResult = await requireAdmin()(req);
    if (authResult) return authResult;
    
    const adminUser = verifyToken(req);
    const { amount, type, remark } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, message: '金额必须大于0' }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ success: false, message: '用户不存在' }, { status: 404 });
    }

    // 计算变更
    const changeAmount = type === 'add' ? amount : -amount;
    const oldBalance = user.balance;
    const newBalance = oldBalance + changeAmount;

    // 扣款时检查余额是否足够
    if (type === 'sub' && newBalance < 0) {
      return NextResponse.json({ success: false, message: '用户余额不足，无法扣减' }, { status: 400 });
    }

    // 更新余额
    user.balance = newBalance;
    await user.save();

    // 记录流水
    await Transaction.create({
      txNo: `ADJ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: user._id,
      type: type === 'add' ? 'deposit' : 'withdraw', // 记录为充值或提现类型
      amount: Math.abs(changeAmount),
      balance: newBalance,
      description: `管理员${type === 'add' ? '增加' : '扣减'}余额`,
      remark: `${remark} (操作员: ${adminUser.username})`,
      status: 'completed',
    });

    return NextResponse.json({
      success: true,
      message: '余额调整成功',
      data: { balance: newBalance },
    });
  } catch (error) {
    console.error('调整余额失败:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
