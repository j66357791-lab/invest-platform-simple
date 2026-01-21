// app/api/admin/logs/route.js
import { connectDB } from '@/lib/db';
import { AdminLog } from '@/lib/models';
import { requireAdmin } from '@/lib/middleware';
import { successResponse, errorResponse, parsePagination, buildPaginationResponse } from '@/lib/utils';

export async function GET(request) {
  try {
    await connectDB();

    const authUser = await requireAdmin(request);
    if (!authUser) {
      return errorResponse('权限不足', 403);
    }

    const searchParams = request.nextUrl.searchParams;
    const { page, pageSize, skip } = parsePagination(searchParams);

    // 筛选条件
    const filter = {};

    const module = searchParams.get('module');
    if (module) filter.module = module;

    const action = searchParams.get('action');
    if (action) filter.action = action;

    const adminId = searchParams.get('adminId');
    if (adminId) filter.adminId = adminId;

    // 日期范围
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const total = await AdminLog.countDocuments(filter);
    const logs = await AdminLog.find(filter)
      .populate('adminId', 'username role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);

    return successResponse(buildPaginationResponse(logs, total, page, pageSize));

  } catch (error) {
    console.error('[Get Logs Error]', error);
    return errorResponse('获取操作日志失败', 500);
  }
}
