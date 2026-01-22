// lib/models.js (完整代码 - 包含动能字段)
import mongoose from 'mongoose';

// ============================================================================
// 用户模型
// ============================================================================
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, minlength: 3, maxlength: 20, trim: true },
  password: { type: String, required: true, minlength: 6 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  avatar: { type: String },
  
  balance: { type: Number, default: 0 },
  frozenBalance: { type: Number, default: 0 },
  totalDeposit: { type: Number, default: 0 },
  totalWithdraw: { type: Number, default: 0 },
  
  realName: { type: String },
  idCard: { type: String },
  idCardFront: { type: String },
  idCardBack: { type: String },
  isVerified: { type: Boolean, default: false },
  verifiedAt: { type: Date },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  inviteCode: { type: String, unique: true, sparse: true }, 
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  commissionBalance: { type: Number, default: 0 },
  totalCommission: { type: Number, default: 0 },
  
  role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
  position: { type: String },
  
  isActive: { type: Boolean, default: true },
  isFrozen: { type: Boolean, default: false },
  freezeReason: { type: String },
  
  productLimits: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    maxQuantity: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  }],
  
  lastLoginAt: { type: Date },
  lastLoginIp: { type: String },
}, { timestamps: true });

UserSchema.index({ invitedBy: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.virtual('fullName').get(function() { return this.realName || this.username; });

// ============================================================================
// 产品模型 (核心升级版 - 包含动能)
// ============================================================================
const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true }, 
  symbol: { type: String },
  category: { type: String, enum: ['实体', '虚拟产品', '游戏产品', '投资收益'], required: true },
  issueDate: { type: Date, default: Date.now },

  // --- 基础价格 ---
  currentPrice: { type: Number, required: true },
  openPrice: { type: Number },
  highPrice: { type: Number },
  lowPrice: { type: Number },
  closePrice: { type: Number },
  
  dailyChange: { type: Number, default: 0 }, 
  weeklyChange: { type: Number, default: 0 },
  monthlyChange: { type: Number, default: 0 },
  yearlyChange: { type: Number, default: 0 },
  
  volume24h: { type: Number, default: 0 },
  marketCap: { type: Number, default: 0 },

  // --- 交易设置 ---
  minBuyAmount: { type: Number, default: 1 },
  maxBuyAmount: { type: Number, default: 99999999 },
  maxSellAmount: { type: Number, default: 99999999 },
  feeRate: { type: Number, default: 0.001 },
  minWithdraw: { type: Number, default: 100 },
  maxWithdraw: { type: Number },
  
  stopProfit: { type: Number, default: 0 },
  stopLoss: { type: Number, default: 0 },
  
  description: { type: String },
  notice: { type: String },
  imageUrl: { type: String },
  
  isActive: { type: Boolean, default: true },
  isHot: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 },

  // --- 1. 限量发售 ---
  isLimited: { type: Boolean, default: false },
  totalSupply: { type: Number, default: 0 },
  soldSupply: { type: Number, default: 0 },

  // --- 2. 分红收益 ---
  dividendRate: { type: Number, default: 0 },
  dividendUpdateInterval: { type: Number, default: 24 },
  dividendPayInterval: { type: Number, default: 30 },
  dividendPerShare: { type: Number, default: 0 },
  lastDividendUpdateTime: { type: Date },
  lastDividendPayTime: { type: Date },

  // --- 3. 价格策略 ---
  strategyType: { 
    type: String, 
    enum: ['market', 'trend_up', 'trend_down'], 
    default: 'market'
  },
  strategyTargetPercent: { type: Number, default: 0 },
  strategyTargetMinutes: { type: Number, default: 0 },
  lastStrategyUpdateAt: { type: Date },
  
  // --- 4. 涨跌停 ---
  limitUpPercent: { type: Number, default: 10 },        // 默认 10%
  limitDownPercent: { type: Number, default: 10 },      // 默认 10%

  // --- 5. 分钟K线 ---
  minuteKlineData: [{
    date: { type: Date, required: true },
    open: { type: Number, required: true },
    high: { type: Number, required: true },
    low: { type: Number, required: true },
    close: { type: Number, required: true },
    volume: { type: Number, default: 0 },
  }],
  lastKlineUpdateAt: { type: Date },

  // --- 6. 🔑 市场动能 (新增核心字段) ---
  // 存储待释放的价格力量。正值表示看涨，负值表示看跌。
  // 交易增加动能，定时任务每分钟消耗动能平滑价格。
  momentum: { type: Number, default: 0 },

}, { timestamps: true });

