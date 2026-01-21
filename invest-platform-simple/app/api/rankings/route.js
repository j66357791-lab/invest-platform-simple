// app/api/rankings/route.js
import { connectDB } from '@/lib/db';
import { Product, Holding, Order } from '@/lib/models';
import { successResponse, errorResponse } from '@/lib/utils';

export async function GET(request) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'hot'; // hot/popular, daily, weekly, monthly, yearly

    let rankings = [];

    if (type === 'hot' || type === 'popular') {
      // 人气排行榜（按交易量）
      rankings = await Product.find({ isActive: true })
        .sort({ volume24h: -1 })
        .limit(20)
        .select('name code category currentPrice dailyChange volume24h imageUrl');

    } else {
      // 涨跌幅排行榜
      const sortField = {
        daily: 'dailyChange',
        weekly: 'weeklyChange',
        monthly: 'monthlyChange',
        yearly: 'yearlyChange',
      }[type] || 'dailyChange';

      rankings = await Product.find({ isActive: true })
        .sort({ [sortField]: -1 })
        .limit(20)
        .select('name code category currentPrice dailyChange weeklyChange monthlyChange yearlyChange imageUrl');
    }

    return successResponse(rankings);

  } catch (error) {
    console.error('[Get Rankings Error]', error);
    return errorResponse('获取排行榜失败', 500);
  }
}
