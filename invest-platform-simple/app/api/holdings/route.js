// app/api/holdings/route.js
import { connectDB } from '@/lib/db';
import { Holding, User } from '@/lib/models';
import { requireAuth } from '@/lib/middleware';
import { successResponse, errorResponse } from '@/lib/utils';

export async function GET(request) {
  try {
    await connectDB();

    const authUser = await requireAuth(request);
    if (!authUser) {
      return errorResponse('请先登录', 401);
    }

    const userId = authUser.userId;

    // 1. 获取用户资产
    const user = await User.findById(userId).select('balance frozenBalance commissionBalance');
    
    // 2. 获取持仓列表
    const holdings = await Holding.find({ 
      userId,
      status: 'active' 
    })
      .populate('productId', 'name code currentPrice category dailyChange imageUrl')
      .sort({ updatedAt: -1 });

    // 3. 计算汇总数据
    let totalMarketValue = 0;
    let totalProfit = 0;
    let totalCost = 0;

    holdings.forEach(holding => {
      const marketValue = holding.amount * holding.currentPrice;
      totalMarketValue += marketValue;
      totalCost += holding.amount * holding.avgPrice;
      totalProfit += holding.currentProfit || 0;
    });

    const profitRate = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

    return successResponse({
      holdings,
      userAssets: {
        balance: user.balance || 0,
        totalMarketValue,
        totalProfit,
        profitRate,
        totalAssets: user.balance + totalMarketValue,
      }
    });

  } catch (error) {
    console.error('[Get Holdings Error]', error);
    return errorResponse('获取持仓列表失败', 500);
  }
}
