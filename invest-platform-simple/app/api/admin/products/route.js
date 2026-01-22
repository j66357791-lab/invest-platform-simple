// app/api/admin/products/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models'; // ✅ 删除了 PriceHistory
import { verifyToken, requireAdmin, logOperation } from '@/lib/middleware';

// 获取产品列表
export async function GET(req) {
  try {
    const authResult = await requireAdmin()(req);
    if (authResult) return authResult;
    const user = verifyToken(req);

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');

    const query = {};
    if (category) query.category = category;
    if (isActive !== null) query.isActive = isActive === 'true';

    const products = await Product.find(query)
      .sort({ sortOrder: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Product.countDocuments(query);

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

// 创建产品
export async function POST(req) {
  try {
    const authResult = await requireAdmin()(req);
    if (authResult) return authResult;
    const user = verifyToken(req);

    await connectDB();

    const body = await req.json();

    if (!body.name || !body.code || !body.currentPrice) {
      return NextResponse.json(
        { success: false, message: '请填写完整的产品信息' },
        { status: 400 }
      );
    }

    const existingProduct = await Product.findOne({ code: body.code });
    if (existingProduct) {
      return NextResponse.json(
        { success: false, message: '产品代码已存在' },
        { status: 400 }
      );
    }

    // 默认发行时间
    let issueDate = body.issueDate ? new Date(body.issueDate) : new Date('2025-10-01');
    const closePrice = body.closePrice ? parseFloat(body.closePrice) : parseFloat(body.currentPrice);

    // ✅ 修改：直接在创建时写入 priceHistory 数组，而不是去创建不存在的表
    const initialHistory = {
      date: issueDate,
      open: parseFloat(body.currentPrice),
      close: closePrice,
      high: parseFloat(body.currentPrice), // 初始默认相同
      low: parseFloat(body.currentPrice),   // 初始默认相同
      volume: 0,
      changePercent: 0
    };

    const product = await Product.create({
      ...body,
      issueDate,
      closePrice,
      priceHistory: [initialHistory] // ✅ 初始化历史数据
    });

    await logOperation({
      adminId: user.userId,
      action: 'create_product',
      module: 'products',
      details: { productId: product._id, name: product.name },
      req,
    });

    return NextResponse.json({
      success: true,
      message: '产品创建成功',
      data: product,
    });
  } catch (error) {
    console.error('创建产品失败:', error);
    return NextResponse.json(
      { success: false, message: '创建产品失败' },
      { status: 500 }
    );
  }
}

// ❌ 删除了 PUT 方法，因为放错文件了，移步到 [id]/route.js
