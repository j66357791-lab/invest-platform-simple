import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models';

export async function GET(req) {
  try {
    await connectDB();
    
    // 查找所有活跃产品
    const products = await Product.find({ isActive: true });
    const now = new Date();
    let updateCount = 0;

    for (const product of products) {
      const currentPrice = product.currentPrice;
      if (!currentPrice) continue;

      // ==========================================
      // 1. 市场动能机制 (平滑波动核心)
      // ==========================================
      let priceChange = 0;

      if (product.momentum && Math.abs(product.momentum) > 0.01) {
        // 每次消耗动能的 20% (意味着动能大约会持续 5 分钟释放完毕)
        // 这就是你要求的“慢慢涨幅”的效果
        const momentumStep = product.momentum * 0.2;
        priceChange += momentumStep;
        
        // 剩下的动能减少
        product.momentum -= momentumStep;
        
        // 如果动能很小了，直接归零
        if (Math.abs(product.momentum) < 0.01) product.momentum = 0;
      }

      // ==========================================
      // 2. 管理员策略机制 (大方向)
      // ==========================================
      // 只有在用户没有产生强烈动能干扰时，策略才主导
      // 或者是两者叠加
      if (product.strategyType && product.strategyType !== 'market') {
        const basePrice = product.openPrice || product.closePrice || product.currentPrice;
        const targetPrice = basePrice * (1 + product.strategyTargetPercent / 100);
        const duration = product.strategyTargetMinutes || 60;
        
        // 策略步长：目标价 - 当前价，除以剩余时间(默认假设每分钟走一步)
        // 简化：让它朝目标价走 0.1%
        const strategyStep = (targetPrice - currentPrice) * 0.02; 
        priceChange += strategyStep;
      }

      // ==========================================
      // 3. 涨跌停熔断
      // ==========================================
      const basePrice = product.openPrice || product.closePrice || product.currentPrice;
      let newPrice = currentPrice + priceChange;
      
      if (basePrice > 0) {
        const changePercent = ((newPrice - basePrice) / basePrice) * 100;
        if (product.limitUpPercent > 0 && changePercent >= product.limitUpPercent) {
          newPrice = basePrice * (1 + product.limitUpPercent / 100); // 涨停封板
        }
        if (product.limitDownPercent > 0 && changePercent <= (product.limitDownPercent * -1)) {
          newPrice = basePrice * (1 - product.limitDownPercent / 100); // 跌停
        }
      }

      // ==========================================
      // 4. 生成分钟线 K (修复无柱状波动)
      // ==========================================
      product.currentPrice = newPrice;
      
      const lastKline = product.minuteKlineData.length > 0 
        ? product.minuteKlineData[product.minuteKlineData.length - 1] 
        : null;

      const currentTimestamp = Math.floor(now / 60000) * 60000 * 1000;
      const lastTime = lastKline ? lastKline.date.getTime() : 0;

      if (lastKline && lastTime === currentTimestamp) {
        // 更新当前分钟
        lastKline.close = newPrice;
        lastKline.high = Math.max(lastKline.high, newPrice);
        lastKline.low = Math.min(lastKline.low, newPrice);
      } else {
        // 新开一分钟
        // 🔑 修复：添加随机波动，保证 K 线有形状
        // 假设每分钟的自然波动是价格的 +/- 0.05%
        const volatility = currentPrice * 0.0005;
        const randomOpen = currentPrice * (1 + (Math.random() - 0.5) * 0.1);
        
        product.minuteKlineData.push({
          date: new Date(currentTimestamp),
          open: randomOpen, // 开盘价可能和前几秒不一样，造成实体
          close: newPrice,
          high: Math.max(randomOpen, newPrice) + Math.random() * volatility, // 随机上影线
          low: Math.min(randomOpen, newPrice) - Math.random() * volatility,  // 随机下影线
          volume: 0
        });
        if (product.minuteKlineData.length > 1440) product.minuteKlineData.shift();
      }

      await product.save();
      updateCount++;
    }

    return NextResponse.json({
      success: true,
      message: `平滑市场更新完成`,
      data: { timestamp: now, updatedCount: updateCount }
    });

  } catch (error) {
    console.error('[Cron Error]', error);
    return NextResponse.json({ success: false, message: '更新失败' }, { status: 500 });
  }
}
