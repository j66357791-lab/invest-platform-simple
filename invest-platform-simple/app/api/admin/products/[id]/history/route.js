// app/api/admin/products/[id]/history/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models';

export async function POST(req, { params }) {
  try {
    // 1. 身份验证 (如果你有中间件请保留)
    // const authResult = await requireAdmin()(req);
    // if (authResult) return authResult;
    
    const { id } = params;
    const body = await req.json();
    const { date, price, open, high, low, close, volume } = body;

    // 2. 数据校验与兼容
    // 允许只传 price，自动填充 OHLC
    const finalPrice = price || close;
    if (!date || finalPrice === undefined) {
      return NextResponse.json(
        { success: false, message: '缺少日期或价格' },
        { status: 400 }
      );
    }

    await connectDB();

    // 3. 查找产品
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json(
        { success: false, message: '产品不存在' },
        { status: 404 }
      );
    }

    // 4. 规范化日期
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // 5. 构建 K 线记录
    const newRecord = {
      date: targetDate,
      open: parseFloat(open || finalPrice),
      high: parseFloat(high || finalPrice),
      low: parseFloat(low || finalPrice),
      close: parseFloat(finalPrice),
      volume: parseFloat(volume || 0),
      changePercent: 0
    };

    // 6. 检查是否已存在
    const existingIndex = product.priceHistory.findIndex(
      (item) => new Date(item.date).getTime() === targetDate.getTime()
    );

    if (existingIndex >= 0) {
      product.priceHistory[existingIndex] = newRecord;
    } else {
      product.priceHistory.push(newRecord);
      product.priceHistory.sort((a, b) => a.date - b.date);
    }

    // 7. 重新计算涨跌幅
    product.priceHistory.forEach((record, index) => {
      if (index === 0) {
        record.changePercent = 0;
      } else {
        const prevClose = product.priceHistory[index - 1].close;
        if (prevClose > 0) {
          record.changePercent = parseFloat(((record.close - prevClose) / prevClose * 100).toFixed(4));
        }
      }
    });

    // 8. 更新产品当前价格
    const lastRecord = product.priceHistory[product.priceHistory.length - 1];
    const today = new Date();
    today.setHours(0,0,0,0);
    
    if (lastRecord.date.getTime() >= today.getTime()) {
        product.currentPrice = lastRecord.close;
        product.closePrice = lastRecord.close;
        product.dailyChange = lastRecord.changePercent;
    }

    await product.save();

    return NextResponse.json({
      success: true,
      message: '历史K线更新成功',
      data: product.priceHistory,
    });

  } catch (error) {
    console.error('历史价格更新失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误: ' + error.message },
      { status: 500 }
    );
  }
}
