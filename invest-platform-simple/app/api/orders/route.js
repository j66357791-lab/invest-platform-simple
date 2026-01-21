// app/api/orders/route.js
import { connectDB } from '@/lib/db';
import { User, Product, Holding, Order, Transaction, Commission } from '@/lib/models';
import mongoose from 'mongoose';
import { verifyToken } from '@/lib/middleware';

const COMMISSION_RATE_DIRECT = 0.10;
const COMMISSION_RATE_INDIRECT = 0.05;

// ============================================================================
// 工具函数
// ============================================================================
function generateOrderNo(prefix = 'ORD') {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

function generateTxNo(prefix = 'TXN') {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

function calculateProfit(amount, currentPrice, avgPrice) {
  if (amount <= 0) return { profit: 0, profitRate: 0 };
  const marketValue = amount * currentPrice;
  const cost = amount * avgPrice;
  const profit = marketValue - cost;
  const profitRate = cost > 0 ? (profit / cost) * 100 : 0;
  return {
    profit: parseFloat(profit.toFixed(2)),
    profitRate: parseFloat(profitRate.toFixed(2)),
  };
}

function successResponse(data, message = 'Success', status = 200) {
  return Response.json({ success: true, message, data }, { status });
}

function errorResponse(message, status = 500, data = null) {
  return Response.json({ success: false, message, data }, { status });
}

// ============================================================================
// 🔑 创建订单的主事务函数 (包含所有校验)
// ============================================================================
async function createOrder(userId, productId, type, amount, ipAddress, userAgent) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. 获取产品
    const product = await Product.findById(productId).session(session);
    if (!product || !product.isActive) {
      throw new Error('产品不存在或已下架');
    }

    // 2. 获取用户
    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 3. 基础数量校验
    if (amount < product.minBuyAmount) {
      throw new Error(`最小购买数量为 ${product.minBuyAmount}`);
    }

    // 🔑 新增校验 A: 大单限制 (防止大单拉盘/砸盘)
    if (type === 'buy' && product.maxBuyAmount && amount > product.maxBuyAmount) {
      throw new Error(`超过单笔最大买入限制 (最大: ${product.maxBuyAmount})`);
    }
    if (type === 'sell' && product.maxSellAmount && amount > product.maxSellAmount) {
      throw new Error(`超过单笔最大卖出限制 (最大: ${product.maxSellAmount})`);
    }

    // 🔑 新增校验 B: 涨跌停熔断
    // 计算当前相对于开盘价(或昨收价)的涨跌幅
    // 如果没有 openPrice，则使用 closePrice 或 currentPrice 作为基准
    const basePrice = product.openPrice || product.closePrice || product.currentPrice;
    if (basePrice && basePrice > 0) {
      const currentChangePercent = ((product.currentPrice - basePrice) / basePrice) * 100;

      // 涨停校验：如果当前涨幅达到或超过设定值，禁止买入
      if (type === 'buy' && product.limitUpPercent > 0 && currentChangePercent >= product.limitUpPercent) {
        throw new Error(`产品已涨停 (${currentChangePercent.toFixed(2)}%)，暂停买入`);
      }

      // 跌停校验：如果当前跌幅达到或超过设定值，禁止卖出
      if (type === 'sell' && product.limitDownPercent > 0 && currentChangePercent <= (product.limitDownPercent * -1)) {
        throw new Error(`产品已跌停 (${currentChangePercent.toFixed(2)}%)，暂停卖出`);
      }
    }

    // --- 原有的交易计算逻辑 ---
    const price = product.currentPrice;
    const totalAmount = amount * price;
    const fee = totalAmount * (product.feeRate || 0);
    const finalAmount = type === 'buy' ? totalAmount + fee : totalAmount - fee;

    // 余额校验
    if (type === 'buy' && user.balance < finalAmount) {
      throw new Error('余额不足');
    }

    // 限量库存校验
    if (type === 'buy' && product.isLimited && product.totalSupply > 0) {
      const soldSupply = product.soldSupply || 0;
      if (soldSupply + amount > product.totalSupply) {
        throw new Error(`库存不足，剩余 ${product.totalSupply - soldSupply} 股`);
      }
    }

    // 持仓校验
    if (type === 'sell') {
      const holding = await Holding.findOne({
        userId,
        productId,
        status: 'active',
      }).session(session);
      
      if (!holding || holding.amount < amount) {
        throw new Error('持仓不足');
      }
    }

    // 创建订单
    const orderNo = generateOrderNo(type === 'buy' ? 'BUY' : 'SELL');
    const order = new Order({
      orderNo,
      userId,
      productId,
      type,
      amount,
      price,
      totalAmount: finalAmount,
      fee,
      feeRate: product.feeRate,
      status: 'completed',
      completedAt: new Date(),
    });
    await order.save({ session });

    // 更新用户余额
    const balanceChange = type === 'buy' ? -finalAmount : finalAmount;
    user.balance += balanceChange;
    await user.save({ session });

    // 更新持仓
    let holding = await Holding.findOne({
      userId,
      productId,
      status: 'active',
    }).session(session);

    if (type === 'buy') {
      if (holding) {
        // 加仓：重新计算平均成本
        const totalValue = holding.amount * holding.avgPrice + amount * price;
        holding.amount += amount;
        holding.avgPrice = totalValue / holding.amount;
      } else {
        // 新建持仓
        holding = new Holding({
          userId,
          productId,
          amount,
          avgPrice: price,
          currentPrice: price,
        });
      }
      
      // 更新产品销量
      if (product.isLimited) {
        product.soldSupply = (product.soldSupply || 0) + amount;
        await product.save({ session });
      }
    } else {
      // 卖出
      holding.amount -= amount;
      if (holding.amount === 0) {
        holding.status = 'closed';
      }
    }

    // 计算当前盈亏
    const profit = calculateProfit(holding.amount, price, holding.avgPrice);
    holding.currentPrice = price;
    holding.marketValue = holding.amount * price;
    holding.currentProfit = profit.profit;
    holding.profitRate = profit.profitRate;

    await holding.save({ session });

    // 创建交易流水
    const txNo = generateTxNo();
    const transaction = new Transaction({
      txNo,
      userId,
      orderId: order._id,
      productId,
      type,
      amount: balanceChange,
      balance: user.balance,
      description: `${type === 'buy' ? '买入' : '卖出'} ${product.name} ${amount} 个`,
    });
    await transaction.save({ session });

    // 更新产品成交量
    product.volume24h += amount;
    await product.save({ session });

    // --- 原有的返佣逻辑 ---
    let commissions = [];
    if (type === 'buy' && user.invitedBy) {
      const inviter = await User.findById(user.invitedBy).session(session);
      if (inviter) {
        const directCommission = fee * COMMISSION_RATE_DIRECT;
        inviter.commissionBalance += directCommission;
        inviter.totalCommission += directCommission;
        await inviter.save({ session });

        const directCommissionRecord = new Commission({
          userId: inviter._id,
          fromUserId: user._id,
          orderId: order._id,
          level: 1,
          rate: COMMISSION_RATE_DIRECT,
          amount: directCommission,
          date: new Date(),
          settled: true,
          settledAt: new Date(),
        });
        await directCommissionRecord.save({ session });
        commissions.push(directCommissionRecord);

        // 二级返佣
        if (inviter.invitedBy) {
          const indirectInviter = await User.findById(inviter.invitedBy).session(session);
          if (indirectInviter) {
            const indirectCommission = fee * COMMISSION_RATE_INDIRECT;
            indirectInviter.commissionBalance += indirectCommission;
            indirectInviter.totalCommission += indirectCommission;
            await indirectInviter.save({ session });

            const indirectCommissionRecord = new Commission({
              userId: indirectInviter._id,
              fromUserId: user._id,
              orderId: order._id,
              level: 2,
              rate: COMMISSION_RATE_INDIRECT,
              amount: indirectCommission,
              date: new Date(),
              settled: true,
              settledAt: new Date(),
            });
            await indirectCommissionRecord.save({ session });
            commissions.push(indirectCommissionRecord);
          }
        }
      }
    }

    await session.commitTransaction();

    return {
      order,
      transaction,
      holding,
      commissions,
    };

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

// ============================================================================
// API 路由处理
// ============================================================================

export async function POST(request) {
  try {
    await connectDB();

    const user = verifyToken(request);
    
    if (!user || !user.userId) {
      return errorResponse('身份验证失败，请重新登录', 401);
    }

    const { productId, type, amount } = await request.json();

    if (!productId || !type || !amount) {
      return errorResponse('缺少必要参数');
    }

    if (!['buy', 'sell'].includes(type)) {
      return errorResponse('无效的交易类型');
    }

    if (amount <= 0) {
      return errorResponse('交易数量必须大于0');
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const result = await createOrder(
      user.userId,
      productId,
      type,
      amount,
      ipAddress,
      userAgent
    );

    return successResponse(result, '交易成功');

  } catch (error) {
    console.error('[Create Order Error]', error);
    return errorResponse(error.message || '交易失败', 500);
  }
}

export async function GET(request) {
  try {
    await connectDB();

    const user = verifyToken(request);
    if (!user || !user.userId) {
      return errorResponse('请先登录', 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const skip = (page - 1) * pageSize;

    const filter = { userId: user.userId };
    
    const status = searchParams.get('status');
    if (status) filter.status = status;

    const typeParam = searchParams.get('type');
    if (typeParam) filter.type = typeParam;

    const total = await Order.countDocuments(filter);

    const orders = await Order.find(filter)
      .populate('productId', 'name code category imageUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);

    return successResponse({
      data: orders,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      }
    });

  } catch (error) {
    console.error('[Get Orders Error]', error);
    return errorResponse('获取订单列表失败', 500);
  }
}
