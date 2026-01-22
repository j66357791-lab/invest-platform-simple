// app/market/[id]/page.js - 完整修复版
'use client';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  RefreshCw, 
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  DollarSign,
  Package,
  Shield,
  Info,
  Percent,
  Volume2,
  Target,
  Calendar,
  CheckCircle
} from 'lucide-react';
import { formatCurrency, formatPercent, getColorByValue } from '@/lib/utils';
// 🔧 修改导入：统一使用 SimpleKLineChart
import SimpleKLineChart from '@/components/charts/simple-kline-chart';
import Modal from '@/components/ui/modal';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';

// K线数据管理器（内存缓存）
class KlineCache {
  constructor() {
    this.cache = new Map();
  }
  
  getKey(productId, period) {
    return `${productId}_${period}`;
  }
  
  // 获取缓存数据
  get(productId, period) {
    const key = this.getKey(productId, period);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // 不同周期不同的缓存时间
    const cacheTimes = {
      '1m': 30000,    // 30秒
      '5m': 60000,    // 1分钟
      '15m': 120000,  // 2分钟
      '1h': 300000,   // 5分钟
      '1d': 1800000,  // 30分钟
      '1w': 3600000,  // 1小时
      '1M': 7200000,  // 2小时
      '1y': 21600000  // 6小时
    };
    
    const cacheTime = cacheTimes[period] || 30000;
    if (Date.now() - cached.timestamp > cacheTime) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  // 设置缓存
  set(productId, period, data) {
    const key = this.getKey(productId, period);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  // 清理缓存
  clear(productId) {
    if (productId) {
      // 清理指定产品的缓存
      const keys = Array.from(this.cache.keys()).filter(key => key.startsWith(productId));
      keys.forEach(key => this.cache.delete(key));
    } else {
      // 清理所有缓存
      this.cache.clear();
    }
  }
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  // 状态管理
  const [product, setProduct] = useState(null);
  const [klineData, setKlineData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState('1d');
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradeType, setTradeType] = useState('buy');
  const [tradeAmount, setTradeAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 实时状态
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [klineLoading, setKlineLoading] = useState(false);
  
  // 引用和缓存
  const klineCache = useRef(new KlineCache());
  const fetchIntervalRef = useRef(null);
  const lastProductFetchRef = useRef(0);
  const lastKlineFetchRef = useRef(0);
  const isMountedRef = useRef(true);

  // 图表周期选项
  const periodOptions = useMemo(() => [
    { key: '1m', label: '1分' },
    { key: '5m', label: '5分' },
    { key: '15m', label: '15分' },
    { key: '1h', label: '1时' },
    { key: '1d', label: '日' },
    { key: '1w', label: '周' },
    { key: '1M', label: '月' },
    { key: '1y', label: '年' }
  ], []);

  // ========== 核心数据获取函数 ==========

  // 获取产品基本信息（独立于K线）
  const fetchProduct = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    
    const now = Date.now();
    
    // 防抖：至少间隔3秒才重新获取
    if (silent && now - lastProductFetchRef.current < 3000) {
      setIsRefreshing(false);
      return;
    }
    
    lastProductFetchRef.current = now;
    
    try {
      const res = await fetch(`/api/products/${params.id}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      
      if (data.success && data.data) {
        const productData = data.data.product || data.data;
        
        // 计算实时涨跌幅
        const currentPrice = productData.currentPrice || 0;
        const closePrice = productData.closePrice || 1;
        const dailyChange = ((currentPrice - closePrice) / closePrice) * 100;
        
        const enhancedProduct = {
          ...productData,
          currentPrice,
          closePrice,
          dailyChange,
          // 格式化价格
          formattedPrice: currentPrice.toFixed(4),
          // 计算市值
          marketCap: productData.marketCap || (currentPrice * (productData.totalSupply || 0))
        };
        
        setProduct(enhancedProduct);
        setLastUpdateTime(new Date());
      }
    } catch (error) {
      console.error('获取产品信息失败:', error);
      if (!silent) {
        // 可以显示错误信息
      }
    } finally {
      if (!silent) setLoading(false);
      setIsRefreshing(false);
    }
  }, [params.id]);

  // 获取K线数据（独立获取，不依赖产品刷新）
  const fetchKlineData = useCallback(async (period, force = false) => {
    if (!params.id) return;
    
    const now = Date.now();
    
    // 防抖：相同周期2秒内不重复获取
    if (!force && now - lastKlineFetchRef.current < 2000) {
      return;
    }
    
    lastKlineFetchRef.current = now;
    setKlineLoading(true);
    
    try {
      // 检查缓存
      const cached = klineCache.current.get(params.id, period);
      if (cached && !force) {
        setKlineData(cached);
        setKlineLoading(false);
        return;
      }
      
      // 从API获取
      const response = await fetch(`/api/products/${params.id}/kline?interval=${period}&limit=100`);
      const data = await response.json();
      
      if (data.success && data.data) {
        // 修复时间戳和处理数据
        const processedData = processKlineData(data.data);
        klineCache.current.set(params.id, period, processedData);
        setKlineData(processedData);
      } else {
        // 如果API没有数据，生成模拟数据
        const simulatedData = generateSimulatedKlineData(product?.currentPrice || 1, period);
        setKlineData(simulatedData);
      }
    } catch (error) {
      console.error('获取K线数据失败:', error);
      // 使用模拟数据作为后备
      const simulatedData = generateSimulatedKlineData(product?.currentPrice || 1, period);
      setKlineData(simulatedData);
    } finally {
      setKlineLoading(false);
    }
  }, [params.id, product?.currentPrice]);

  // 处理K线数据（修复时间戳等）
  const processKlineData = useCallback((rawData) => {
    if (!Array.isArray(rawData) || rawData.length === 0) {
      return [];
    }
    
    return rawData.map((item, index) => {
      // 修复时间戳
      let timestamp;
      try {
        if (item.date && typeof item.date === 'string') {
          // 处理异常日期格式
          if (item.date.includes('+058030')) {
            // 生成合理的时间序列（最近30天）
            timestamp = Date.now() - (rawData.length - index - 1) * 24 * 60 * 60 * 1000;
          } else {
            const date = new Date(item.date);
            timestamp = isNaN(date.getTime()) ? Date.now() : date.getTime();
          }
        } else {
          timestamp = item.timestamp || Date.now();
        }
      } catch (e) {
        timestamp = Date.now();
      }
      
      // 确保价格有效
      const basePrice = product?.currentPrice || 1;
      
      return {
        timestamp,
        date: new Date(timestamp).toISOString(),
        open: parseFloat(item.open) || basePrice,
        close: parseFloat(item.close) || basePrice,
        high: parseFloat(item.high) || basePrice,
        low: parseFloat(item.low) || basePrice,
        volume: parseFloat(item.volume) || 0
      };
    }).sort((a, b) => a.timestamp - b.timestamp);
  }, [product?.currentPrice]);

  // 生成模拟K线数据
  const generateSimulatedKlineData = useCallback((basePrice, period) => {
    const data = [];
    const now = Date.now();
    
    // 根据周期设置时间间隔和波动
    const periodConfig = {
      '1m': { interval: 60 * 1000, volatility: 0.002, count: 120 },
      '5m': { interval: 5 * 60 * 1000, volatility: 0.005, count: 100 },
      '15m': { interval: 15 * 60 * 1000, volatility: 0.008, count: 80 },
      '1h': { interval: 60 * 60 * 1000, volatility: 0.01, count: 60 },
      '1d': { interval: 24 * 60 * 60 * 1000, volatility: 0.02, count: 30 },
      '1w': { interval: 7 * 24 * 60 * 60 * 1000, volatility: 0.03, count: 20 },
      '1M': { interval: 30 * 24 * 60 * 60 * 1000, volatility: 0.05, count: 12 },
      '1y': { interval: 365 * 24 * 60 * 60 * 1000, volatility: 0.1, count: 5 }
    };
    
    const config = periodConfig[period] || periodConfig['1d'];
    let price = basePrice;
    
    for (let i = config.count; i >= 0; i--) {
      const timestamp = now - (i * config.interval);
      
      // 价格随机游走
      const change = (Math.random() - 0.5) * config.volatility;
      price = price * (1 + change);
      
      const open = price;
      const close = price * (1 + (Math.random() - 0.5) * (config.volatility / 2));
      const high = Math.max(open, close) * (1 + Math.random() * (config.volatility / 4));
      const low = Math.min(open, close) * (1 - Math.random() * (config.volatility / 4));
      
      data.push({
        timestamp,
        date: new Date(timestamp).toISOString(),
        open: parseFloat(open.toFixed(4)),
        close: parseFloat(close.toFixed(4)),
        high: parseFloat(high.toFixed(4)),
        low: parseFloat(low.toFixed(4)),
        volume: Math.floor(Math.random() * 10000) + 1000
      });
    }
    
    return data;
  }, []);

  // ========== 生命周期和副作用 ==========

  // 初始化
  useEffect(() => {
    isMountedRef.current = true;
    
    // 获取产品信息
    fetchProduct();
    
    // 设置定时刷新产品信息（每60秒）
    fetchIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        fetchProduct(true);
      }
    }, 60000);
    
    return () => {
      isMountedRef.current = false;
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current);
      }
      klineCache.current.clear(params.id);
    };
  }, [params.id, fetchProduct]);

  // 当图表周期变化时获取K线数据
  useEffect(() => {
    if (product) {
      fetchKlineData(chartPeriod);
    }
  }, [chartPeriod, product, fetchKlineData]);

  // ========== 交易相关函数 ==========

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
        // 刷新产品信息
        fetchProduct();
      } else {
        alert(result.message || '交易失败，请重试');
      }
    } catch (error) {
      console.error('交易执行失败:', error);
      alert('网络错误，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========== 辅助函数 ==========

  const formatLastUpdate = useCallback((date) => {
    if (!date) return '--';
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return `${seconds}秒前`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    return date.toLocaleDateString('zh-CN');
  }, []);

  // ========== 计算属性 ==========

  const isPositive = useMemo(() => (product?.dailyChange || 0) >= 0, [product]);
  const isSoldOut = useMemo(() => 
    product?.isLimited && (product.soldSupply || 0) >= (product.totalSupply || 0), 
    [product]
  );
  const canBuy = !isSoldOut;
  
  const estimatedFee = useMemo(() => 
    tradeAmount ? (parseFloat(tradeAmount) * (product?.currentPrice || 0) * (product?.feeRate || 0)) : 0, 
    [tradeAmount, product]
  );
  
  const estimatedTotal = useMemo(() => 
    tradeAmount ? (parseFloat(tradeAmount) * (product?.currentPrice || 0)) : 0, 
    [tradeAmount, product]
  );
  
  const finalAmount = useMemo(() => 
    tradeType === 'buy' ? estimatedTotal + estimatedFee : estimatedTotal - estimatedFee, 
    [tradeType, estimatedTotal, estimatedFee]
  );

  // ========== 渲染函数 ==========

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-6">产品不存在或已下架</p>
          <button
            onClick={() => router.push('/market')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center mx-auto"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回市场
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 导航栏 */}
      <nav className="mb-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => router.push('/market')}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            返回市场
          </button>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 font-medium truncate max-w-xs">{product.name}</span>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
          <Clock className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs text-gray-500 font-medium">更新于 {formatLastUpdate(lastUpdateTime)}</span>
          <button 
            onClick={() => fetchProduct()}
            className={`text-gray-400 hover:text-blue-600 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
            disabled={isRefreshing}
            title="刷新数据"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </nav>

      {/* 头部信息 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900 truncate">{product.name}</h1>
              <span className={`px-3 py-1 text-xs font-medium rounded-full border ${
                product.category === '游戏产品'
                  ? 'bg-purple-50 text-purple-700 border-purple-100'
                  : product.category === '虚拟产品'
                  ? 'bg-blue-50 text-blue-700 border-blue-100'
                  : 'bg-green-50 text-green-700 border-green-100'
              }`}>
                {product.category}
              </span>
            </div>
            <p className="text-gray-500 font-mono">{product.code}</p>
          </div>
          
          <div className="text-left md:text-right">
            <div className="text-4xl font-bold text-gray-900 mb-2">
              ¥{(product.currentPrice || 0).toFixed(4)}
            </div>
            <div className="flex items-center gap-2">
              {isPositive ? (
                <TrendingUp className="h-5 w-5 text-red-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-green-600" />
              )}
              <span className={`text-lg font-medium ${isPositive ? 'text-red-600' : 'text-green-600'}`}>
                {isPositive ? '+' : ''}{formatPercent(product.dailyChange || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧：图表和详情 */}
        <div className="lg:col-span-2 space-y-6">
          {/* K线图表区域 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                价格走势
              </h2>
              <div className="flex flex-wrap gap-1">
                {periodOptions.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setChartPeriod(item.key)}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors whitespace-nowrap ${
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
            
            {/* 价格概览 */}
            <div className="mb-4">
              <div className="text-2xl font-bold text-gray-900 mb-2">
                ¥{(product.currentPrice || 0).toFixed(4)}
              </div>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center">
                  <span className="text-gray-500 mr-1">今开:</span>
                  <span className="font-medium">¥{(klineData[0]?.open || product.currentPrice || 0).toFixed(4)}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-1">最高:</span>
                  <span className="font-medium text-red-600">
                    ¥{Math.max(...(klineData.map(d => d.high) || [product.currentPrice || 0])).toFixed(4)}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-1">最低:</span>
                  <span className="font-medium text-green-600">
                    ¥{Math.min(...(klineData.map(d => d.low) || [product.currentPrice || 0])).toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* 🔧 K线图：替换为 SimpleKLineChart */}
            <div className="h-[400px]">
              <SimpleKLineChart 
                data={klineData}
                period={chartPeriod}
                height={400}
                loading={klineLoading}
              />
            </div>
            
            {/* 图例 */}
            <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-500">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 mr-1 rounded-sm"></div>
                <span>上涨</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 mr-1 rounded-sm"></div>
                <span>下跌</span>
              </div>
            </div>
          </div>

          {/* 产品详情 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Info className="h-5 w-5 mr-2 text-blue-600" />
              产品详情
            </h2>

            {/* 涨跌幅统计 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  日涨跌
                </p>
                <p className={`text-lg font-semibold ${getColorByValue(product.dailyChange)}`}>
                  {formatPercent(product.dailyChange || 0)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  周涨跌
                </p>
                <p className={`text-lg font-semibold ${getColorByValue(product.weeklyChange)}`}>
                  {formatPercent(product.weeklyChange || 0)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  月涨跌
                </p>
                <p className={`text-lg font-semibold ${getColorByValue(product.monthlyChange)}`}>
                  {formatPercent(product.monthlyChange || 0)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  年涨跌
                </p>
                <p className={`text-lg font-semibold ${getColorByValue(product.yearlyChange)}`}>
                  {formatPercent(product.yearlyChange || 0)}
                </p>
              </div>
            </div>

            {/* 交易统计 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1 flex items-center">
                  <Volume2 className="h-4 w-4 mr-1" />
                  24h成交量
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {(product.volume24h || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">总市值</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(product.marketCap || 0)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1 flex items-center">
                  <Percent className="h-4 w-4 mr-1" />
                  手续费率
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {((product.feeRate || 0) * 100).toFixed(2)}%
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">最小交易量</p>
                <p className="text-lg font-semibold text-gray-900">
                  {product.minBuyAmount || 1}
                </p>
              </div>
            </div>

            {/* 限量发售信息 */}
            {product.isLimited && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-amber-800 flex items-center">
                    <Package className="h-4 w-4 mr-2" />
                    限量发售信息
                  </h4>
                  {isSoldOut ? (
                    <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full font-medium">
                      已售罄
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full font-medium">
                      可购买
                    </span>
                  )}
                </div>
                <div className="flex justify-between text-sm text-amber-700 mb-2">
                  <span>已售: {product.soldSupply || 0} 股</span>
                  <span>总量: {product.totalSupply || 0} 股</span>
                </div>
                <div className="w-full bg-amber-200 rounded-full h-2 mb-2">
                  <div
                    className="bg-amber-600 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(((product.soldSupply || 0) / (product.totalSupply || 1)) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-amber-600">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            )}

            {/* 分红信息 */}
            {product.dividendRate > 0 && (
              <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-lg">
                <h4 className="font-medium text-green-800 mb-3 flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  分红收益信息
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-green-600 mb-1">每股收益</p>
                    <p className="text-lg font-semibold text-green-800">
                      {formatCurrency(product.dividendPerShare || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-green-600 mb-1">年化收益率</p>
                    <p className="text-lg font-semibold text-green-800">
                      {product.dividendRate.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 产品介绍 */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">产品介绍</h3>
              <div className="prose max-w-none">
                <p className="text-gray-600 whitespace-pre-line">
                  {product.description || '暂无产品介绍。'}
                </p>
              </div>
            </div>

            {/* 风险提示 */}
            {(product.stopProfit > 0 || product.stopLoss > 0) && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-1">风险提示</h4>
                    <p className="text-sm text-yellow-700">
                      该产品设置了止盈止损机制：
                      {product.stopProfit > 0 && ` 止盈比例 ${product.stopProfit}%`}
                      {product.stopLoss > 0 && ` 止损比例 ${product.stopLoss}%`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：交易面板 */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-24">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
              交易
            </h2>

            {/* 买卖切换 */}
            <div className="flex space-x-2 mb-6">
              <button
                onClick={() => setTradeType('buy')}
                className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center ${
                  tradeType === 'buy'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                买入
              </button>
              <button
                onClick={() => setTradeType('sell')}
                className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center ${
                  tradeType === 'sell'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <TrendingDown className="h-4 w-4 mr-2" />
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
                  min={product.minBuyAmount || 1}
                  step="1"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                  placeholder={`最少 ${product.minBuyAmount || 1}`}
                  className="w-full"
                />
              </div>

              {/* 预计金额 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">单价</span>
                    <span className="font-medium">
                      ¥{(product.currentPrice || 0).toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">手续费</span>
                    <span className="font-medium">
                      ¥{estimatedFee.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-200">
                    <span className="text-gray-900">预计金额</span>
                    <span className="text-blue-600">
                      ¥{finalAmount.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 交易按钮 */}
              <Button
                onClick={() => {
                  if (!tradeAmount || parseFloat(tradeAmount) < (product.minBuyAmount || 1)) {
                    alert(`交易数量不能少于 ${product.minBuyAmount || 1}`);
                    return;
                  }
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
                {tradeType === 'buy' 
                  ? (isSoldOut ? '已售罄' : '确认买入') 
                  : '确认卖出'
                }
              </Button>

              <div className="text-center text-sm text-gray-500 flex items-center justify-center">
                <Clock className="h-4 w-4 mr-1" />
                交易时间：09:30 - 15:00
              </div>
            </div>
          </div>

          {/* 快速交易 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">快速交易</h3>
            <div className="grid grid-cols-2 gap-3">
              {[10, 50, 100, 500].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setTradeAmount(amount.toString())}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-center"
                >
                  {amount}
                </button>
              ))}
            </div>
          </div>

          {/* 安全保障 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-green-600" />
              安全保障
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>平台担保交易</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>资金安全保障</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>实时价格监控</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 交易确认弹窗 */}
      <Modal
        isOpen={showTradeModal}
        onClose={() => setShowTradeModal(false)}
        title={tradeType === 'buy' ? '确认买入' : '确认卖出'}
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">产品名称</span>
                <span className="font-medium">{product.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">交易类型</span>
                <span className={`font-medium ${tradeType === 'buy' ? 'text-red-600' : 'text-green-600'}`}>
                  {tradeType === 'buy' ? '买入' : '卖出'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">交易数量</span>
                <span className="font-medium">{tradeAmount} 股</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">成交价格</span>
                <span className="font-medium">¥{(product.currentPrice || 0).toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">手续费</span>
                <span className="font-medium">¥{estimatedFee.toFixed(4)}</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between">
                <span className="text-gray-900 font-semibold">总金额</span>
                <span className="text-blue-600 font-bold">¥{finalAmount.toFixed(4)}</span>
              </div>
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
