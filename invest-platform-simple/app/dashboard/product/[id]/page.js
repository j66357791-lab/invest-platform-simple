'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, ArrowUpDown, Clock, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatPercent, getColorByValue } from '@/lib/utils';
import KLineChart from '@/components/charts/kline-chart';
import Modal from '@/components/ui/modal';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradeType, setTradeType] = useState('buy'); // 'buy' or 'sell'
  const [tradeAmount, setTradeAmount] = useState('');
  const [userHolding, setUserHolding] = useState(null);

  useEffect(() => {
    fetchProduct();
  }, [params.id]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${params.id}`);
      const data = await response.json();
      setProduct(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching product:', error);
      setLoading(false);
    }
  };

  const handleTrade = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: params.id,
          type: tradeType,
          amount: parseFloat(tradeAmount),
        }),
      });

      if (response.ok) {
        setShowTradeModal(false);
        setTradeAmount('');
        // Refresh data
        fetchProduct();
      } else {
        const error = await response.json();
        alert(error.error || '交易失败');
      }
    } catch (error) {
      console.error('Error executing trade:', error);
      alert('交易失败，请重试');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-96"></div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-96"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">道具不存在或已下架</p>
          <button
            onClick={() => router.push('/market')}
            className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            返回市场
          </button>
        </div>
      </div>
    );
  }

  const isPositive = product.dailyChange >= 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="mb-8">
        <ol className="flex items-center space-x-2 text-sm">
          <li>
            <a href="/market" className="text-gray-500 hover:text-gray-700">
              市场
            </a>
          </li>
          <li className="text-gray-400">/</li>
          <li className="text-gray-900 font-medium">{product.name}</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                product.category === '游戏' ? 'bg-purple-100 text-purple-700' :
                product.category === '虚拟' ? 'bg-blue-100 text-blue-700' :
                'bg-green-100 text-green-700'
              }`}>
                {product.category}
              </span>
            </div>
            <p className="text-gray-600">{product.symbol}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(product.currentPrice)}
            </p>
            <div className="flex items-center justify-end space-x-2 mt-1">
              {isPositive ? (
                <TrendingUp className="h-5 w-5 text-red-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-green-600" />
              )}
              <span className={`text-lg font-medium ${isPositive ? 'text-red-600' : 'text-green-600'}`}>
                {isPositive ? '+' : ''}{formatPercent(product.dailyChange)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart and Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">价格走势</h2>
              <div className="flex space-x-2">
                <button className="px-3 py-1 text-sm bg-primary-100 text-primary-600 rounded-lg">日</button>
                <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">周</button>
                <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">月</button>
                <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">年</button>
              </div>
            </div>
            <KLineChart 
              data={product.priceHistory || []} 
              height={400}
            />
          </div>

          {/* Product Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">道具详情</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">日涨跌</p>
                <p className={`text-lg font-semibold ${getColorByValue(product.dailyChange)}`}>
                  {formatPercent(product.dailyChange)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">周涨跌</p>
                <p className={`text-lg font-semibold ${getColorByValue(product.weeklyChange)}`}>
                  {formatPercent(product.weeklyChange)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">月涨跌</p>
                <p className={`text-lg font-semibold ${getColorByValue(product.monthlyChange)}`}>
                  {formatPercent(product.monthlyChange)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">年涨跌</p>
                <p className={`text-lg font-semibold ${getColorByValue(product.yearlyChange)}`}>
                  {formatPercent(product.yearlyChange)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">成交量</p>
                <p className="text-lg font-semibold text-gray-900">
                  {product.volume24h?.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">市值</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(product.marketCap)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">手续费</p>
                <p className="text-lg font-semibold text-gray-900">
                  {(product.feeRate * 100).toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">最小交易</p>
                <p className="text-lg font-semibold text-gray-900">
                  {product.minBuyAmount}
                </p>
              </div>
            </div>

            <div className="prose max-w-none">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">产品介绍</h3>
              <p className="text-gray-600">{product.description || '暂无详细介绍'}</p>
            </div>

            {(product.stopProfit > 0 || product.stopLoss > 0) && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-1">风险提示</h4>
                    <p className="text-sm text-yellow-700">
                      该产品设置了止盈止损机制，止盈比例 {product.stopProfit}%，止损比例 {product.stopLoss}%
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Trading Panel */}
        <div className="space-y-6">
          {/* Trade Panel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-24">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">交易</h2>
            
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

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">单价</span>
                  <span className="font-medium">{formatCurrency(product.currentPrice)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">手续费</span>
                  <span className="font-medium">{(product.feeRate * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">预计金额</span>
                  <span className="font-semibold">
                    {tradeAmount ? formatCurrency(parseFloat(tradeAmount) * product.currentPrice * (1 + product.feeRate)) : '-'}
                  </span>
                </div>
              </div>

              <Button
                onClick={() => setShowTradeModal(true)}
                disabled={!tradeAmount || parseFloat(tradeAmount) < product.minBuyAmount}
                className={`w-full ${
                  tradeType === 'buy' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                }`}
                size="lg"
              >
                {tradeType === 'buy' ? '确认买入' : '确认卖出'}
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
              <span className="text-gray-600">道具名称</span>
              <span className="font-medium">{product.name}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">交易数量</span>
              <span className="font-medium">{tradeAmount}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">成交价格</span>
              <span className="font-medium">{formatCurrency(product.currentPrice)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">手续费</span>
              <span className="font-medium">{formatCurrency(parseFloat(tradeAmount) * product.currentPrice * product.feeRate)}</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between">
              <span className="text-gray-900 font-semibold">总金额</span>
              <span className="text-primary-600 font-bold">
                {formatCurrency(parseFloat(tradeAmount) * product.currentPrice * (1 + product.feeRate))}
              </span>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="secondary"
              onClick={() => setShowTradeModal(false)}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              onClick={handleTrade}
              className={`flex-1 ${
                tradeType === 'buy' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              确认{tradeType === 'buy' ? '买入' : '卖出'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
