// app/market/[id]/page.js
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  RefreshCw, 
  AlertTriangle 
} from 'lucide-react';
import { formatCurrency, formatPercent, getColorByValue } from '@/lib/utils';
import KLineChart from '@/components/charts/kline-chart';
import Modal from '@/components/ui/modal';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState('1d');
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradeType, setTradeType] = useState('buy');
  const [tradeAmount, setTradeAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // --- 实时刷新状态 ---
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 数据获取逻辑 (支持静默刷新)
  const fetchProduct = async (silent = false) => {
    if (!silent) setLoading(true);
    if (silent) setIsRefreshing(true);

    try {
      const res = await fetch(`/api/products/${params.id}?period=${chartPeriod}`, {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      const data = await res.json();
      
      // 调试：在控制台打印后端返回的原始数据
      console.log('API 返回数据:', data);

      if (data.success && data.data) {
        let p = data.data.product;
        
        // --- 智能补偿逻辑 ---
        
        // 1. 自动计算市值 (如果后端没传，就用 价格 * 总量)
        if (!p.marketCap && p.currentPrice && p.totalSupply) {
          p.marketCap = p.currentPrice * p.totalSupply;
        }

        // 2. 补全涨跌幅 (如果后端没传，默认为 0)
        ['dailyChange', 'weeklyChange', 'monthlyChange', 'yearlyChange'].forEach(key => {
          if (p[key] === undefined || p[key] === null) {
            p[key] = 0;
          }
        });

        setProduct(p);
        setHistory(data.data.history || []);
        setLastUpdateTime(new Date());
      } else {
        console.error('Product fetch failed:', data.message);
        if (!silent) alert('获取数据失败');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      if (!silent) alert('网络错误');
    } finally {
      if (!silent) setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchProduct();
      
      // 🔑 5秒自动刷新 (确保你能看到实时价格变动)
      const interval = setInterval(() => {
        fetchProduct(true); 
      }, 5000); 

      return () => clearInterval(interval);
    }
  }, [params.id]); 

  // 切换图表周期时手动刷新一次
  useEffect(() => {
    if (product) fetchProduct();
  }, [chartPeriod]);

  const handleTrade = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', 
        body: JSON.stringify({
          productId: params.id,
          type: tradeType,
          amount: parseFloat(tradeAmount),
        }),
      });

      const result = await response.json();

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        alert('登录已过期，请重新登录');
        router.push('/login');
        return;
      }

      if (response.ok && result.success) {
        setShowTradeModal(false);
        setTradeAmount('');
        alert('交易成功！');
        fetchProduct(); 
      } else {
        alert(result.message || '交易失败，请重试');
      }
    } catch (error) {
      console.error('Error executing trade:', error);
      alert('网络错误，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatLastUpdate = (date) => {
    if (!date) return '--';
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return `${seconds}秒前`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}分钟前`;
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">产品不存在或已下架</p>
          <button
            onClick={() => router.push('/market')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回市场
          </button>
        </div>
      </div>
    );
  }

  const isPositive = (product.dailyChange || 0) >= 0;
  const isSoldOut = product.isLimited && (product.soldSupply || 0) >= (product.totalSupply || 0);
  const canBuy = !isSoldOut;
  const estimatedFee = tradeAmount ? (parseFloat(tradeAmount) * product.currentPrice * (product.feeRate || 0)) : 0;
  const estimatedTotal = tradeAmount ? (parseFloat(tradeAmount) * product.currentPrice) : 0;
  const finalAmount = tradeType === 'buy' ? estimatedTotal + estimatedFee : estimatedTotal - estimatedFee;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb & Auto-Refresh Indicator */}
      <nav className="mb-6 flex justify-between items-center">
        <ol className="flex items-center space-x-2 text-sm">
          <li>
            <a href="/market" className="text-gray-500 hover:text-gray-700">
              市场
            </a>
          </li>
          <li className="text-gray-400">/</li>
          <li className="text-gray-900 font-medium">{product.name}</li>
        </ol>
        
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
          <Clock className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs text-gray-500 font-medium">更新于 {formatLastUpdate(lastUpdateTime)}</span>
          <button 
            onClick={() => fetchProduct()}
            className={`text-gray-400 hover:text-blue-600 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
            disabled={isRefreshing}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </nav>

      {/* Header Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
              <span
                className={`px-3 py-1 text-xs font-medium rounded-full border ${
                  product.category === '游戏产品'
                    ? 'bg-purple-50 text-purple-700 border-purple-100'
                    : product.category === '虚拟产品'
                    ? 'bg-blue-50 text-blue-700 border-blue-100'
                    : 'bg-green-50 text-green-700 border-green-100'
                }`}
              >
                {product.category}
              </span>
            </div>
            <p className="text-gray-500 font-mono">{product.code}</p>
          </div>
          <div className="text-left md:text-right flex flex-col items-start md:items-end">
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {formatCurrency(product.currentPrice)}
            </div>
            <div className="flex items-center gap-2">
              {isPositive ? (
                <TrendingUp className="h-5 w-5 text-red-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-green-600" />
              )}
              <span
                className={`text-lg font-medium ${
                  isPositive ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {isPositive ? '+' : ''}
                {formatPercent(product.dailyChange)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Chart & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* K-Line Chart Area */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">价格走势</h2>
              <div className="flex space-x-2">
                {[{ key: '1m', label: '1分' }, { key: '5m', label: '5分' }, { key: '15m', label: '15分' }, { key: '1h', label: '1时' }, { key: '1d', label: '日' }, { key: '1w', label: '周' }, { key: '1M', label: '月' }, { key: '1y', label: '年' }].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setChartPeriod(item.key)}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      chartPeriod === item.key
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            
            <KLineChart data={history} period={chartPeriod} height={400} />
          </div>

          {/* Product Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">产品详情</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">日涨跌</p>
                <p className={`text-lg font-semibold ${getColorByValue(product.dailyChange)}`}>
                  {formatPercent(product.dailyChange || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">周涨跌</p>
                <p className={`text-lg font-semibold ${getColorByValue(product.weeklyChange)}`}>
                  {formatPercent(product.weeklyChange || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">月涨跌</p>
                <p className={`text-lg font-semibold ${getColorByValue(product.monthlyChange)}`}>
                  {formatPercent(product.monthlyChange || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">年涨跌</p>
                <p className={`text-lg font-semibold ${getColorByValue(product.yearlyChange)}`}>
                  {formatPercent(product.yearlyChange || 0)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">成交量</p>
                <p className="text-lg font-semibold text-gray-900">
                  {(product.volume24h || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">市值</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(product.marketCap || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">手续费</p>
                <p className="text-lg font-semibold text-gray-900">
                  {((product.feeRate || 0) * 100).toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">最小交易</p>
                <p className="text-lg font-semibold text-gray-900">
                  {product.minBuyAmount}
                </p>
              </div>
            </div>

            {/* 高级信息展示：限量和分红 */}
            {product.isLimited && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <h4 className="font-medium text-amber-800 mb-2">限量发售信息</h4>
                <div className="flex justify-between text-sm text-amber-700 mb-2">
                  <span>已售出: {product.soldSupply || 0} 股</span>
                  <span>总量: {product.totalSupply || 0} 股</span>
                </div>
                <div className="w-full bg-amber-200 rounded-full h-2">
                  <div
                    className="bg-amber-600 h-2 rounded-full"
                    style={{
                      width: `${((product.soldSupply || 0) / (product.totalSupply || 1)) * 100}%`,
                    }}
                  ></div>
                </div>
                {isSoldOut && (
                  <div className="mt-2 text-xs text-red-600 font-bold text-center">
                    该产品已售罄，仅支持卖出
                  </div>
                )}
              </div>
            )}

            {product.dividendRate > 0 && (
              <div className="mb-4 p-4 bg-green-50 border border-green-100 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">分红收益信息</h4>
                <p className="text-sm text-green-700">
                  当前每股收益：{formatCurrency(product.dividendPerShare)}
                </p>
                <p className="text-sm text-green-700">
                  年化收益率：{product.dividendRate.toFixed(2)}%
                </p>
              </div>
            )}

            <div className="prose max-w-none">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">产品介绍</h3>
              <p className="text-gray-600">
                {product.description || '暂无详细介绍'}
              </p>
            </div>

            {/* 风险提示 */}
            {(product.stopProfit > 0 || product.stopLoss > 0) && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-1">风险提示</h4>
                    <p className="text-sm text-yellow-700">
                      该产品设置了止盈止损机制，止盈比例{' '}
                      {product.stopProfit}%，止损比例 {product.stopLoss}%
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Trading Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-24">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">交易</h2>

            {/* 买卖切换 */}
            <div className="flex space-x-2 mb-6">
              <button
                onClick={() => setTradeType('buy')}
                className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                  tradeType === 'buy'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                买入
              </button>
              <button
                onClick={() => setTradeType('sell')}
                className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                  tradeType === 'sell'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                卖出
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  交易数量
                </label>
                <Input
                  type="number"
                  min={product.minBuyAmount}
                  step="1"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                  placeholder={`最少 ${product.minBuyAmount}`}
                />
              </div>

              {/* 预计金额展示 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">单价</span>
                  <span className="font-medium">
                    {formatCurrency(product.currentPrice)}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">手续费</span>
                  <span className="font-medium">
                    {formatCurrency(estimatedFee)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">预计金额</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(finalAmount)}
                  </span>
                </div>
              </div>

              {/* 提交按钮 */}
              <Button
                onClick={() => {
                  if (tradeType === 'buy' && !canBuy) {
                    alert('该产品已售罄，仅支持卖出');
                    return;
                  }
                  setShowTradeModal(true);
                }}
                disabled={!tradeAmount || parseFloat(tradeAmount) < (product.minBuyAmount || 1)}
                className={`w-full ${
                  tradeType === 'buy'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
                size="lg"
              >
                {isSoldOut && tradeType === 'buy' ? '已售罄' : (tradeType === 'buy' ? '确认买入' : '确认卖出')}
              </Button>

              <div className="text-center text-sm text-gray-500">
                <Clock className="h-4 w-4 inline mr-1" />
                交易时间：09:30 - 15:00
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trade Confirmation Modal */}
      <Modal
        isOpen={showTradeModal}
        onClose={() => setShowTradeModal(false)}
        title={tradeType === 'buy' ? '确认买入' : '确认卖出'}
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">产品名称</span>
              <span className="font-medium">{product.name}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">交易数量</span>
              <span className="font-medium">{tradeAmount}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">成交价格</span>
              <span className="font-medium">
                {formatCurrency(product.currentPrice)}
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">手续费</span>
              <span className="font-medium">
                {formatCurrency(estimatedFee)}
              </span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between">
              <span className="text-gray-900 font-semibold">总金额</span>
              <span className="text-blue-600 font-bold">
                {formatCurrency(finalAmount)}
              </span>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="secondary"
              onClick={() => setShowTradeModal(false)}
              className="flex-1"
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button
              onClick={handleTrade}
              className={`flex-1 ${
                tradeType === 'buy'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
              disabled={isSubmitting}
            >
              {isSubmitting ? '处理中...' : `确认${tradeType === 'buy' ? '买入' : '卖出'}`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
