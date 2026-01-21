// app/api/cron/update-prices/route.js
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models';

// 建议在 .env 中设置一个密码，防止恶意访问
const CRON_SECRET = process.env.CRON_SECRET || 'admin_cron_secret_123';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    // 简单的安全验证
    if (searchParams.get('secret') !== CRON_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    console.log('🚀 Starting Price Update Cron Job...');
    await connectDB();

    // 获取所有活跃产品
    const products = await Product.find({ isActive: true });
    const updatePromises = products.map(product => updateProductPrice(product));

    await Promise.all(updatePromises);

    console.log('✅ Price Update Job Completed.');
    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('❌ Cron Job Error:', error);
    return new Response('Error', { status: 500 });
  }
}

// 核心价格计算逻辑
async function updateProductPrice(product) {
  const strategy = product.strategyType || 'market';
  const oldPrice = product.currentPrice;
  let newPrice = oldPrice;

  // --- 策略 1: 强制上涨 ---
  if (strategy === 'trend_up') {
    // 计算每分钟应该涨多少：(目标涨幅 / 目标分钟数)
    // 目标涨幅是百分比，例如 10 -> 10%
    const stepPercent = (product.strategyTargetPercent || 0) / (product.strategyTargetMinutes || 60);
    // 为了增加波动性，在这个基础涨跌幅上增加一点点随机噪音 (+/- 0.1%)
    const noise = (Math.random() - 0.5) * 0.002; 
    newPrice = oldPrice * (1 + (stepPercent * 0.01) + noise);
  } 
  
  // --- 策略 2: 强制下跌 ---
  else if (strategy === 'trend_down') {
    const stepPercent = (product.strategyTargetPercent || 0) / (product.strategyTargetMinutes || 60);
    // 基础跌幅 + 随机噪音
    const noise = (Math.random() - 0.5) * 0.002;
    newPrice = oldPrice * (1 - (stepPercent * 0.01) + noise);
  } 
  
  // --- 策略 3: 自由市场 ---
  else {
    // 模拟市场随机波动 (随机漫步)
    // 波动范围 -0.8% 到 +0.8%
    const volatility = (Math.random() - 0.5) * 0.016;
    newPrice = oldPrice * (1 + volatility);
  }

  // 确保价格不低于 0.01
  newPrice = Math.max(0.01, parseFloat(newPrice.toFixed(2)));

  // 价格变化才更新数据库
  if (newPrice !== oldPrice) {
    await Product.updateOne(
      { _id: product._id },
      { currentPrice: newPrice }
    );
    console.log(`[Update] ${product.name}: ${oldPrice} -> ${newPrice} (${strategy})`);
  }
}
