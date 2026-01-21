// app/api/user/profile/route.js
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { requireAuth } from '@/lib/middleware';
import { successResponse, errorResponse } from '@/lib/utils';

export async function PUT(request) {
  try {
    await connectDB();

    const authUser = await requireAuth(request);
    if (!authUser) {
      return errorResponse('请先登录', 401);
    }

    const { phone, avatar } = await request.json();

    // 验证手机号格式
    if (phone && !/^[1-9]\d{10}$/.test(phone)) {
      return errorResponse('手机号格式不正确');
    }

    // 更新用户资料
    const user = await User.findByIdAndUpdate(
      authUser.userId,
      { 
        $set: { 
          phone: phone || undefined,
          avatar: avatar || undefined,
        } 
      },
      { new: true }
    ).select('-password');

    return successResponse(user, '更新成功');

  } catch (error) {
    console.error('[Update Profile Error]', error);
    return errorResponse('更新失败', 500);
  }
}
