// app/api/admin/users/[id]/limits/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { verifyToken, requireAdmin } from '@/lib/middleware';

// 获取用户的持仓限制
export async function GET(req, { params }) {
  try {
    const authResult = await requireAdmin()(req);
    if (authResult) return authResult;

    await connectDB();
    const user = await User.findById(params.id).lean();
    
    if (!user) return NextResponse.json({ success: false, message: '用户不存在' }, { status: 404 });

    return NextResponse.json({
      success: true,
      data: user.productLimits || []
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}

// 更新用户的持仓限制
export async function POST(req, { params }) {
  try {
    const authResult = await requireAdmin()(req);
    if (authResult) return authResult;

    const { id } = params;
    const { productId, maxQuantity } = await req.json();

    if (!productId) {
      return NextResponse.json({ success: false, message: '缺少产品ID' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(id);

    if (!user) return NextResponse.json({ success: false, message: '用户不存在' }, { status: 404 });

    // 查找是否已存在该产品的限制
    const existingIndex = user.productLimits.findIndex(
      limit => limit.productId.toString() === productId
    );

    if (existingIndex >= 0) {
      // 更新
      user.productLimits[existingIndex].maxQuantity = maxQuantity;
    } else {
      // 新增
      user.productLimits.push({ productId, maxQuantity });
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: '限制设置成功',
      data: user.productLimits
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