// 历史价格
ProductSchema.add({
  priceHistory: [{
    date: { type: Date, required: true },
    open: { type: Number, required: true },
    high: { type: Number, required: true },
    low: { type: Number, required: true },
    close: { type: Number, required: true },
    volume: { type: Number, default: 0 },
    changePercent: { type: Number, default: 0 },
  }],
});

ProductSchema.index({ category: 1 });
ProductSchema.index({ isActive: 1, isHot: 1 });
ProductSchema.index({ minuteKlineData: -1 });
ProductSchema.index({ createdAt: -1 });

ProductSchema.methods.updateHistory = async function(newRecord) {
  const recordDate = new Date(newRecord.date);
  recordDate.setHours(0, 0, 0, 0);

  const previousHistory = this.priceHistory
    .filter(h => h.date < recordDate)
    .sort((a, b) => b.date - a.date)[0];

  let changePercent = 0;
  if (previousHistory && previousHistory.close > 0) {
    changePercent = ((newRecord.close - previousHistory.close) / previousHistory.close) * 100;
  }

  const historyEntry = {
    date: recordDate,
    open: Number(newRecord.open),
    high: Number(newRecord.high),
    low: Number(newRecord.low),
    close: Number(newRecord.close),
    volume: Number(newRecord.volume || 0),
    changePercent: parseFloat(changePercent.toFixed(4))
  };

  const existingIndex = this.priceHistory.findIndex(h => {
    const d = new Date(h.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === recordDate.getTime();
  });

  if (existingIndex >= 0) {
    this.priceHistory[existingIndex] = historyEntry;
  } else {
    this.priceHistory.push(historyEntry);
  }

  this.priceHistory.sort((a, b) => a.date - b.date);

  if (this.priceHistory.length > 0) {
    const latestRecord = this.priceHistory[this.priceHistory.length - 1];
    if (latestRecord.date.getTime() === recordDate.getTime()) {
      this.currentPrice = latestRecord.close;
      this.closePrice = latestRecord.close;
      this.dailyChange = latestRecord.changePercent;
      this.openPrice = latestRecord.open;
      this.highPrice = latestRecord.high;
      this.lowPrice = latestRecord.low;
    }
  }

  return await this.save();
};

// ============================================================================
// 持仓模型
// ============================================================================
const HoldingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  amount: { type: Number, required: true },
  avgPrice: { type: Number, required: true },
  currentPrice: { type: Number },
  marketValue: { type: Number },
  currentProfit: { type: Number, default: 0 },
  profitRate: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'closed', 'stop_profit', 'stop_loss'], default: 'active' },
}, { timestamps: true });

HoldingSchema.index({ userId: 1, productId: 1, status: 1 });

// ============================================================================
// 订单模型
// ============================================================================
const OrderSchema = new mongoose.Schema({
  orderNo: { type: String, required: true, unique: true }, 
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  holdingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Holding' },
  type: { type: String, enum: ['buy', 'sell'], required: true },
  amount: { type: Number, required: true },
  price: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  fee: { type: Number, required: true },
  feeRate: { type: Number },
  status: { type: String, enum: ['pending', 'completed', 'cancelled', 'failed'], default: 'pending' },
  completedAt: { type: Date },
  remark: { type: String },
}, { timestamps: true });

OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });

// ============================================================================
// 交易流水模型
// ============================================================================
const TransactionSchema = new mongoose.Schema({
  txNo: { type: String, required: true, unique: true }, 
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  type: { type: String, enum: ['deposit', 'withdraw', 'buy', 'sell', 'commission', 'refund', 'freeze', 'unfreeze'], required: true },
  amount: { type: Number, required: true },
  balance: { type: Number, required: true },
  frozen: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
  description: { type: String },
  remark: { type: String },
}, { timestamps: true });

TransactionSchema.index({ userId: 1, createdAt: -1 });

