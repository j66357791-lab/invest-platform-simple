// app/api/admin/users/[id]/status/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';

export async function PATCH(req, { params }) {
  try {
    const { id } = await params; // 🔑 新增这一行
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    const { isActive } = await req.json();

    await connectDB();

    const user = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ success: false, message: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: '状态更新成功',
      data: user,
    });
  } catch (error) {
    console.error('更新用户状态失败:', error);
    return NextResponse.json(
      { success: false, message: '更新失败' },
      { status: 500 }
    );
  }
}
