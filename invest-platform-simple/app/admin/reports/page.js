// app/admin/reports/page.js
'use client';
import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Wallet, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function AdminReportsPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalVolume: 0,
    todayOrders: 0,
    todayVolume: 0,
    weekOrders: 0,
    weekVolume: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      title: '总用户数',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: '产品数量',
      value: stats.totalProducts,
      icon: Package,
      color: 'bg-green-500',
    },
    {
      title: '总订单数',
      value: stats.totalOrders,
      icon: BarChart3,
      color: 'bg-purple-500',
    },
    {
      title: '总成交额',
      value: formatCurrency(stats.totalVolume),
      icon: Wallet,
      color: 'bg-yellow-500',
    },
    {
      title: '今日订单',
      value: stats.todayOrders,
      icon: BarChart3,
      color: 'bg-indigo-500',
    },
    {
      title: '今日成交',
      value: formatCurrency(stats.todayVolume),
      icon: TrendingUp,
      color: 'bg-pink-500',
    },
    {
      title: '本周订单',
      value: stats.weekOrders,
      icon: BarChart3,
      color: 'bg-teal-500',
    },
    {
      title: '本周成交',
      value: formatCurrency(stats.weekVolume),
      icon: TrendingUp,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">数据报表</h1>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {loading ? '...' : card.value}
                  </p>
                </div>
                <div className={`${card.color} p-3 rounded-lg text-white`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 图表区域（后续可以集成 Chart.js 或 Recharts） */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">交易趋势</h2>
          <div className="h-64 flex items-center justify-center text-gray-400">
            <p>图表区域 - 待开发</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">用户增长</h2>
          <div className="h-64 flex items-center justify-center text-gray-400">
            <p>图表区域 - 待开发</p>
          </div>
        </div>
      </div>
    </div>
  );
}
