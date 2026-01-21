import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Deposit } from '@/lib/models';
import { verifyToken, requireAdmin } from '@/lib/middleware';

// 获取充值列表
export async function GET(req) {
  try {
    const authResult = await requireAdmin()(req);
    if (authResult) return authResult;

    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');

    const query = {};
    if (status) query.status = status;

    const deposits = await Deposit.find(query)
      .populate('userId', 'username email phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Deposit.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: {
        data: deposits,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error('[Admin Deposits Error]', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}
