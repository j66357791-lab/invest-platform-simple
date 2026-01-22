// app/api/admin/withdraws/[id]/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User, Withdraw, Transaction } from '@/lib/models';
import { verifyToken, requireAdmin } from '@/lib/middleware';

export async function PATCH(req, { params }) {
  try {
    const { id } = await params; // 🔑 新增这一行
    // 1. 先验证管理员权限
    const authResult = await requireAdmin()(req);
    if (authResult) return authResult;
    
    // 2. 获取管理员信息用于记录
    // 注意：requireAdmin 通过后返回 null，所以需要再次调用 verifyToken 获取用户对象
    // 或者你可以修改 requireAdmin 实现来返回用户对象，但这里保持原样
    const admin = verifyToken(req);
    if (!admin) {
      return NextResponse.json({ success: false, message: '无法获取管理员信息' }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const { status, reviewRemark } = body;

    // 验证状态
    const validStatuses = ['approved', 'rejected', 'completed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: '无效的状态' },
        { status: 400 }
      );
    }

    // 查找提现申请
    const withdraw = await Withdraw.findById(id);
    if (!withdraw) {
      return NextResponse.json(
        { success: false, message: '提现申请不存在' },
        { status: 404 }
      );
    }

    // 检查状态是否已被处理
    if (withdraw.status !== 'pending' && withdraw.status !== 'approved') {
      return NextResponse.json(
        { success: false, message: '该提现申请已被处理' },
        { status: 400 }
      );
    }

    // 获取用户信息
    const user = await User.findById(withdraw.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      );
    }

    if (status === 'approved') {
      // 审核通过
      withdraw.status = 'approved';
      withdraw.reviewedBy = admin.userId;
      withdraw.reviewedAt = new Date();
      withdraw.reviewRemark = reviewRemark;
      
      // 记录一条流水 (如果之前没有创建的话)
      // 这里假设创建提现申请时已经创建了流水，这里仅更新状态
      await Transaction.findOneAndUpdate(
        { type: 'withdraw', userId: withdraw.userId, amount: -withdraw.amount, status: 'pending' },
        { status: 'pending', description: '提现审核通过，等待打款' }
      );
      
    } else if (status === 'rejected') {
      // 审核拒绝
      withdraw.status = 'rejected';
      withdraw.reviewedBy = admin.userId;
      withdraw.reviewedAt = new Date();
      withdraw.reviewRemark = reviewRemark;
      
      // 解冻余额
      user.balance += withdraw.amount;
      user.frozenBalance -= withdraw.amount;
      
      // 更新流水
      await Transaction.findOneAndUpdate(
        { type: 'withdraw', userId: withdraw.userId, amount: -withdraw.amount, status: 'pending' },
        { 
          status: 'completed',
          amount: withdraw.amount, // 正数表示退款
          balance: user.balance,
          frozen: user.frozenBalance,
          description: '提现审核拒绝，金额已退回'
        }
      );
      
      await user.save();
      
    } else if (status === 'completed') {
      // 确认已打款
      if (withdraw.status !== 'approved') {
        return NextResponse.json(
          { success: false, message: '请先审核通过再确认打款' },
          { status: 400 }
        );
      }
      
      withdraw.status = 'completed';
      withdraw.reviewedBy = admin.userId;
      withdraw.reviewedAt = new Date();
      
      // 扣除冻结余额
      user.frozenBalance -= withdraw.amount;
      user.totalWithdraw += withdraw.amount;
      
      // 更新流水
      await Transaction.findOneAndUpdate(
        { type: 'withdraw', userId: withdraw.userId, amount: -withdraw.amount, status: 'pending' },
        { 
          status: 'completed',
          amount: -withdraw.amount,
          balance: user.balance,
          frozen: user.frozenBalance,
          description: '提现已完成'
        }
      );
      
      await user.save();
    }

    await withdraw.save();

    return NextResponse.json({
      success: true,
      message: `提现申请已${status === 'approved' ? '审核通过' : status === 'rejected' ? '拒绝' : '确认打款'}`,
      data: withdraw
    });

  } catch (error) {
    console.error('[Admin Update Withdraw Error]', error);
    return NextResponse.json(
      { success: false, message: '审核失败' },
      { status: 500 }
    );
  }
}

// GET - 获取单个提现申请详情
export async function GET(req, { params }) {
  try {
    const { id } = await params; // 🔑 新增这一行
    const authResult = await requireAdmin()(req);
    if (authResult) return authResult;

    await connectDB();

    const withdraw = await Withdraw.findById(id)
      .populate('userId', 'username realName idCard phone email')
      .lean();

    if (!withdraw) {
      return NextResponse.json(
        { success: false, message: '提现申请不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: withdraw
    });

  } catch (error) {
    console.error('[Get Withdraw Detail Error]', error);
    return NextResponse.json(
      { success: false, message: '获取失败' },
      { status: 500 }
    );
  }
}
