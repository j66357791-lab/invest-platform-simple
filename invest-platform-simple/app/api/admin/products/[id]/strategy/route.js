// app/api/admin/products/[id]/strategy/route.js
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models';
import { verifyToken } from '@/lib/middleware';

export async function PUT(request, { params }) {
  try {
    await connectDB();

    // 1. 权限校验
    const user = verifyToken(request);
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return Response.json({ success: false, message: '无权限操作' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();

    // 2. 更新字段
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        $set: {
          maxBuyAmount: body.maxBuyAmount,
          maxSellAmount: body.maxSellAmount,
          limitUpPercent: body.limitUpPercent,
          limitDownPercent: body.limitDownPercent,
          strategyType: body.strategyType,
          strategyTargetPercent: body.strategyTargetPercent,
          strategyTargetMinutes: body.strategyTargetMinutes,
        }
      },
      { new: true }
    );

    if (!updatedProduct) {
      return Response.json({ success: false, message: '产品不存在' }, { status: 404 });
    }

    return Response.json({ success: true, message: '策略更新成功', data: updatedProduct });

  } catch (error) {
    console.error('Update strategy error:', error);
    return Response.json({ success: false, message: '服务器内部错误' }, { status: 500 });
  }
}
