// app/api/admin/products/[id]/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models';
import { verifyToken, requireAdmin, logOperation } from '@/lib/middleware';

// 获取单个产品详情 (后台用)
export async function GET(req, { params }) {
  try {
    const { id } = await params; // 🔑 新增这一行
    const authResult = await requireAdmin()(req);
    if (authResult) return authResult;

    await connectDB();
    const product = await Product.findById(params.id);

    if (!product) {
      return NextResponse.json({ success: false, message: '产品不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}

// 更新产品 (从原来的 route.js 移过来)
export async function PUT(req, { params }) {
  try {
    const { id } = await params; // 🔑 新增这一行
    const authResult = await requireAdmin()(req);
    if (authResult) return authResult;
    const user = verifyToken(req);

    await connectDB();

    const body = await req.json();

    const updateData = { ...body };
    if (body.issueDate) {
      updateData.issueDate = new Date(body.issueDate);
    }
    if (body.currentPrice) updateData.currentPrice = parseFloat(body.currentPrice);
    if (body.closePrice) updateData.closePrice = parseFloat(body.closePrice);

    const product = await Product.findByIdAndUpdate(id, updateData, { new: true });

    if (!product) {
      return NextResponse.json({ success: false, message: '产品不存在' }, { status: 404 });
    }

    await logOperation({
      adminId: user.userId,
      action: 'update_product',
      module: 'products',
      details: { productId: product._id, name: product.name },
      req,
    });

    return NextResponse.json({
      success: true,
      message: '产品更新成功',
      data: product,
    });
  } catch (error) {
    console.error('更新产品失败:', error);
    return NextResponse.json(
      { success: false, message: '更新产品失败' },
      { status: 500 }
    );
  }
}

// 删除产品 (修复 405 错误的关键)
export async function DELETE(req, { params }) {
  try {
    const { id } = await params; // 🔑 新增这一行
    const authResult = await requireAdmin()(req);
    if (authResult) return authResult;
    const user = verifyToken(req);

    await connectDB();

    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return NextResponse.json({ success: false, message: '产品不存在' }, { status: 404 });
    }

    await logOperation({
      adminId: user.userId,
      action: 'delete_product',
      module: 'products',
      details: { productId: id, name: deletedProduct.name },
      req,
    });

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除产品失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
