// app/api/admin/users/[id]/route.js
import { connectDB } from '@/lib/db';
import { User, Holding } from '@/lib/models';
import { requireAdmin, logOperation, isSuperAdmin } from '@/lib/middleware';
import { hashPassword } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/utils';

export async function GET(
  request,
  { params }
) {
  try {
    await connectDB();

    const authUser = await requireAdmin(request);
    if (!authUser) {
      return errorResponse('权限不足', 403);
    }

    // 🔑 新增：同时获取用户的持仓数据
    const [user, holdings] = await Promise.all([
      User.findById(params.id)
        .select('-password')
        .populate('invitedBy', 'username email'),
      Holding.find({ userId: params.id, status: 'active' })
        .populate('productId', 'name code currentPrice isLimited totalSupply soldSupply')
        .sort({ updatedAt: -1 })
    ]);

    if (!user) {
      return errorResponse('用户不存在', 404);
    }

    return successResponse({
      user,
      holdings, // 🔑 返回持仓数组
    });

  } catch (error) {
    console.error('[Admin Get User Error]', error);
    return errorResponse('获取用户详情失败', 500);
  }
}

export async function PUT(
  request,
  { params }
) {
  try {
    await connectDB();

    const authUser = await requireAdmin(request);
    if (!authUser) {
      return errorResponse('权限不足', 403);
    }

    const user = await User.findById(params.id);
    if (!user) {
      return errorResponse('用户不存在', 404);
    }

    const updates = await request.json();

    // 修改角色需要超级管理员权限
    if (updates.role && updates.role !== user.role) {
      if (!isSuperAdmin(authUser.role)) {
        return errorResponse('只有超级管理员可以修改用户角色', 403);
      }
    }

    // 修改密码
    if (updates.password) {
      updates.password = await hashPassword(updates.password);
    }

    Object.assign(user, updates);
    await user.save();

    // 记录操作日志
    await logOperation({
      adminId: authUser.userId,
      action: 'update_user',
      module: 'user',
      detail: { userId: user._id, username: user.username, updates },
      ip: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    return successResponse(userResponse, '用户更新成功');

  } catch (error) {
    console.error('[Admin Update User Error]', error);
    return errorResponse('更新用户失败', 500);
  }
}

export async function DELETE(
  request,
  { params }
) {
  try {
    await connectDB();

    const authUser = await requireAdmin(request);
    if (!authUser) {
      return errorResponse('权限不足', 403);
    }

    if (!isSuperAdmin(authUser.role)) {
      return errorResponse('只有超级管理员可以删除用户', 403);
    }

    const user = await User.findById(params.id);
    if (!user) {
      return errorResponse('用户不存在', 404);
    }

    // 不能删除自己
    if (user._id.toString() === authUser.userId) {
      return errorResponse('不能删除自己', 400);
    }

    // 软删除
    user.isActive = false;
    await user.save();

    // 记录操作日志
    await logOperation({
      adminId: authUser.userId,
      action: 'delete_user',
      module: 'user',
      detail: { userId: user._id, username: user.username },
      ip: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
    });

    return successResponse(null, '用户已禁用');

  } catch (error) {
    console.error('[Admin Delete User Error]', error);
    return errorResponse('删除用户失败', 500);
  }
}
