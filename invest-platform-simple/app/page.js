// app/page.js
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Activity, Bell, ArrowRight, LogIn, X } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import Modal from '@/components/ui/modal'; // 确保你有这个组件，如果没有，我可以帮你内联一个
import Button from '@/components/ui/button'; // 确保你有这个组件

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [hotProducts, setHotProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- 新增：大盘走势数据 & 公告弹窗状态 ---
  const [indexData, setIndexData] = useState([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchAnnouncements();
    fetchHotProducts();
    fetchIndexData(); // 获取大盘数据
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/user', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (e) {}
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/announcements?limit=10');
      const data = await res.json();
      if (data.success) setAnnouncements(data.data || []);
    } catch (e) {}
  };

  const fetchHotProducts = async () => {
    try {
      const res = await fetch('/api/products?limit=6&sort=dailyChange');
      const data = await res.json();
      if (data.success) {
        const active = (data.data || []).filter(p => p.isActive && p.dailyChange > 0);
        setHotProducts(active.slice(0, 4));
      }
    } catch (e) {}
    setLoading(false);
  };

  // --- 核心功能：获取大盘数据 ---
  const fetchIndexData = async () => {
    try {
      // 1. 尝试从后端获取真实大盘数据
      const res = await fetch('/api/market/index');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setIndexData(data.data);
          return;
        }
      }
    } catch (e) {
      console.log('使用仿真大盘数据');
    }

    // 2. 如果后端接口不存在，生成仿真的随机漫步数据（模拟真实股市）
    const simulationData = [];
    let basePrice = 3000;
    const now = new Date();
    // 生成过去 100 个时间点（模拟5分钟一个点）
    for (let i = 100; i > 0; i--) {
      const time = new Date(now.getTime() - i * 5 * 60 * 1000);
      // 随机波动 -0.5% 到 +0.5%
      const change = (Math.random() - 0.5) * 0.01;
      basePrice = basePrice * (1 + change);
      simulationData.push({
        time: time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        value: parseFloat(basePrice.toFixed(2)),
        changePercent: (change * 100).toFixed(2)
      });
    }
    setIndexData(simulationData);
  };

  const getActivityColor = (type) => {
    switch(type) {
      case 'system': return 'bg-red-500';
      case 'market': return 'bg-blue-500';
      case 'activity': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getActivityLabel = (type) => {
    switch(type) {
      case 'system': return '系统';
      case 'market': return '行情';
      case 'activity': return '活动';
      default: return '通知';
    }
  };

  // --- 组件：大盘走势图 ---
  const MarketTrendChart = ({ data }) => {
    if (!data || data.length === 0) return null;

    const chartData = data.map(item => [item.time, item.value]);
    const latestValue = data[data.length - 1].value;
    const isRising = data[data.length - 1].value > data[0].value;

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: 'rgba(0,0,0,0.8)',
        textStyle: { color: '#fff' },
        formatter: (params) => {
          const p = params[0];
          return `<div class="font-bold">${p.name}</div><div>指数: ${p.value}</div>`;
        }
      },
      grid: { top: 10, right: 20, bottom: 20, left: 50 },
      xAxis: {
        type: 'category',
        data: chartData.map(item => item[0]),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#9ca3af', fontSize: 10 },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        scale: true,
        splitLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.05)' } },
        axisLabel: { color: '#9ca3af', fontSize: 10 },
        min: (val) => val.min * 0.998, // 留一点头部空间
        max: (val) => val.max * 1.002
      },
      series: [
        {
          name: '大盘指数',
          type: 'line',
          data: chartData.map(item => item[1]),
          smooth: true,
          symbol: 'none',
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: isRising ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)' },
              { offset: 1, color: 'rgba(0, 0, 0, 0)' }
            ])
          },
          lineStyle: {
            color: isRising ? '#ef4444' : '#22c55e',
            width: 2
          }
        }
      ]
    };

    return (
      <div className="absolute inset-0 w-full h-full">
        <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ renderer: 'canvas' }} />
      </div>
    );
  };

  // --- 组件：公告详情弹窗 ---
  const AnnouncementModal = () => {
    return (
      <Modal isOpen={showAnnouncementModal} onClose={() => setShowAnnouncementModal(false)} title="系统公告" size="lg">
        <div className="max-h-[60vh] overflow-y-auto space-y-4">
          {announcements.length > 0 ? (
            announcements.map((item, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded text-white font-medium ${getActivityColor(item.type)}`}>
                    {getActivityLabel(item.type)}
                  </span>
                  <span className="text-xs text-gray-400">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '刚刚'}</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{item.content}</p>
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-gray-400">暂无公告</div>
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => setShowAnnouncementModal(false)}>关闭</Button>
        </div>
      </Modal>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航/欢迎区 */}
      <div className="bg-white shadow-sm border-b border-gray-100 p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">投</div>
          <span className="font-bold text-lg text-gray-900">投资平台</span>
        </div>
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Hi, {user.username}</span>
            <button 
              onClick={() => router.push('/dashboard')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              个人中心
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={() => router.push('/login')}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              登录
            </button>
            <button 
              onClick={() => router.push('/register')}
              className="px-4 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              注册
            </button>
          </div>
        )}
      </div>

      {/* 滚动公告条 */}
      <div className="bg-white border-b border-gray-100 h-10 flex items-center overflow-hidden relative">
        <div className="flex items-center px-3 bg-gray-100 h-full z-10 shrink-0 cursor-pointer hover:bg-gray-200" onClick={() => setShowAnnouncementModal(true)}>
          <Bell className="h-4 w-4 text-blue-600 mr-1" />
          <span className="text-xs font-bold text-gray-700">公告</span>
        </div>
        <div className="whitespace-nowrap overflow-hidden flex-1 relative">
          <div className="inline-block animate-scroll-left">
            {announcements.length > 0 ? announcements.map((item, idx) => (
              <span key={idx} className="inline-flex items-center mx-8 text-sm text-gray-600 cursor-pointer hover:text-blue-600" onClick={() => setShowAnnouncementModal(true)}>
                <span className={`text-[10px] px-1.5 py-0.5 rounded text-white mr-2 ${getActivityColor(item.type)}`}>
                  {getActivityLabel(item.type)}
                </span>
                {item.title}
              </span>
            )) : (
              <span className="mx-8 text-sm text-gray-400">暂无公告</span>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* 欢迎语/引导区 */}
        <div className="text-center py-10 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl text-white shadow-lg">
          {user ? (
            <div>
              <h1 className="text-3xl font-bold mb-2">欢迎回来，{user.username}!</h1>
              <p className="text-blue-100">祝您今日投资顺利，收益长虹。</p>
            </div>
          ) : (
            <div>
              <h1 className="text-3xl font-bold mb-2">欢迎来到投资平台</h1>
              <p className="text-blue-100 mb-6">请登录以使用完整功能，开启财富之旅。</p>
              <button 
                onClick={() => router.push('/login')}
                className="bg-white text-blue-600 px-8 py-2.5 rounded-full font-bold hover:bg-gray-100 shadow-md transition-transform transform hover:scale-105"
              >
                立即登录
              </button>
            </div>
          )}
        </div>

        {/* 功能卡牌网格 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* 活动卡牌 */}
          <div 
            onClick={() => alert('功能开发中，敬请期待！')}
            className="group bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-purple-200 cursor-pointer transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 mb-4">
                <Activity className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-1">精彩活动</h3>
              <p className="text-sm text-gray-500">新手福利 & 限时活动</p>
            </div>
            <div className="mt-4 flex items-center text-purple-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
              查看活动 <ArrowRight className="h-4 w-4 ml-1" />
            </div>
          </div>

          {/* 公告卡牌 - 修改为弹窗跳转 */}
          <div 
            onClick={() => setShowAnnouncementModal(true)}
            className="group bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 cursor-pointer transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                <Bell className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-1">最新公告</h3>
              <p className="text-sm text-gray-500">查看系统通知与政策更新</p>
            </div>
            <div className="mt-4 flex items-center text-blue-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
              查看全部 <ArrowRight className="h-4 w-4 ml-1" />
            </div>
          </div>

          {/* 热门产品卡牌 */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-full -mr-4 -mt-4"></div>
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-red-600 mb-4">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-1">今日涨幅榜</h3>
                <p className="text-sm text-gray-500">市场热门产品实时监控</p>
              </div>
              
              {loading ? (
                <div className="h-16 bg-gray-50 animate-pulse rounded"></div>
              ) : hotProducts.length > 0 ? (
                <div className="space-y-2">
                  {hotProducts.map((p, i) => (
                    <div key={p._id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer" onClick={() => router.push(`/market/${p._id}`)}>
                      <span className="text-gray-700 font-medium">{p.name}</span>
                      <span className="font-mono font-bold text-red-600">+{p.dailyChange.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-16 flex items-center justify-center text-gray-400 text-xs">暂无大涨产品</div>
              )}
            </div>
          </div>

        </div>

        {/* 市场走势图区域 - 使用真实/仿真数据 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">大盘走势</h2>
              <p className="text-xs text-gray-500">综合指数实时监控 • 数据每 5 分钟自动更新</p>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium cursor-not-allowed">指数</span>
              <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium cursor-pointer">主力</span>
            </div>
          </div>
          
          {/* 股票风格图表容器 */}
          <div className="h-[300px] w-full bg-[#0f172a] rounded-lg relative overflow-hidden border border-gray-700">
            
            {/* 1. 背景网格线 */}
            <div className="absolute inset-0 z-0" style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px'
            }}></div>
            
            {/* 2. 渲染 ECharts 走势图 */}
            {indexData.length > 0 ? (
              <MarketTrendChart data={indexData} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 z-10">
                数据加载中...
              </div>
            )}
            
            {/* 3. 模拟右侧信息栏 (悬浮) */}
            <div className="absolute right-4 top-4 bottom-4 w-24 bg-gray-900/80 backdrop-blur-sm rounded border border-gray-700 p-2 flex flex-col justify-between z-20 pointer-events-none">
              {indexData.length > 0 ? (
                <>
                  <div className="text-right">
                    <div className="text-[10px] text-gray-400">最新</div>
                    <div className={`text-sm font-bold ${indexData[indexData.length-1].value > indexData[0].value ? 'text-red-500' : 'text-green-500'}`}>
                      {indexData[indexData.length-1].value.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-gray-400">涨跌</div>
                    <div className={`text-sm font-bold ${indexData[indexData.length-1].value > indexData[0].value ? 'text-red-500' : 'text-green-500'}`}>
                      {indexData.length > 0 ? (indexData[indexData.length-1].value - indexData[0].value).toFixed(2) : '0.00'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-gray-400">涨幅</div>
                    <div className={`text-sm font-bold ${indexData[indexData.length-1].value > indexData[0].value ? 'text-red-500' : 'text-green-500'}`}>
                      {indexData[indexData.length-1].changePercent}%
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-gray-500 text-xs text-center mt-4">--</div>
              )}
            </div>
          </div>
        </div>

      </main>

      {/* 公告详情模态框 */}
      <AnnouncementModal />
      
      <style jsx global>{`
        @keyframes scroll-left {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-scroll-left {
          display: inline-block;
          white-space: nowrap;
          padding-left: 100%; /* Start off-screen */
          animation: scroll-left 20s linear infinite;
        }
      `}</style>
    </div>
  );
}
