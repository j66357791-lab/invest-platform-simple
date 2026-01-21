// app/api/admin/stats/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User, Product, Order, Holding } from '@/lib/models';

export async function GET(req) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    await connectDB();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.setDate(now.getDate() - 7));

    // 并行查询所有统计数据
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      todayOrders,
      weekOrders,
      todayOrderDocs,
      weekOrderDocs,
    ] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: todayStart } }),
      Order.countDocuments({ createdAt: { $gte: weekStart } }),
      Order.find({ createdAt: { $gte: todayStart } }),
      Order.find({ createdAt: { $gte: weekStart } }),
    ]);

    // 计算总成交额
    const totalVolume = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    // 计算今日成交额
    const todayVolume = todayOrderDocs.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    // 计算本周成交额
    const weekVolume = weekOrderDocs.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalVolume: totalVolume[0]?.total || 0,
        todayOrders,
        todayVolume,
        weekOrders,
        weekVolume,
      },
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return NextResponse.json(
      { success: false, message: '获取统计数据失败' },
      { status: 500 }
    );
  }
}
