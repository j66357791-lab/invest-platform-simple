// app/api/wallet/deposit/route.js
import { connectDB } from '@/lib/db';
import { User, Deposit, Transaction } from '@/lib/models';
import { requireAuth } from '@/lib/middleware';
import { generateTxNo, successResponse, errorResponse } from '@/lib/utils';

export async function POST(request) {
  try {
    await connectDB();

    const authUser = await requireAuth(request);
    if (!authUser) {
      return errorResponse('请先登录', 401);
    }

    const { amount, paymentMethod = 'manual', proofImage } = await request.json();

    // 验证金额
    if (!amount || amount < 100) {
      return errorResponse('最低充值金额为 100 元');
    }

    // 创建充值申请
    const deposit = await Deposit.create({
      userId: authUser.userId,
      amount: Number(amount),
      paymentMethod,
      proofImage,
    });

    // 创建待处理的交易流水
    const transaction = await Transaction.create({
      txNo: generateTxNo(),
      userId: authUser.userId,
      type: 'deposit',
      amount,
      balance: 0, // 审核通过后更新
      status: 'pending',
      description: `充值 ${amount} 元`,
    });

    return successResponse({ deposit, transaction }, '充值申请已提交，等待审核');

  } catch (error) {
    console.error('[Deposit Error]', error);
    return errorResponse('充值申请失败', 500);
  }
}

// GET - 获取充值记录
export async function GET(request) {
  try {
    await connectDB();

    const authUser = await requireAuth(request);
    if (!authUser) {
      return errorResponse('请先登录', 401);
    }

    const { page, pageSize, skip } = parsePagination(request.nextUrl.searchParams);

    const total = await Deposit.countDocuments({ userId: authUser.userId });
    const deposits = await Deposit.find({ userId: authUser.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);

    return successResponse(buildPaginationResponse(deposits, total, page, pageSize));

  } catch (error) {
    console.error('[Get Deposits Error]', error);
    return errorResponse('获取充值记录失败', 500);
  }
}
