// app/dashboard/page.js
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db';
import { User, Holding, Transaction } from '@/lib/models';
import jwt from 'jsonwebtoken';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { Wallet, TrendingUp, TrendingDown, ArrowDownLeft, LogOut, Minus, ArrowUpRight, Calendar, Award, Target, DollarSign } from 'lucide-react';

// 强制动态渲染
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    redirect('/login');
  }

  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.userId;
  } catch (error) {
    redirect('/login');
  }

  // 获取数据
  let user, holdings, summary;
  let earnings = { today: 0, month: 0, year: 0 };

  try {
    await connectDB();
    
    const [userDoc, holdingsDoc] = await Promise.all([
      User.findById(userId).select('username balance frozenBalance avatar'),
      Holding.find({ userId, status: 'active' })
        .populate('productId', 'name code currentPrice category dailyChange imageUrl dividendPerShare dividendPayInterval')
        .sort({ updatedAt: -1 })
    ]);

    user = userDoc;
    holdings = holdingsDoc;

    // 计算资产汇总
    let totalMarketValue = 0;
    let totalProfit = 0;
    holdings.forEach(h => {
      totalMarketValue += h.amount * h.currentPrice;
      totalProfit += h.currentProfit || 0;
    });

    summary = {
      totalAssets: (user?.balance || 0) + totalMarketValue,
      balance: user?.balance || 0,
      totalMarketValue,
      totalProfit,
    };

    // 🔑 计算收益 (基于 Transaction 表的已实现盈亏)
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // 获取所有盈利型交易 (buy/sell/commission/refund)
    const transactions = await Transaction.find({
      userId,
      type: { $in: ['buy', 'sell', 'commission', 'refund'] },
      createdAt: { $gte: startOfYear } // 只查今年
    });

    transactions.forEach(t => {
      // 简单计算：卖出通常是负数(支出)或正数(退回)，买入是负数
      // 这里假设：盈亏体现在 amount 上。或者你需要更复杂的逻辑。
      // 暂定：如果 amount > 0 且类型是 sell，视为收益。
      if (t.amount > 0 && t.type === 'sell') {
        if (t.createdAt >= startOfDay) earnings.today += t.amount;
        if (t.createdAt >= startOfMonth) earnings.month += t.amount;
        earnings.year += t.amount;
      }
      // 分红也是收益
      if (t.type === 'commission' && t.amount > 0) {
         if (t.createdAt >= startOfDay) earnings.today += t.amount;
         if (t.createdAt >= startOfMonth) earnings.month += t.amount;
         earnings.year += t.amount;
      }
    });

  } catch (error) {
    console.error('Dashboard Data Error:', error);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">个人中心</h1>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user?.username || '用户'}</p>
              <p className="text-xs text-gray-500">UID: {userId}</p>
            </div>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-red-600 transition-colors">
                <LogOut className="h-4 w-4 mr-1" /> 退出
              </button>
            </form>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* 🔑 新增：收益统计卡牌 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">今日收益 (已实现)</p>
              <p className={`text-lg font-bold ${earnings.today >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {earnings.today >= 0 ? '+' : ''}{formatCurrency(earnings.today)}
              </p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Calendar className="h-5 w-5" /></div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-purple-500 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">本月收益</p>
              <p className={`text-lg font-bold ${earnings.month >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {earnings.month >= 0 ? '+' : ''}{formatCurrency(earnings.month)}
              </p>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><Target className="h-5 w-5" /></div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">年度收益</p>
              <p className={`text-lg font-bold ${earnings.year >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {earnings.year >= 0 ? '+' : ''}{formatCurrency(earnings.year)}
              </p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg text-green-600"><Award className="h-5 w-5" /></div>
          </div>
        </div>

        {/* 资产概览卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-blue-100 font-medium">总资产 (估值)</span>
              <Wallet className="h-5 w-5 text-blue-200" />
            </div>
            <p className="text-3xl font-bold mb-2">
              {formatCurrency(summary?.totalAssets || 0)}
            </p>
            <div className="flex items-center text-sm text-blue-100">
              {summary?.totalProfit >= 0 ? (
                <><TrendingUp className="h-4 w-4 mr-1" /> 盈利 {formatCurrency(summary.totalProfit)}</>
              ) : (
                <><TrendingDown className="h-4 w-4 mr-1" /> 亏损 {formatCurrency(Math.abs(summary.totalProfit))}</>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-500 font-medium">可用余额</span>
              <Wallet className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">
              {formatCurrency(summary?.balance || 0)}
            </p>
            <div className="text-sm text-gray-500">可用于买入</div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-500 font-medium">持仓市值</span>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">
              {formatCurrency(summary?.totalMarketValue || 0)}
            </p>
            <div className="text-sm text-gray-500">当前市场价值</div>
          </div>
        </div>

        {/* 持仓列表 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
            <ArrowDownLeft className="h-5 w-5 mr-2 text-blue-600" />
            我的持仓 ({holdings?.length || 0})
          </h2>

          {!holdings || holdings.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-50 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                <Wallet className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg">暂无持仓</p>
              <a 
                href="/market"
                className="mt-4 inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                去市场选购
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {holdings.map((holding) => {
                const product = holding.productId;
                const isProfit = (holding.currentProfit || 0) >= 0;

                const holdingDays = Math.floor((new Date() - new Date(holding.createdAt)) / (1000 * 60 * 60 * 24));
                
                let estimatedDividend = null;
                let dividendEligible = false;
                if (product && product.dividendPerShare > 0 && product.dividendPayInterval > 0) {
                  if (holdingDays >= product.dividendPayInterval) {
                    dividendEligible = true;
                    estimatedDividend = holding.amount * product.dividendPerShare;
                  }
                }

                return (
                  <div key={holding._id} className="border border-gray-200 rounded-xl p-5 hover:shadow-xl transition-all duration-300 group bg-white">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{product?.name || '未知产品'}</h3>
                        <p className="text-xs text-gray-500">{product?.code}</p>
                      </div>
                      <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md font-medium">持仓</span>
                    </div>

                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <p className="text-xs text-gray-400">持有数量</p>
                        <p className="text-xl font-bold text-gray-900">{holding.amount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">当前市值</p>
                        <p className="text-xl font-bold text-gray-900">
                          {formatCurrency(holding.marketValue)}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mb-2 text-xs">
                      <span className="text-gray-500 flex items-center"><Calendar className="h-3 w-3 mr-1" /> 持有天数</span>
                      <span className="font-medium text-gray-900">{holdingDays} 天</span>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 flex justify-between items-center mb-4">
                      <div className="text-xs text-gray-500">持仓均价</div>
                      <div className="text-sm font-medium text-gray-900">{formatCurrency(holding.avgPrice)}</div>
                    </div>

                    {dividendEligible ? (
                      <div className="bg-green-50 rounded-lg p-3 mb-4 border border-green-100">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-green-800">预计分红收益</span>
                          <span className="text-sm font-bold text-green-700">+{formatCurrency(estimatedDividend)}</span>
                        </div>
                        <div className="text-right text-xs text-green-600 mt-1">已达发放条件</div>
                      </div>
                    ) : product?.dividendPerShare > 0 ? (
                      <div className="bg-gray-100 rounded-lg p-3 mb-4 text-center">
                         <p className="text-xs text-gray-500">持有满 {product.dividendPayInterval} 天后将获得分红收益</p>
                      </div>
                    ) : null}

                    <div className={`bg-${isProfit ? 'red' : 'green'}-50 rounded-lg p-3 mb-4`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-medium ${isProfit ? 'text-red-700' : 'text-green-700'}`}>
                          {isProfit ? '浮动盈利' : '浮动亏损'}
                        </span>
                        <span className={`text-lg font-bold ${isProfit ? 'text-red-700' : 'text-green-700'}`}>
                          {formatCurrency(holding.currentProfit)}
                        </span>
                      </div>
                      <div className="text-right text-xs mt-1">
                        <span className={isProfit ? 'text-red-600' : 'text-green-600'}>
                          {formatPercent(holding.profitRate)}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <a 
                        href={`/market/${product?._id}?type=sell`}
                        className="flex-1 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                      >
                        <Minus className="h-4 w-4 mr-1" /> 卖出
                      </a>
                      <a 
                        href={`/market/${product?._id}`}
                        className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                      >
                        <ArrowUpRight className="h-4 w-4 mr-1" /> 详情
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
