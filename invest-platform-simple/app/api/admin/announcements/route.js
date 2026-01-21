// app/api/admin/announcements/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Announcement } from '@/lib/models';

export async function GET(req) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const announcements = await Announcement.find({})
      .sort({ priority: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Announcement.countDocuments({});

    return NextResponse.json({
      success: true,
      data: {
        data: announcements,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('获取公告列表失败:', error);
    return NextResponse.json(
      { success: false, message: '获取公告列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    const body = await req.json();
    await connectDB();

    const announcement = await Announcement.create(body);

    return NextResponse.json({
      success: true,
      message: '公告创建成功',
      data: announcement,
    });
  } catch (error) {
    console.error('创建公告失败:', error);
    return NextResponse.json(
      { success: false, message: '创建公告失败' },
      { status: 500 }
    );
  }
}
