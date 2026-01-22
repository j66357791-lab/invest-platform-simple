// app/api/admin/announcements/[id]/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Announcement } from '@/lib/models';

export async function PUT(req, { params }) {
  try {
    const { id } = await params; // 🔑 新增这一行
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    const body = await req.json();

    await connectDB();

    const announcement = await Announcement.findByIdAndUpdate(
      id,
      body,
      { new: true }
    );

    if (!announcement) {
      return NextResponse.json({ success: false, message: '公告不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: '公告更新成功',
      data: announcement,
    });
  } catch (error) {
    console.error('更新公告失败:', error);
    return NextResponse.json(
      { success: false, message: '更新公告失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params; // 🔑 新增这一行
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    await connectDB();

    const announcement = await Announcement.findByIdAndDelete(id);

    if (!announcement) {
      return NextResponse.json({ success: false, message: '公告不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: '公告删除成功',
    });
  } catch (error) {
    console.error('删除公告失败:', error);
    return NextResponse.json(
      { success: false, message: '删除公告失败' },
      { status: 500 }
    );
  }
}
