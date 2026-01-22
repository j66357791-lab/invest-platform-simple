// app/admin/products/[id]/edit/page.js
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: '实体',
    currentPrice: '',
    description: '',
    isActive: true,
    isLimited: false,
    totalSupply: 0,
    dividendRate: 0,
    dividendPerShare: 0,
    dividendPayInterval: 30,
  });

  useEffect(() => {
    fetchProduct();
  }, [params.id]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${params.id}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        const p = data.data.product;
        setProduct(p);
        setFormData({
          name: p.name,
          code: p.code,
          category: p.category,
          currentPrice: p.currentPrice,
          description: p.description || '',
          isActive: p.isActive,
          isLimited: p.isLimited || false,
          totalSupply: p.totalSupply || 0,
          dividendRate: p.dividendRate || 0,
          dividendPerShare: p.dividendPerShare || 0,
          dividendPayInterval: p.dividendPayInterval || 30,
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const res = await fetch(`/api/products/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert('保存成功');
        router.push(`/admin/products/${params.id}`);
      } else {
        const err = await res.json();
        alert(err.message || '保存失败');
      }
    } catch (error) {
      alert('网络错误');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">加载中...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">编辑产品</h2>

        {/* 基础信息 */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">产品名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">代码</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">当前价格</label>
              <input
                type="number"
                step="0.01"
                value={formData.currentPrice}
                onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">类别</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="实体">实体</option>
              <option value="虚拟产品">虚拟产品</option>
              <option value="游戏产品">游戏产品</option>
              <option value="投资收益">投资收益</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 限量设置 */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">限量发售设置</h3>
          <div className="flex items-center mb-3">
            <input
              type="checkbox"
              id="isLimited"
              checked={formData.isLimited}
              onChange={(e) => setFormData({ ...formData, isLimited: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isLimited" className="ml-2 text-sm text-gray-700">启用限量</label>
          </div>

          {formData.isLimited && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">总发行量 (股)</label>
              <input
                type="number"
                value={formData.totalSupply}
                onChange={(e) => setFormData({ ...formData, totalSupply: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* 分红设置 */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">分红收益设置</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">每股收益 (元)</label>
              <input
                type="number"
                step="0.01"
                value={formData.dividendPerShare}
                onChange={(e) => setFormData({ ...formData, dividendPerShare: e.target.value })}
                placeholder="例如: 0.5"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">发放间隔 (天)</label>
              <input
                type="number"
                value={formData.dividendPayInterval}
                onChange={(e) => setFormData({ ...formData, dividendPayInterval: e.target.value })}
                placeholder="例如: 30"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">用户需持有满 N 天后才可领取，之后每 N 天发放一次</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {saving ? '保存中...' : <><Save className="h-4 w-4 mr-2" /> 保存更改</>}
          </button>
        </div>
      </div>
    </div>
  );
}
