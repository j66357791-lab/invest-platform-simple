// app/api/cron/distribute-dividends/route.js
import { connectDB } from '@/lib/db';
import { Product, Holding, User, Transaction, DividendRecord } from '@/lib/models';
import mongoose from 'mongoose';

// 简单的密钥验证，生产环境请使用环境变量 CRON_SECRET
const CRON_SECRET = process.env.CRON_SECRET || 'test_secret';

export async function GET(request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');

  if (secret !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    await connectDB();
    console.log('[Cron] 开始执行分红任务...');

    // 1. 查找所有开启分红的产品 (dividendRate > 0)
    const products = await Product.find({
      dividendRate: { $gt: 0 },
      dividendPerShare: { $gt: 0 },
      isActive: true
    });

    if (products.length === 0) {
      console.log('[Cron] 没有需要分红的产品');
      return Response.json({ success: true, message: '无需分红的产品' });
    }

    const results = [];
    const now = new Date();

    for (const product of products) {
      // 配置
      const dividendAmount = product.dividendPerShare; // 每股多少钱
      const intervalDays = product.dividendPayInterval || 30; // 默认30天

      console.log(`[Cron] 处理产品: ${product.name}, 每股收益: ${dividendAmount}, 间隔: ${intervalDays}天`);

      // 2. 查找该产品所有活跃持仓
      const holdings = await Holding.find({
        productId: product._id,
        status: 'active',
      }).populate('userId');

      if (holdings.length === 0) continue;

      // 3. 遍历持仓，判断是否分红
      for (const holding of holdings) {
        const holdingDate = new Date(holding.createdAt);
        const daysHeld = Math.floor((now - holdingDate) / (1000 * 60 * 60 * 24));

        // 判断1: 持有天数必须 >= 间隔天数
        if (daysHeld < intervalDays) continue;

        // 判断2: 查询该用户该产品最后一次分红记录
        // 简单防重：查找该持有者的最近分红记录
        const lastRecord = await DividendRecord.findOne({
          holdingId: holding._id,
        }).sort({ distributedAt: -1 });

        let shouldDistribute = false;

        if (!lastRecord) {
          // 从未分过红
          shouldDistribute = true;
        } else {
          // 计算距离上次分红过了多少天
          const daysSinceLastDiv = Math.floor((now - new Date(lastRecord.distributedAt)) / (1000 * 60 * 60 * 24));
          // 必须超过间隔天数才能再次分红
          if (daysSinceLastDiv >= intervalDays) {
            shouldDistribute = true;
          }
        }

        if (!shouldDistribute) continue;

        // 4. 执行分红 (使用事务)
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
          const totalDividend = holding.amount * dividendAmount;

          // 增加余额
          holding.userId.balance += totalDividend;
          await holding.userId.save({ session });

          // 记录流水
          await Transaction.create([{
            txNo: `DIV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId: holding.userId._id,
            type: 'dividend',
            amount: totalDividend,
            balance: holding.userId.balance,
            description: `${product.name} 分红收益 (${daysHeld}天)`,
            productId: product._id,
          }], { session });

          // 记录分红历史 (防止重复)
          await DividendRecord.create([{
            productId: product._id,
            userId: holding.userId._id,
            holdingId: holding._id,
            amount: totalDividend,
            holdingDays: daysHeld,
            distributedAt: now,
          }], { session });

          await session.commitTransaction();
          console.log(`[Cron] 用户 ${holding.userId.username} 获得 ¥${totalDividend.toFixed(2)}`);

          results.push({
            username: holding.userId.username,
            amount: totalDividend,
            days: daysHeld
          });

        } catch (err) {
          await session.abortTransaction();
          console.error(`[Cron] 用户 ${holding.userId.username} 分红失败:`, err);
        } finally {
          session.endSession();
        }
      }
    }

    return Response.json({
      success: true,
      message: `分红完成，共 ${results.length} 笔`,
      data: results,
    });

  } catch (error) {
    console.error('[Cron Error]', error);
    return Response.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
