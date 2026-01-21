// app/api/admin/users/[id]/role/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';

export async function PATCH(req, { params }) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    const { role } = await req.json();
    const { id } = params;

    await connectDB();

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ success: false, message: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: '角色更新成功',
      data: user,
    });
  } catch (error) {
    console.error('更新用户角色失败:', error);
    return NextResponse.json(
      { success: false, message: '更新失败' },
      { status: 500 }
    );
  }
}
