// app/api/admin/withdraws/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Withdraw } from '@/lib/models';
import { verifyToken, requireAdmin } from '@/lib/middleware';

export async function GET(req) {
  try {
    const authResult = await requireAdmin()(req);
    if (authResult) return authResult;

    await connectDB();

    // 🔑 优化：使用 req.nextUrl (Next.js App Router 标准)
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');

    const query = {};
    if (status) query.status = status;

    const withdraws = await Withdraw.find(query)
      .populate('userId', 'username realName idCard phone email')
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
    console.error('[Admin Withdraws Error]', error);
    return NextResponse.json(
      { success: false, message: '获取失败' },
      { status: 500 }
    );
  }
}
