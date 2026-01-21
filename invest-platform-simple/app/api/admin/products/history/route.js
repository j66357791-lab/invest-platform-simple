// app/api/admin/products/[id]/history/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models';
import { verifyToken, requireAdmin, logOperation } from '@/lib/middleware';

export async function POST(req, { params }) {
  try {
    // 1. 验证权限
    const authResult = await requireAdmin()(req);
    if (authResult) return authResult;
    
    const user = verifyToken(req);
    const { id } = params;

    // 2. 解析数据
    const { date, open, high, low, close, volume } = await req.json();

    if (!date || !close) {
      return NextResponse.json(
        { success: false, message: '日期和收盘价必填' },
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

    // 4. 调用模型中的 updateHistory 方法（这比直接 findOneAndUpdate 更安全且不会报 undefined）
    // 方法内部会自动计算涨跌幅、排序数组、更新当前价格
    await product.updateHistory({
      date: new Date(date),
      open: Number(open || close),
      high: Number(high || close),
      low: Number(low || close),
      close: Number(close),
      volume: Number(volume || 0),
    });

    // 5. 记录日志
    try {
      await logOperation({
        adminId: user.userId,
        action: 'update_price_history',
        module: 'products',
        details: { productId: id, date, price: close },
        req,
      });
    } catch (logError) {
      console.warn('日志记录失败:', logError);
      // 不影响主流程
    }

    return NextResponse.json({
      success: true,
      message: '历史价格更新成功',
      data: product,
    });

  } catch (error) {
    console.error('更新历史价格失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
