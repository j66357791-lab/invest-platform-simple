// app/api/user/route.js
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/middleware';
import { User } from '@/lib/models';
import { connectDB } from '@/lib/db';

// 获取当前用户信息
export async function GET(request) {
  try {
    // 1. 使用统一的 verifyToken，优先从 Cookie 读取
    const user = verifyToken(request);

    if (!user) {
      return NextResponse.json({ message: '未登录' }, { status: 401 });
    }

    // 2. 查询数据库
    await connectDB();
    const fullUser = await User.findById(user.userId).select('-password');

    if (!fullUser) {
      return NextResponse.json({ message: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json(fullUser);
  } catch (error) {
    console.error('获取用户信息错误:', error);
    return NextResponse.json({ message: '服务器错误' }, { status: 500 });
  }
}

// 管理员调整余额
export async function PUT(request) {
  try {
    const user = verifyToken(request);
    if (!user) return NextResponse.json({ message: '未登录' }, { status: 401 });

    await connectDB();
    const adminUser = await User.findById(user.userId);
    
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ message: '无权操作：仅限管理员' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, amount, operation } = body;

    if (!userId || typeof amount !== 'number') {
      return NextResponse.json({ message: '参数错误：缺少用户ID或金额' }, { status: 400 });
    }

    const updateAction = operation === 'subtract' ? -amount : amount;
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { balance: updateAction } },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ message: '目标用户不存在' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: '余额调整成功',
      data: { userId: updatedUser._id, newBalance: updatedUser.balance }
    });

  } catch (error) {
    console.error('调整余额错误:', error);
    return NextResponse.json({ message: '服务器错误' }, { status: 500 });
  }
}
