import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User, Deposit, Transaction } from '@/lib/models';
import { verifyToken, requireAdmin } from '@/lib/middleware';

// 审批充值 (通过/拒绝)
export async function PATCH(req, { params }) {
  try {
    const authResult = await requireAdmin()(req);
    if (authResult) return authResult;

    const admin = verifyToken(req);
    await connectDB();

    const { id } = params;
    const body = await req.json();
    const { action, remark } = body; // action: 'approve', 'reject'

    const deposit = await Deposit.findById(id);
    if (!deposit) return NextResponse.json({ success: false, message: '订单不存在' }, { status: 404 });

    // 只能审批 reviewing 状态的订单
    if (deposit.status !== 'reviewing') {
      return NextResponse.json({ success: false, message: '订单状态不正确' }, { status: 400 });
    }

    const user = await User.findById(deposit.userId);
    if (!user) return NextResponse.json({ success: false, message: '用户不存在' }, { status: 404 });

    if (action === 'approve') {
      // 通过
      user.balance += deposit.amount;
      user.totalDeposit += deposit.amount;
      await user.save();

      deposit.status = 'completed';
      deposit.reviewedBy = admin.userId;
      deposit.reviewedAt = new Date();
      deposit.reviewRemark = remark;

      // 记录流水
      await Transaction.create({
        txNo: `DEP-${deposit.orderNo}`,
        userId: user._id,
        type: 'deposit',
        amount: deposit.amount,
        balance: user.balance,
        description: '充值入账',
        status: 'completed'
      });

    } else if (action === 'reject') {
      // 拒绝
      deposit.status = 'cancelled';
      deposit.reviewedBy = admin.userId;
      deposit.reviewedAt = new Date();
      deposit.reviewRemark = remark;
    }

    await deposit.save();

    return NextResponse.json({ success: true, message: '操作成功', data: deposit });
  } catch (error) {
    console.error('[Admin Update Deposit Error]', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
