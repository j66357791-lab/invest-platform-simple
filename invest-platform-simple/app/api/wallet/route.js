// app/api/wallet/withdraw/route.js
import { connectDB } from '@/lib/db';
import { User, Withdraw, Transaction } from '@/lib/models';
import { requireAuth } from '@/lib/middleware';
import { generateTxNo, successResponse, errorResponse, parsePagination, buildPaginationResponse } from '@/lib/utils';

export async function POST(request) {
  try {
    await connectDB();

    const authUser = await requireAuth(request);
    if (!authUser) {
      return errorResponse('请先登录', 401);
    }

    const { amount, bankName, bankAccount, accountName } = await request.json();

    // 验证参数
    if (!amount || amount < 100) {
      return errorResponse('最低提现金额为 100 元');
    }

    if (!bankName || !bankAccount || !accountName) {
      return errorResponse('请填写完整的银行信息');
    }

    // 获取用户信息
    const user = await User.findById(authUser.userId);
    
    // 检查是否实名认证
    if (!user.isVerified) {
      return errorResponse('请先完成实名认证', 403);
    }

    // 检查余额
    if (user.balance < amount) {
      return errorResponse('余额不足');
    }

    // 冻结提现金额
    user.balance -= amount;
    user.frozenBalance += amount;
    await user.save();

    // 创建提现申请
    const withdraw = await Withdraw.create({
      userId: authUser.userId,
      amount,
      fee: 0, // 暂不收手续费
      actualAmount: amount,
      bankName,
      bankAccount,
      accountName,
    });

    // 创建交易流水
    const transaction = await Transaction.create({
      txNo: generateTxNo(),
      userId: authUser.userId,
      type: 'withdraw',
      amount: -amount,
      balance: user.balance,
      frozen: amount,
      status: 'pending',
      description: `提现 ${amount} 元`,
    });

    return successResponse({ withdraw, transaction }, '提现申请已提交，等待审核');

  } catch (error) {
    console.error('[Withdraw Error]', error);
    return errorResponse('提现申请失败', 500);
  }
}

// GET - 获取提现记录
export async function GET(request) {
  try {
    await connectDB();

    const authUser = await requireAuth(request);
    if (!authUser) {
      return errorResponse('请先登录', 401);
    }

    const { page, pageSize, skip } = parsePagination(request.nextUrl.searchParams);

    const total = await Withdraw.countDocuments({ userId: authUser.userId });
    const withdraws = await Withdraw.find({ userId: authUser.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);

    return successResponse(buildPaginationResponse(withdraws, total, page, pageSize));

  } catch (error) {
    console.error('[Get Withdraws Error]', error);
    return errorResponse('获取提现记录失败', 500);
  }
}
