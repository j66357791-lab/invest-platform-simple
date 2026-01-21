// app/api/admin/holdings/route.js
import { connectDB } from '@/lib/db';
import { Holding, Product } from '@/lib/models';
import { verifyToken } from '@/lib/middleware'; // 使用统一的 verifyToken
import mongoose from 'mongoose';

export async function PUT(request) {
  try {
    // 1. 身份验证
    const user = verifyToken(request);
    if (!user || !user.userId) {
      return Response.json({ success: false, message: '未登录或权限不足' }, { status: 401 });
    }

    const body = await request.json();
    const { holdingId, action, amount } = body; // action: 'add' | 'subtract' | 'set'

    if (!holdingId || !action || amount === undefined) {
      return Response.json({ success: false, message: '参数错误' }, { status: 400 });
    }

    await connectDB();

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const holding = await Holding.findById(holdingId).populate('productId').session(session);
      if (!holding) {
        throw new Error('持仓不存在');
      }

      const product = holding.productId;
      let newAmount = holding.amount;
      let soldSupplyChange = 0;

      // 计算新数量
      switch (action) {
        case 'add':
          newAmount += amount;
          soldSupplyChange = amount;
          break;
        case 'subtract':
          newAmount = Math.max(0, newAmount - amount);
          soldSupplyChange = -Math.min(amount, holding.amount);
          break;
        case 'set':
          const diff = amount - holding.amount;
          newAmount = Math.max(0, amount);
          soldSupplyChange = diff;
          break;
        default:
          throw new Error('无效操作');
      }

      // 🔑 关键：如果是限量产品，同步 soldSupply
      if (product.isLimited) {
        const currentSold = product.soldSupply || 0;
        const newSoldSupply = currentSold + soldSupplyChange;

        if (newSoldSupply < 0) {
          throw new Error(`操作失败：售出数量不能为负数`);
        }
        if (newSoldSupply > product.totalSupply) {
          throw new Error(`操作失败：超过产品总量限制。当前已售 ${currentSold}，总量 ${product.totalSupply}，尝试变动 ${soldSupplyChange}`);
        }

        product.soldSupply = newSoldSupply;
        await product.save({ session });
      }

      // 更新持仓
      holding.amount = newAmount;
      if (newAmount === 0) {
        holding.status = 'closed';
      }
      holding.marketValue = newAmount * product.currentPrice;
      await holding.save({ session });

      await session.commitTransaction();

      return Response.json({
        success: true,
        message: '持仓调整成功',
        data: { holding, productSoldSupply: product.soldSupply },
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('[Adjust Holding Error]', error);
    return Response.json({ success: false, message: error.message || '服务器错误' }, { status: 500 });
  }
}
