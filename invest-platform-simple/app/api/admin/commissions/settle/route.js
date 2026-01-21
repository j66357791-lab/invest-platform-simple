// app/api/admin/commissions/settle/route.js
import { connectDB } from '@/lib/db';
import { Commission, User } from '@/lib/models';
import { requireSuperAdmin, logOperation } from '@/lib/middleware';
import { successResponse, errorResponse } from '@/lib/utils';

export async function POST(request) {
  try {
    await connectDB();

    const authUser = await requireSuperAdmin(request);
    if (!authUser) {
      return errorResponse('只有超级管理员可以执行此操作', 403);
    }

    const { date } = await request.json();
    const settleDate = date ? new Date(date) : new Date();
    settleDate.setHours(0, 0, 0, 0);

    // 查找该日期未结算的返佣记录
    const unsettledCommissions = await Commission.find({
      date: settleDate,
      settled: false,
    });

    if (unsettledCommissions.length === 0) {
      return successResponse(
        { message: '没有需要结算的返佣记录', count: 0 },
        '结算完成'
      );
    }

    // 按用户分组
    const userCommissions = {};
    unsettledCommissions.forEach(commission => {
      const userId = commission.userId.toString();
      if (!userCommissions[userId]) {
        userCommissions[userId] = {
          userId,
          totalAmount: 0,
          commissions: [],
        };
      }
      userCommissions[userId].totalAmount += commission.amount;
      userCommissions[userId].commissions.push(commission);
    });

    // 更新用户余额并标记已结算
    let settledCount = 0;
    const settledUsers = [];

    for (const [userId, data] of Object.entries(userCommissions)) {
      const user = await User.findById(userId);
      if (!user) continue;

      // 增加返佣余额
      user.commissionBalance += data.totalAmount;
      await user.save();

      // 标记返佣记录为已结算
      await Commission.updateMany(
        { _id: { $in: data.commissions.map(c => c._id) } },
        { settled: true, settledAt: new Date() }
      );

      settledCount += data.commissions.length;
      settledUsers.push({
        userId,
        username: user.username,
        amount: data.totalAmount,
        count: data.commissions.length,
      });
    }

    // 记录操作日志
    await logOperation({
      adminId: authUser.userId,
      action: 'settle_commissions',
      module: 'commission',
      detail: {
        date: settleDate,
        settledCount,
        settledUsers,
      },
      ip: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
    });

    return successResponse(
      {
        date: settleDate,
        settledCount,
        settledUsers,
      },
      `成功结算 ${settledCount} 条返佣记录`
    );

  } catch (error) {
    console.error('[Settle Commissions Error]', error);
    return errorResponse('结算失败', 500);
  }
}
