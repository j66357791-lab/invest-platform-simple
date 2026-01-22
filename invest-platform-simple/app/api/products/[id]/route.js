// app/api/products/[id]/route.js
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models';

// 🔑 核心工具：根据策略计算当前价格
function applyStrategy(product) {
  if (product.strategyType === 'market') return product; // 自由市场不干预

  const now = new Date();
  const lastUpdate = product.lastStrategyUpdateAt ? new Date(product.lastStrategyUpdateAt) : new Date(product.createdAt);
  
  // 计算距离上次更新过了多少分钟
  const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);

  // 如果还没到 0.1 分钟，就不更新（避免频率太高）
  if (diffMinutes < 0.1) return product;

  const totalMinutes = product.strategyTargetMinutes || 1;
  const totalPercent = product.strategyTargetPercent || 0;
  
  // 计算每分钟应该涨跌多少
  const percentPerMinute = totalPercent / totalMinutes;
  
  // 计算这次应该涨跌多少
  const changePercent = diffMinutes * percentPerMinute;
  
  if (changePercent !== 0) {
    const direction = product.strategyType === 'trend_up' ? 1 : -1;
    // 加上一点点随机噪音 (0.05%)，让K线不要成一条直线
    const noise = (Math.random() - 0.5) * 0.0005; 
    
    const newPrice = product.currentPrice * (1 + (changePercent * 0.01 * direction) + noise);
    
    // 更新产品
    product.currentPrice = parseFloat(newPrice.toFixed(2));
    product.lastStrategyUpdateAt = now;
    
    // 更新当天的 High/Low
    if (!product.highPrice || product.currentPrice > product.highPrice) product.highPrice = product.currentPrice;
    if (!product.lowPrice || product.currentPrice < product.lowPrice) product.lowPrice = product.currentPrice;
  }

  return product;
}

export async function GET(request, { params }) {
  try {
    const { id } = await params; // 🔑 新增这一行
    await connectDB();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '1d'; // 默认1天

    let product = await Product.findById(id);
    if (!product) {
      return Response.json({ success: false, message: '产品不存在' }, { status: 404 });
    }

    // 🔑 1. 应用策略：每次请求都自动推算价格
    product = applyStrategy(product);
    // 保存回数据库（确保下次刷新时接着涨）
    await product.save();

    let historyData = [];

    // ==========================================
    // 🔑 2. 生成平滑的K线数据
    // ==========================================

    // --- 分钟级/小时级 (平滑曲线) ---
    if (['1m', '5m', '15m', '1h'].includes(period)) {
      const countMap = { '1m': 120, '5m': 96, '15m': 64, '1h': 48 };
      const count = countMap[period] || 20;
      const basePrice = product.currentPrice || 10;
      
      const now = new Date();
      for (let i = count; i > 0; i--) {
        let timeStep = 0;
        if (period === '1m') timeStep = i * 60 * 1000;
        else if (period === '5m') timeStep = i * 5 * 60 * 1000;
        else if (period === '15m') timeStep = i * 15 * 60 * 1000;
        else if (period === '1h') timeStep = i * 60 * 60 * 1000;

        const time = new Date(now.getTime() - timeStep);
        
        // 🔑 平滑算法：使用正弦波 + 趋势
        // t 是从 0 到 1 的进度
        const t = i / count;
        // 基础波动：正弦波模拟自然涨跌
        const wave = Math.sin(t * 10) * 0.005; 
        
        // 趋势：如果策略是强涨，总体趋势向上
        const trend = product.strategyType === 'trend_up' ? 0.01 : (product.strategyType === 'trend_down' ? -0.01 : 0);
        
        const volatility = wave + trend + (Math.random() - 0.5) * 0.002;

        const open = basePrice * (1 + volatility);
        const close = basePrice * (1 + volatility + (Math.random() - 0.5) * 0.002);
        const high = Math.max(open, close) * (1 + Math.random() * 0.001);
        const low = Math.min(open, close) * (1 - Math.random() * 0.001);

        historyData.push({
          date: time,
          open: parseFloat(open.toFixed(2)),
          close: parseFloat(close.toFixed(2)),
          high: parseFloat(high.toFixed(2)),
          low: parseFloat(low.toFixed(2)),
          volume: Math.floor(Math.random() * 1000)
        });
      }
    } 
    
    // --- 日/周/月/年 (基于历史或模拟) ---
    else {
      if (product.priceHistory && product.priceHistory.length > 0) {
        historyData = product.priceHistory.map(h => ({
          date: h.date,
          open: h.open,
          close: h.close,
          high: h.high,
          low: h.low,
          volume: h.volume
        }));
      } else {
        const countMap = { '1d': 60, '1w': 52, '1M': 24, '1y': 12 };
        const count = countMap[period] || 10;
        const basePrice = product.currentPrice || 10;
        
        const now = new Date();
        for (let i = count; i > 0; i--) {
          let timeStep = 0;
          if (period === '1d') timeStep = i * 24 * 60 * 60 * 1000;
          else if (period === '1w') timeStep = i * 7 * 24 * 60 * 60 * 1000;
          else if (period === '1M') timeStep = i * 30 * 24 * 60 * 60 * 1000;
          else if (period === '1y') timeStep = i * 365 * 24 * 60 * 60 * 1000;

          const time = new Date(now.getTime() - timeStep);
          // 平滑日波动
          const t = i / count;
          const wave = Math.sin(t * 5) * 0.02;
          const volatility = wave + (Math.random() - 0.5) * 0.01;

          const open = basePrice * (1 + volatility);
          const close = basePrice * (1 + volatility + (Math.random() - 0.5) * 0.005);
          const high = Math.max(open, close) * (1 + Math.random() * 0.01);
          const low = Math.min(open, close) * (1 - Math.random() * 0.01);

          historyData.push({
            date: time,
            open: parseFloat(open.toFixed(2)),
            close: parseFloat(close.toFixed(2)),
            high: parseFloat(high.toFixed(2)),
            low: parseFloat(low.toFixed(2)),
            volume: Math.floor(Math.random() * 10000)
          });
        }
      }
    }

    return Response.json({
      success: true,
      data: {
        product: product, // 返回已经涨过的价格
        history: historyData
      }
    });

  } catch (error) {
    console.error('Product Fetch Error:', error);
    return Response.json({ success: false, message: '获取产品详情失败' }, { status: 500 });
  }
}
