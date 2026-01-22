// app/api/orders/route.js
import { connectDB } from '@/lib/db';
import { User, Product, Holding, Order, Transaction, Commission } from '@/lib/models';
import mongoose from 'mongoose';
import { verifyToken } from '@/lib/middleware';

const COMMISSION_RATE_DIRECT = 0.10;
const COMMISSION_RATE_INDIRECT = 0.05;

// 冲击系数：交易量占比 * 系数 = 价格波动百分比
// 例如：发行 100 股，买 1 股 (1%) * 5 = 5% 价格变动
const IMPACT_COEFFICIENT = 5.0; 

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
// 🔑 创建订单的主事务函数 (包含完整动能逻辑)
// ============================================================================
async function createOrder(userId, productId, type, amount, ipAddress, userAgent) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. 获取产品与用户
    const product = await Product.findById(productId).session(session);
    const user = await User.findById(userId).session(session);

    if (!product || !product.isActive) throw new Error('产品不存在或已下架');
    if (!user) throw new Error('用户不存在');

    // 2. 基础校验
    if (amount < product.minBuyAmount) throw new Error(`最小购买数量为 ${product.minBuyAmount}`);
    
    if (type === 'buy' && product.maxBuyAmount && amount > product.maxBuyAmount) {
      throw new Error(`超过单笔最大买入限制 (最大: ${product.maxBuyAmount})`);
    }
    if (type === 'sell' && product.maxSellAmount && amount > product.maxSellAmount) {
      throw new Error(`超过单笔最大卖出限制 (最大: ${product.maxSellAmount})`);
    }

    // 🔑 库存校验
    if (product.isLimited && product.totalSupply > 0) {
      const soldSupply = product.soldSupply || 0;
      if (type === 'buy' && soldSupply + amount > product.totalSupply) {
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
      if (!holding || holding.amount < amount) throw new Error('持仓不足');
    }

    // 3. 🔑 核心逻辑：计算市场冲击与动能
    let price = product.currentPrice;
    let momentumDelta = 0; // 本次交易产生的动能

    // 只有设置了总发行量，才计算真实市场冲击
    if (product.totalSupply > 0) {
      // 计算交易量占总量的比例
      const tradeRatio = amount / product.totalSupply;
      
      // 计算总的价格变动百分比
      const priceChangePercent = tradeRatio * IMPACT_COEFFICIENT;
      const totalPriceDelta = price * priceChangePercent;

      if (type === 'buy') {
        // 买入：产生正向动能 (价格上涨)
        momentumDelta = totalPriceDelta; 
        
        // 瞬间价格变动：只发生 10% 的变动 (平滑处理)
        price = price * (1 + (priceChangePercent * 0.1));
      } else {
        // 卖出：产生负向动能 (价格下跌)
        momentumDelta = -totalPriceDelta;
        
        // 瞬间价格变动：只发生 10% 的变动
        price = price * (1 - (priceChangePercent * 0.1));
      }

      // 🔑 涨跌停熔断 (防止瞬间变动突破限制)
      const basePrice = product.openPrice || product.closePrice || product.currentPrice;
      if (basePrice > 0) {
        const newChangePercent = ((price - basePrice) / basePrice) * 100;
        
        if (product.limitUpPercent > 0 && newChangePercent >= product.limitUpPercent) {
           price = basePrice * (1 + product.limitUpPercent / 100);
        }
        if (product.limitDownPercent > 0 && newChangePercent <= (product.limitDownPercent * -1)) {
           price = basePrice * (1 - product.limitDownPercent / 100);
        }
      }
    }

    // 4. 交易资金计算
    const totalAmount = amount * price;
    const fee = totalAmount * (product.feeRate || 0);
    const finalAmount = type === 'buy' ? totalAmount + fee : totalAmount - fee;

    if (type === 'buy' && user.balance < finalAmount) throw new Error('余额不足');

    // 5. 创建订单
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

    // 6. 更新用户余额
    const balanceChange = type === 'buy' ? -finalAmount : finalAmount;
    user.balance += balanceChange;
    await user.save({ session });

    // 7. 更新持仓 & 库存
    let holding = await Holding.findOne({
      userId,
      productId,
      status: 'active',
    }).session(session);

    if (type === 'buy') {
      if (holding) {
        const totalValue = holding.amount * holding.avgPrice + amount * price;
        holding.amount += amount;
        holding.avgPrice = totalValue / holding.amount;
      } else {
        holding = new Holding({
          userId,
          productId,
          amount,
          avgPrice: price,
          currentPrice: price,
        });
      }
      
      // 🔑 买入增加已售库存
      if (product.isLimited) {
        product.soldSupply = (product.soldSupply || 0) + amount;
      }
    } else {
      // 卖出
      holding.amount -= amount;
      if (holding.amount === 0) holding.status = 'closed';
      
      // 🔑 卖出减少已售库存 (恢复库存)
      if (product.isLimited) {
        product.soldSupply = (product.soldSupply || 0) - amount;
      }
    }

    // 计算当前盈亏
    const profit = calculateProfit(holding.amount, price, holding.avgPrice);
    holding.currentPrice = price;
    holding.marketValue = holding.amount * price;
    holding.currentProfit = profit.profit;
    holding.profitRate = profit.profitRate;
    await holding.save({ session });

    // 8. 创建交易流水
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

    // 9. 🔑 更新产品数据 (含 K线与动能)
    product.currentPrice = price;
    product.volume24h += amount;
    
    // 🔑 累加动能
    // 无论买还是卖，都会影响 product.momentum
    // 如果动能是正的，价格会倾向于涨；如果是负的，倾向于跌
    product.momentum = (product.momentum || 0) + momentumDelta;

    // 🔑 实时更新分钟线 K (确保有形状)
    const now = new Date();
    const lastKline = product.minuteKlineData.length > 0 
      ? product.minuteKlineData[product.minuteKlineData.length - 1] 
      : null;

    const currentTimeFloor = Math.floor(now / 60000) * 60000 * 1000; // 当前分钟的毫秒数
    const lastTime = lastKline ? lastKline.date.getTime() : 0;

    if (lastKline && lastTime === currentTimeFloor) {
      // 同一分钟内：更新 K线实体
      lastKline.close = price;
      lastKline.high = Math.max(lastKline.high, price);
      lastKline.low = Math.min(lastKline.low, price);
      lastKline.volume += amount;
    } else {
      // 新的一分钟：创建新 K线
      product.minuteKlineData.push({
        date: new Date(currentTimeFloor),
        open: price,
        close: price,
        high: price,
        low: price,
        volume: amount
      });
      // 保持 K线数据不过大 (保留最近 24小时)
      if (product.minuteKlineData.length > 1440) {
        product.minuteKlineData.shift();
      }
    }

    await product.save({ session });

    // --- 返佣逻辑 (保留原有逻辑) ---
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