// ============================================================================
// 提现申请模型
// ============================================================================
const WithdrawSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderNo: { type: String, required: true, unique: true }, 
  amount: { type: Number, required: true },
  fee: { type: Number, default: 0 },
  actualAmount: { type: Number, required: true },
  bankName: { type: String },
  bankAccount: { type: String },
  accountName: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed', 'failed'], default: 'pending' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  reviewRemark: { type: String },
  transactionId: { type: String }, 
}, { timestamps: true });

WithdrawSchema.index({ userId: 1, status: 1 });
WithdrawSchema.index({ status: 1, createdAt: -1 });
WithdrawSchema.index({ orderNo: 1 });

// ============================================================================
// 充值申请模型
// ============================================================================
const DepositSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderNo: { type: String, unique: true, sparse: true }, 
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['alipay'], default: 'alipay' },
  targetAccount: { type: String, default: '18679012034' }, 
  status: { type: String, enum: ['pending', 'reviewing', 'completed', 'cancelled', 'expired'], default: 'pending' },
  paidAt: { type: Date }, 
  expiresAt: { type: Date }, 
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  reviewRemark: { type: String },
}, { timestamps: true });

DepositSchema.index({ userId: 1, status: 1 });
DepositSchema.index({ status: 1, createdAt: -1 });
DepositSchema.index({ orderNo: 1 });

// ============================================================================
// 返佣记录模型
// ============================================================================
const CommissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  level: { type: Number, enum: [1, 2], required: true },
  rate: { type: Number, required: true },
  amount: { type: Number, required: true },
  settled: { type: Boolean, default: false },
  settledAt: { type: Date },
  date: { type: Date, required: true },
}, { timestamps: true });

CommissionSchema.index({ userId: 1, date: -1 });
CommissionSchema.index({ fromUserId: 1 });
CommissionSchema.index({ settled: 1 });

// ============================================================================
// 操作日志模型
// ============================================================================
const AdminLogSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  module: { type: String, required: true },
  details: mongoose.Schema.Types.Mixed,
  ip: { type: String },
  userAgent: { type: String },
}, { timestamps: true });

AdminLogSchema.index({ adminId: 1, createdAt: -1 });
AdminLogSchema.index({ module: 1, createdAt: -1 });

// ============================================================================
// 公告模型
// ============================================================================
const AnnouncementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['system', 'market', 'activity'], default: 'system' },
  isActive: { type: Boolean, default: true },
  priority: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

AnnouncementSchema.index({ isActive: 1, priority: -1, createdAt: -1 });

// ============================================================================
// 分红记录模型
// ============================================================================
const DividendRecordSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  holdingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Holding', required: true },
  amount: { type: Number, required: true }, 
  holdingDays: { type: Number }, 
  distributedAt: { type: Date, default: Date.now },
}, { timestamps: true });

DividendRecordSchema.index({ userId: 1, productId: 1, distributedAt: -1 });

// ============================================================================
// 论坛帖子模型
// ============================================================================
const PostSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  replies: { type: Number, default: 0 },
  status: { type: Boolean, default: true },
  isPinned: { type: Boolean, default: false },
}, { timestamps: true });

PostSchema.index({ productId: 1, createdAt: -1 });
PostSchema.index({ userId: 1, createdAt: -1 });
PostSchema.index({ status: 1, createdAt: -1 });

// ============================================================================
// 导出模型
// ============================================================================
export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
export const Holding = mongoose.models.Holding || mongoose.model('Holding', HoldingSchema);
export const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
export const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
export const Withdraw = mongoose.models.Withdraw || mongoose.model('Withdraw', WithdrawSchema);
export const Deposit = mongoose.models.Deposit || mongoose.model('Deposit', DepositSchema);
export const Commission = mongoose.models.Commission || mongoose.model('Commission', CommissionSchema);
export const AdminLog = mongoose.models.AdminLog || mongoose.model('AdminLog', AdminLogSchema);
export const Announcement = mongoose.models.Announcement || mongoose.model('Announcement', AnnouncementSchema);
export const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);
export const DividendRecord = mongoose.models.DividendRecord || mongoose.model('DividendRecord', DividendRecordSchema);
