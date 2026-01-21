// app/api/products/[id]/kline/route.js
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models';
import { successResponse, errorResponse } from '@/lib/utils';

export async function GET(
  request,
  { params }
) {
  try {
    await connectDB();

    const product = await Product.findById(params.id);
    if (!product) {
      return errorResponse('产品不存在', 404);
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'day'; // day/week/month/year

    // 根据周期聚合价格历史
    let klineData = [];
    
    if (period === 'day') {
      // 日线：直接使用原始数据
      klineData = product.priceHistory.map(p => ({
        date: p.date,
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
        volume: p.volume,
        changePercent: p.changePercent,
      }));
    } else {
      // 周线/月线/年线：需要聚合计算
      const groupBy = period === 'week' ? 'week' : period === 'month' ? 'month' : 'year';
      const groupByField = `$date.${groupBy}`; // MongoDB 的日期分组
      
      // 这里简化处理，实际可以使用 MongoDB 聚合
      // 为了兼容嵌入式文档，我们手动计算
      const grouped = {};
      
      product.priceHistory.forEach(p => {
        const date = new Date(p.date);
        let key;
        
        if (period === 'week') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
        } else if (period === 'month') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        } else {
          key = `${date.getFullYear()}`;
        }
        
        if (!grouped[key]) {
          grouped[key] = {
            date: p.date,
            open: p.open,
            high: p.high,
            low: p.low,
            close: p.close,
            volume: p.volume,
          };
        } else {
          grouped[key].high = Math.max(grouped[key].high, p.high);
          grouped[key].low = Math.min(grouped[key].low, p.low);
          grouped[key].close = p.close;
          grouped[key].volume += p.volume;
        }
      });
      
      klineData = Object.values(grouped).map(k => ({
        date: k.date,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
        volume: k.volume,
        changePercent: ((k.close - k.open) / k.open) * 100,
      }));
    }

    // 按日期排序
    klineData.sort((a, b) => new Date(a.date) - new Date(b.date));

    return successResponse(klineData);

  } catch (error) {
    console.error('[Get Kline Error]', error);
    return errorResponse('获取K线数据失败', 500);
  }
}
