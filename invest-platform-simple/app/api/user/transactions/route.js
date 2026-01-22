import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Transaction, Deposit, Withdraw } from '@/lib/models';
import { verifyToken } from '@/lib/middleware';

export async function GET(req) {
  try {
    const user = verifyToken(req);
    if (!user) return NextResponse.json({ success: false, message: '未登录' }, { status: 401 });

    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // 获取普通交易
    const transactions = await Transaction.find({
      userId: user.userId,
      createdAt: { $gte: cutoffDate }
    }).sort({ createdAt: -1 });

    // 获取充值记录
    const deposits = await Deposit.find({
      userId: user.userId,
      createdAt: { $gte: cutoffDate }
    }).sort({ createdAt: -1 });

    // 获取提现记录
    const withdrawals = await Withdraw.find({
      userId: user.userId,
      createdAt: { $gte: cutoffDate }
    }).sort({ createdAt: -1 });

    // 整合数据
    const history = [];

    deposits.forEach(d => {
      let statusText = '未知';
      if(d.status === 'pending') statusText = '充值中';
      else if(d.status === 'reviewing') statusText = '审核中';
      else if(d.status === 'completed') statusText = '已到账';
      else if(d.status === 'cancelled') statusText = '已取消';
      else if(d.status === 'expired') statusText = '已过期';

      history.push({
        _id: d._id,
        type: 'deposit',
        orderNo: d.orderNo,
        amount: d.amount,
        balance: null, // 这里简化，充值流水在 Transaction 里
        description: '账户充值',
        status: d.status,
        statusText,
        createdAt: d.createdAt
      });
    });

    withdrawals.forEach(w => {
      let statusText = '未知';
      if(w.status === 'pending') statusText = '审批中';
      else if(w.status === 'approved') statusText = '打款中';
      else if(w.status === 'completed') statusText = '已到账';
      else if(w.status === 'rejected') statusText = '已拒绝';

      history.push({
        _id: w._id,
        type: 'withdraw',
        orderNo: w.orderNo,
        amount: -w.amount,
        balance: null,
        description: '账户提现',
        status: w.status,
        statusText,
        createdAt: w.createdAt
      });
    });

    transactions.forEach(t => {
      let statusText = '成功';
      if(t.status === 'pending') statusText = '处理中';
      else if(t.status === 'failed') statusText = '失败';

      history.push({
        _id: t._id,
        type: 'transaction',
        orderNo: t.txNo,
        amount: t.amount,
        balance: t.balance,
        description: t.description,
        status: t.status,
        statusText,
        createdAt: t.createdAt
      });
    });

    history.sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({ success: true, data: history });
  } catch (error) {
    console.error('[Get User Transactions Error]', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
