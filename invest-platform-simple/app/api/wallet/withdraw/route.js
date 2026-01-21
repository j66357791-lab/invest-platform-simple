// app/api/wallet/withdraw/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User, Withdraw, Transaction } from '@/lib/models';
import { verifyToken } from '@/lib/middleware';

export async function POST(req) {
  try {
    const user = verifyToken(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await req.json();
    const { amount, bankName, bankAccount } = body;

    // 验证参数
    if (!amount || amount < 100) {
      return NextResponse.json(
        { success: false, message: '最低提现金额为 100 元' },
        { status: 400 }
      );
    }

    if (!bankName || !bankAccount) {
      return NextResponse.json(
        { success: false, message: '请填写完整的银行信息' },
        { status: 400 }
      );
    }

    // 获取用户信息
    const userData = await User.findById(user.userId);
    
    // 检查是否实名认证
    if (!userData.isVerified) {
      return NextResponse.json(
        { success: false, message: '请先完成实名认证' },
        { status: 403 }
      );
    }

    // 检查余额
    if (userData.balance < amount) {
      return NextResponse.json(
        { success: false, message: '余额不足' },
        { status: 400 }
      );
    }

    // 冻结提现金额
    userData.balance -= amount;
    userData.frozenBalance += amount;
    await userData.save();

    // 创建提现申请（包含用户实名信息）
    const withdraw = await Withdraw.create({
      userId: user.userId,
      amount,
      fee: 0,
      actualAmount: amount,
      bankName,
      bankAccount,
      accountName: userData.realName,  // ✅ 包含实名姓名
      idCard: userData.idCard,         // ✅ 包含身份证号
      phone: userData.phone,          // ✅ 包含手机号
      status: 'pending',               // 已申请
    });

    // 创建交易流水
    await Transaction.create({
      txNo: `TX${Date.now()}${Math.floor(Math.random() * 10000)}`,
      userId: user.userId,
      type: 'withdraw',
      amount: -amount,
      balance: userData.balance,
      frozen: amount,
      status: 'pending',
      description: `提现申请 ${amount} 元`,
    });

    return NextResponse.json({
      success: true,
      message: '提现申请已提交，等待审核',
      data: withdraw
    });

  } catch (error) {
    console.error('提现申请失败:', error);
    return NextResponse.json(
      { success: false, message: '提现申请失败' },
      { status: 500 }
    );
  }
}

// GET - 获取提现记录
export async function GET(req) {
  try {
    const user = verifyToken(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');

    const query = { userId: user.userId };
    if (status) query.status = status;

    const withdraws = await Withdraw.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Withdraw.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: {
        data: withdraws,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });

  } catch (error) {
    console.error('获取提现记录失败:', error);
    return NextResponse.json(
      { success: false, message: '获取提现记录失败' },
      { status: 500 }
    );
  }
}
