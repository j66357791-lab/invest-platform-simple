// app/api/products/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models';

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const keyword = searchParams.get('keyword');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // 构建查询条件
    const query = { isActive: true };

    // 🔑 关键：支持中文分类筛选 (实体、虚拟产品、游戏产品、投资收益)
    if (category && category !== 'all') {
      query.category = category;
    }

    // 关键词搜索（匹配名称或代码）
    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { code: { $regex: keyword, $options: 'i' } },
      ];
    }

    // 分页计算
    const skip = (page - 1) * limit;

    // 查询总数
    const total = await Product.countDocuments(query);

    // 查询列表
    const products = await Product.find(query)
      .sort({ sortOrder: -1, isHot: -1, createdAt: -1 }) // 热门优先，然后是时间
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        data: products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('获取产品列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取产品列表失败' },
      { status: 500 }
    );
  }
}
