// app/api/announcements/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Announcement } from '@/lib/models';

// 获取激活的公告列表（无需登录）
export async function GET(req) {
  try {
    await connectDB();

    const announcements = await Announcement.find({ isActive: true })
      .sort({ priority: -1, createdAt: -1 })
      .limit(5) // 只取最近5条
      .lean();

    return NextResponse.json({
      success: true,
      data: announcements,
    });
  } catch (error) {
    console.error('获取公告失败:', error);
    return NextResponse.json(
      { success: false, message: '获取公告失败' },
      { status: 500 }
    );
  }
}
