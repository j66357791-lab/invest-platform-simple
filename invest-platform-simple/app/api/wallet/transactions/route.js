// app/api/wallet/transactions/route.js
import { connectDB } from '@/lib/db';
import { Transaction } from '@/lib/models';
import { requireAuth } from '@/lib/middleware';
import { parsePagination, buildPaginationResponse, successResponse, errorResponse } from '@/lib/utils';

export async function GET(request) {
  try {
    await connectDB();

    const authUser = await requireAuth(request);
    if (!authUser) {
      return errorResponse('请先登录', 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const { page, pageSize, skip } = parsePagination(searchParams);

    // 筛选条件
    const filter = { userId: authUser.userId };
    
    // 类型筛选
    const type = searchParams.get('type');
    if (type) {
      filter.type = type;
    }

    // 日期筛选
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // 查询总数
    const total = await Transaction.countDocuments(filter);

    // 查询列表
    const transactions = await Transaction.find(filter)
      .populate('productId', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);

    return successResponse(
      buildPaginationResponse(transactions, total, page, pageSize)
    );

  } catch (error) {
    console.error('[Get Transactions Error]', error);
    return errorResponse('获取交易流水失败', 500);
  }
}
