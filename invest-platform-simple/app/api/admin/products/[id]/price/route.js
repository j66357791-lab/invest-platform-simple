// app/api/admin/products/[id]/price/route.js
import { connectDB } from '@/lib/db';
import { Product, Holding } from '@/lib/models';
import { requireAdmin, logOperation } from '@/lib/middleware';
import { successResponse, errorResponse, calculateProfit } from '@/lib/utils';

export async function PUT(
  request,
  { params }
) {
  try {
    await connectDB();

    const authUser = await requireAdmin(request);
    if (!authUser) {
      return errorResponse('权限不足', 403);
    }

    const { price, open, high, low, volume, date } = await request.json();

    const product = await Product.findById(params.id);
    if (!product) {
      return errorResponse('产品不存在', 404);
    }

    const previousPrice = product.currentPrice;
    const updateDate = date ? new Date(date) : new Date();

    // 计算涨跌幅
    const changePercent = previousPrice > 0 
      ? ((price - previousPrice) / previousPrice) * 100 
      : 0;

    // 更新产品信息
    product.currentPrice = price;
    product.openPrice = open || price;
    product.highPrice = high || Math.max(product.highPrice || price, price);
    product.lowPrice = low || Math.min(product.lowPrice || price, price);
    product.dailyChange = changePercent;
    product.volume24h = volume || 0;

    // 计算周/月/年涨跌幅
    const calculatePeriodChange = (days) => {
      const targetDate = new Date(updateDate);
      targetDate.setDate(targetDate.getDate() - days);
      
      const historyEntry = product.priceHistory.find(
        p => new Date(p.date) <= targetDate
      );
      
      if (historyEntry && historyEntry.close > 0) {
        return ((price - historyEntry.close) / historyEntry.close) * 100;
      }
      return 0;
    };

    product.weeklyChange = calculatePeriodChange(7);
    product.monthlyChange = calculatePeriodChange(30);
    product.yearlyChange = calculatePeriodChange(365);

    // 添加价格历史记录
    product.priceHistory.push({
      date: updateDate,
      open: open || price,
      high: high || price,
      low: low || price,
      close: price,
      volume: volume || 0,
      changePercent,
    });

    // 限制价格历史记录数量（可选，防止文档过大）
    if (product.priceHistory.length > 1000) {
      product.priceHistory = product.priceHistory.slice(-1000);
    }

    await product.save();

    // 更新所有持仓的收益
    const holdings = await Holding.find({
      productId: params.id,
      status: 'active',
    });

    for (const holding of holdings) {
      const profit = calculateProfit(holding.amount, price, holding.avgPrice);
      holding.currentPrice = price;
      holding.marketValue = holding.amount * price;
      holding.currentProfit = profit.profit;
      holding.profitRate = profit.profitRate;
      
      // 检查止盈止损
      if (product.stopProfit && product.stopProfit > 0) {
        const stopProfitPrice = holding.avgPrice * (1 + product.stopProfit / 100);
        if (price >= stopProfitPrice) {
          holding.status = 'stop_profit';
        }
      }
      
      if (product.stopLoss && product.stopLoss > 0) {
        const stopLossPrice = holding.avgPrice * (1 - product.stopLoss / 100);
        if (price <= stopLossPrice) {
          holding.status = 'stop_loss';
        }
      }
      
      await holding.save();
    }

    // 记录操作日志
    await logOperation({
      adminId: authUser.userId,
      action: 'update_price',
      module: 'product',
      detail: {
        productId: product._id,
        name: product.name,
        previousPrice,
        newPrice: price,
        changePercent,
      },
      ip: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
    });

    return successResponse(product, '价格更新成功');

  } catch (error) {
    console.error('[Admin Update Price Error]', error);
    return errorResponse('更新价格失败', 500);
  }
}
