// app/market/page.js
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Search, Filter, TrendingUp, TrendingDown, ArrowUpDown, Megaphone } from 'lucide-react';
import { formatCurrency, formatPercent, getColorByValue } from '@/lib/utils';
import SimpleKLineChart from '@/components/charts/simple-kline-chart'; 

// 缓存管理器
class DataCache {
  constructor() {
    this.cache = new Map();
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    // 检查是否过期（5分钟缓存）
    if (Date.now() - item.timestamp > 5 * 60 * 1000) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }
  
  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  clear() {
    this.cache.clear();
  }
}

export default function MarketPage() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const cache = useRef(new DataCache());
  const isFetching = useRef(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('volume');
  const [rankType, setRankType] = useState('hot');

  const categories = [
    { id: 'all', name: '全部' },
    { id: '实体', name: '实体' },
    { id: '虚拟产品', name: '虚拟产品' },
    { id: '游戏产品', name: '游戏产品' },
    { id: '投资收益', name: '投资收益' },
  ];

  const sortOptions = [
    { id: 'volume', name: '成交量' },
    { id: 'change', name: '涨跌幅' },
    { id: 'price', name: '价格' },
  ];

  const fetchProducts = useCallback(async () => {
    if (isFetching.current) return;
    
    isFetching.current = true;
    
    try {
      const cacheKey = 'market_products';
      const cached = cache.current.get(cacheKey);
      
      if (cached) {
        setProducts(cached);
        filterProducts(cached);
        setLoading(false);
        isFetching.current = false;
        return; // 使用缓存后直接返回
      }
      
      const response = await fetch('/api/products');
      const data = await response.json();
      
      if (data.success && data.data?.data) {
        const productsArray = data.data.data.map(product => {
          const currentPrice = product.currentPrice || 0;
          const closePrice = product.closePrice || 1;
          const dailyChange = ((currentPrice - closePrice) / closePrice) * 100;
          
          return {
            ...product,
            currentPrice,
            closePrice,
            dailyChange: product.dailyChange || dailyChange,
            formattedPrice: currentPrice.toFixed(4),
          };
        });
        
        cache.current.set(cacheKey, productsArray);
        setProducts(productsArray);
        filterProducts(productsArray);
      }
    } catch (error) {
      console.error('获取产品列表失败:', error);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, []);

  const filterProducts = useCallback((productsArray) => {
    if (!Array.isArray(productsArray)) return;
    
    let filtered = [...productsArray];
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'volume': return (b.volume24h || 0) - (a.volume24h || 0);
        case 'change': return Math.abs(b.dailyChange || 0) - Math.abs(a.dailyChange || 0);
        case 'price': return (b.currentPrice || 0) - (a.currentPrice || 0);
        default: return 0;
      }
    });
    
    setFilteredProducts(filtered);
  }, [searchTerm, selectedCategory, sortBy]);

  const fetchRankings = useCallback(async () => {
    try {
      const res = await fetch(`/api/rankings?type=${rankType}`);
      const data = await res.json();
      if (data.success) setRankings(data.data || []);
    } catch (error) {
      console.error('获取排行榜失败:', error);
      setRankings([]);
    }
  }, [rankType]);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch('/api/announcements');
      const data = await res.json();
      if (data.success) setAnnouncements(data.data || []);
    } catch (error) {
      console.error('获取公告失败:', error);
      setAnnouncements([]);
    }
  }, []);

  useEffect(() => {
    console.log('🚀 初始化市场页面');
    setLoading(true);
    
    Promise.all([
      fetchProducts(),
      fetchRankings(),
      fetchAnnouncements()
    ]).finally(() => {
      setLoading(false);
    });
    
    const interval = setInterval(() => {
      fetchProducts();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchProducts, fetchRankings, fetchAnnouncements]);

  useEffect(() => {
    filterProducts(products);
  }, [searchTerm, selectedCategory, sortBy, filterProducts, products]);

  useEffect(() => {
    fetchRankings();
  }, [rankType, fetchRankings]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">市场行情</h1>
        <p className="text-gray-600">浏览所有可投资产品，把握投资机会</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索产品名称或代码..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {sortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  按{option.name}排序
                </option>
              ))}
            </select>
            <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：产品列表 */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse h-80"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}

          {filteredProducts.length === 0 && !loading && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
              <p className="text-gray-500 text-lg">没有找到匹配的产品</p>
            </div>
          )}
        </div>

        {/* 右侧：排行榜 & 公告 */}
        <div className="space-y-6">
          {/* 排行榜 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center">
                <ArrowUpDown className="h-5 w-5 mr-2 text-blue-600" />
                排行榜
              </h2>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4">
              {['hot', 'daily', 'weekly', 'monthly'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRankType(tab)}
                  className={`px-2 py-1.5 text-xs font-medium rounded transition-colors text-center ${
                    rankType === tab ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {tab === 'hot' ? '人气' : tab === 'daily' ? '日涨' : tab === 'weekly' ? '周涨' : '月涨'}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {rankings.map((product, index) => (
                <div
                  key={product._id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/market/${product._id}`}
                >
                  <div className="flex items-center">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                      index < 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      <div className="text-xs text-gray-500">{product.code}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(product.currentPrice)}
                    </div>
                    <div className={`text-xs font-medium ${getColorByValue(rankType === 'hot' ? product.volume24h : product[rankType + 'Change'])}`}>
                      {rankType === 'hot' ? '热' : formatPercent(product[rankType + 'Change'] || 0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 公告栏 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Megaphone className="h-5 w-5 mr-2 text-blue-600" />
              最新公告
            </h3>
            <div className="space-y-3">
              {announcements.length > 0 ? (
                announcements.map((item) => (
                  <div key={item._id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">{item.title}</h4>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">{item.content}</p>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded text-center">
                  暂无新公告
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ProductCard组件
function ProductCard({ product }) {
  const currentPrice = product.currentPrice || 0;
  const closePrice = product.closePrice || 1;
  const dailyChange = ((currentPrice - closePrice) / closePrice) * 100;
  
  const isPositive = dailyChange >= 0;
  
  const isSoldOut = product.isLimited && (product.soldSupply || 0) >= (product.totalSupply || 0);
  const stockPercentage = product.isLimited && product.totalSupply > 0 
    ? ((product.soldSupply || 0) / product.totalSupply * 100).toFixed(1)
    : null;

  // 获取K线数据
  const getKlineData = () => {
    try {
      if (product.minuteKlineData && Array.isArray(product.minuteKlineData)) {
        return product.minuteKlineData
          .slice(-30) 
          .map((item) => {
            return {
              timestamp: new Date(item.date || Date.now()).getTime(),
              open: parseFloat(item.open) || currentPrice,
              close: parseFloat(item.close) || currentPrice,
              high: parseFloat(item.high) || currentPrice,
              low: parseFloat(item.low) || currentPrice,
              volume: parseFloat(item.volume) || 0
            };
          });
      }
      
      // 生成简单模拟数据
      const data = [];
      for (let i = 30; i > 0; i--) {
        const time = Date.now() - i * 60000;
        const price = currentPrice * (1 + (Math.random() - 0.5) * 0.02);
        data.push({
          timestamp: time,
          open: price,
          close: price,
          high: price * 1.005,
          low: price * 0.995
        });
      }
      return data;
      
    } catch (error) {
      console.error('K线数据处理错误:', error);
      return [];
    }
  };

  return (
    <Link href={`/market/${product._id}`}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {product.symbol ? product.symbol.substring(0, 2) : product.name.substring(0, 2)}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{product.name}</h3>
              <p className="text-sm text-gray-500">{product.code}</p>
            </div>
          </div>
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
            product.category === '游戏产品' ? 'bg-purple-100 text-purple-700' :
            product.category === '虚拟产品' ? 'bg-blue-100 text-blue-700' :
            'bg-green-100 text-green-700'
          }`}>
            {product.category}
          </span>
        </div>

        {/* Price */}
        <div className="mb-4">
          <p className="text-2xl font-bold text-gray-900">
            ¥{(currentPrice || 0).toFixed(4)}
          </p>
          <div className="flex items-center space-x-2 mt-1">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-red-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-600" />
            )}
            <span className={`text-sm font-medium ${isPositive ? 'text-red-600' : 'text-green-600'}`}>
              {isPositive ? '+' : ''}{dailyChange.toFixed(2)}%
            </span>
            <span className="text-sm text-gray-500">今日</span>
          </div>
        </div>

        {/* 限量进度条 */}
        {product.isLimited && (
          <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-amber-800">
                限量发售
              </span>
              {isSoldOut ? (
                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                  已售罄
                </span>
              ) : (
                <span className="text-xs text-amber-700">
                  剩余 {product.totalSupply - (product.soldSupply || 0)} 股
                </span>
              )}
            </div>
            <div className="w-full bg-amber-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  stockPercentage >= 90 ? 'bg-red-500' : 
                  stockPercentage >= 70 ? 'bg-orange-500' : 
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(stockPercentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-amber-700">
              <span>已售 {stockPercentage}%</span>
              <span>总计 {product.totalSupply} 股</span>
            </div>
          </div>
        )}

        {/* 分红展示 */}
        {product.dividendRate > 0 && (
          <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-green-800">
                分红收益
              </span>
              <span className="text-xs text-green-700">
                每股 {formatCurrency(product.dividendPerShare || 0)}
              </span>
            </div>
            <div className="text-xs text-green-600 mt-1">
              年化收益率 {product.dividendRate.toFixed(1)}%
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="mb-4 flex-grow" style={{ height: '80px' }}>
          <SimpleKLineChart 
            data={getKlineData()}
            period="1m"
            height={80}
          />
        </div>

        {/* Action Button */}
        <button className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium mt-auto">
          立即交易
        </button>
      </div>
    </Link>
  );
}
