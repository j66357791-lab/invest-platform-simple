// app/api/wallet/withdraw/history/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Withdraw } from '@/lib/models';
import { verifyToken } from '@/lib/middleware';

export async function GET(req) {
  try {
    const user = verifyToken(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');

    const query = { userId: user.userId };
    if (status) query.status = status;

    const withdraws = await Withdraw.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Withdraw.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: {
        data: withdraws,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });

  } catch (error) {
    console.error('获取提现记录失败:', error);
    return NextResponse.json(
      { success: false, message: '获取提现记录失败' },
      { status: 500 }
    );
  }
}
