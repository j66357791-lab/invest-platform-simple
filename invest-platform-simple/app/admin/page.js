// app/admin/page.js
'use client';
import Link from 'next/link';
import { Package, Users, Wallet, LogOut, BarChart3, Settings } from 'lucide-react';

export default function AdminDashboard() {
  const menuItems = [
    {
      title: '产品管理',
      description: '上架新产品、更新价格、管理道具',
      icon: Package,
      href: '/admin/products',
      color: 'bg-blue-500',
    },
    {
      title: '用户管理',
      description: '查看用户信息、实名审核、账号管理',
      icon: Users,
      href: '/admin/users',
      color: 'bg-green-500',
    },
    {
      title: '充值管理',
      description: '审核用户充值申请',
      icon: Wallet,
      href: '/admin/deposits',
      color: 'bg-yellow-500',
    },
    {
      title: '提现管理',
      description: '审核用户提现申请',
      icon: LogOut,
      href: '/admin/withdrawals',
      color: 'bg-red-500',
    },
    {
      title: '数据报表',
      description: '查看交易统计、收益报表',
      icon: BarChart3,
      href: '/admin/reports',
      color: 'bg-purple-500',
    },
    {
      title: '系统设置',
      description: '公告发布、操作日志',
      icon: Settings,
      href: '/admin/settings',
      color: 'bg-gray-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">管理后台</h1>
        <p className="text-gray-600 mt-1">欢迎回来，超级管理员</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group block bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100"
            >
              <div className="flex items-start space-x-4">
                <div className={`${item.color} p-3 rounded-lg text-white`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {item.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
