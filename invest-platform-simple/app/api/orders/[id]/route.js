// app/api/orders/[id]/route.js
import { connectDB } from '@/lib/db';
import { Order } from '@/lib/models';
import { requireAuth, canAccessResource } from '@/lib/middleware';
import { successResponse, errorResponse } from '@/lib/utils';

export async function GET(
  request,
  { params }
) {
  try {
    const { id } = await params; // 🔑 新增这一行
    await connectDB();

    const authUser = await requireAuth(request);
    if (!authUser) {
      return errorResponse('请先登录', 401);
    }

    const order = await Order.findById(params.id)
      .populate('productId', 'name code category imageUrl currentPrice')
      .populate('holdingId');

    if (!order) {
      return errorResponse('订单不存在', 404);
    }

    // 检查权限
    if (!canAccessResource(order.userId.toString(), authUser.userId, authUser.role)) {
      return errorResponse('无权访问此订单', 403);
    }

    return successResponse(order);

  } catch (error) {
    console.error('[Get Order Error]', error);
    return errorResponse('获取订单详情失败', 500);
  }
}
