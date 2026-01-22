// app/api/auth/me/route.js
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { requireAuth } from '@/lib/middleware';
import { successResponse, errorResponse } from '@/lib/utils';

export async function GET(request) {
  try {
    await connectDB();

    // 验证用户身份
    const authUser = await requireAuth(request);
    if (!authUser) {
      return errorResponse('请先登录', 401);
    }

    // 获取完整用户信息
    const user = await User.findById(authUser.userId)
      .select('-password')
      .populate('invitedBy', 'username email');

    if (!user) {
      return errorResponse('用户不存在', 404);
    }

    return successResponse(user);

  } catch (error) {
    console.error('[Get User Error]', error);
    return errorResponse('获取用户信息失败', 500);
  }
}
