// app/admin/products/[id]/page.js
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { ArrowLeft, Users, PieChart } from 'lucide-react';

export default function AdminProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [holders, setHolders] = useState([]);
  const [holderStats, setHolderStats] = useState(null);

  useEffect(() => {
    fetchProductDetail();
  }, [params.id]);

  const fetchProductDetail = async () => {
    try {
      setLoading(true);
      // 调用带 includeHolders 参数的接口
      const res = await fetch(`/api/products/${params.id}?includeHolders=true`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setProduct(data.data.product);
        setHolders(data.data.holders || []);
        setHolderStats(data.data.holderStats);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">加载中...</div>;
  if (!product) return <div className="p-8">产品不存在</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回产品列表
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Product Info */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-24">
            <h2 className="text-lg font-bold text-gray-900 mb-4">产品概况</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">产品名称</label>
                <p className="font-semibold text-gray-900">{product.name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">产品代码</label>
                <p className="text-gray-700">{product.code}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">当前价格</label>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(product.currentPrice)}</p>
              </div>
              
              {product.isLimited && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                  <label className="text-sm text-amber-800 font-medium">限量发售进度</label>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-amber-700 mb-1">
                      <span>已售 {product.soldSupply || 0}</span>
                      <span>总量 {product.totalSupply}</span>
                    </div>
                    <div className="w-full bg-amber-200 rounded-full h-2">
                      <div
                        className="bg-amber-600 h-2 rounded-full"
                        style={{ width: `${((product.soldSupply || 0) / product.totalSupply) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {product.dividendRate > 0 && (
                <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                  <label className="text-sm text-green-800 font-medium">分红配置</label>
                  <div className="mt-2 space-y-1 text-sm text-green-700">
                    <p>每股收益: {formatCurrency(product.dividendPerShare)}</p>
                    <p>发放间隔: {product.dividendPayInterval || 30} 天</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <button
                onClick={() => router.push(`/admin/products/${params.id}/edit`)}
                className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                编辑产品
              </button>
            </div>
          </div>
        </div>

        {/* Right: Holders Report */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-600" />
                持有者报表
              </h2>
              
              {holderStats && (
                <div className="flex gap-4 text-sm">
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full">
                    总人数: {holderStats.totalHolders}
                  </span>
                  <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full">
                    集中度: {holderStats.concentration}
                  </span>
                </div>
              )}
            </div>

            {holders.length === 0 ? (
              <div className="text-center py-12 text-gray-500">暂无持有者</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
                      <th className="pb-3">用户</th>
                      <th className="pb-3">持仓天数</th>
                      <th className="pb-3">持仓数量</th>
                      <th className="pb-3">均价</th>
                      <th className="pb-3">市值</th>
                      <th className="pb-3">盈亏</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holders.map((holder) => (
                      <tr key={holder.userId} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-medium text-xs">
                              {holder.username?.substring(0, 1)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{holder.username}</p>
                              <p className="text-xs text-gray-500">{holder.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-gray-600">{holder.holdingDays} 天</td>
                        <td className="py-4 font-semibold text-gray-900">{holder.amount}</td>
                        <td className="py-4 text-gray-600">{formatCurrency(holder.avgPrice)}</td>
                        <td className="py-4 font-semibold text-gray-900">{formatCurrency(holder.marketValue)}</td>
                        <td className="py-4">
                          <span className={`font-medium ${holder.currentProfit >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {formatCurrency(holder.currentProfit)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
