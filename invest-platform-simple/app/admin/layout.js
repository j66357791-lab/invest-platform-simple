import React from 'react';

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* 管理后台内部导航 - 不包含全局导航 */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold text-blue-600">管理控制台</span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <a href="/admin" className="border-b-2 border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 text-sm font-medium">
                  首页概览
                </a>
                <a href="/admin/products" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 text-sm font-medium">
                  商品与价格管理
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="py-6">
        {children}
      </div>
    </div>
  );
}
