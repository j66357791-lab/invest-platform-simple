// app/admin/products/page.js
'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Calendar, Settings, Activity, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ==========================================
// 内部组件：价格策略配置模态框
// ==========================================
function ProductStrategyModal({ isOpen, onClose, product, onSave }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    // 交易限制
    maxBuyAmount: 10000,
    maxSellAmount: 10000,
    // 涨跌停 (%)
    limitUpPercent: 20,
    limitDownPercent: 20,
    // 价格策略
    strategyType: 'market', 
    strategyTargetPercent: 5,
    strategyTargetMinutes: 60,
  });

  useEffect(() => {
    if (product) {
      setForm({
        maxBuyAmount: product.maxBuyAmount || 10000,
        maxSellAmount: product.maxSellAmount || 10000,
        limitUpPercent: product.limitUpPercent !== undefined ? product.limitUpPercent : 20,
        limitDownPercent: product.limitDownPercent !== undefined ? product.limitDownPercent : 20,
        strategyType: product.strategyType || 'market',
        strategyTargetPercent: product.strategyTargetPercent || 0,
        strategyTargetMinutes: product.strategyTargetMinutes || 0,
      });
    }
  }, [product]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/products/${product._id}/strategy`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('策略配置已保存');
        onSave(form); 
        onClose();
      } else {
        toast.error(data.message || '保存失败');
      }
    } catch (error) {
      toast.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold">价格策略配置: {product?.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* 1. 交易限制 */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Settings className="h-4 w-4"/> 交易大单限制
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">单笔最大买入量</label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  value={form.maxBuyAmount} 
                  onChange={(e) => setForm({...form, maxBuyAmount: parseFloat(e.target.value) || 0})} 
                />
                <p className="text-[10px] text-gray-400 mt-1">0 表示无限制，防止大单瞬间拉盘</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">单笔最大卖出量</label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  value={form.maxSellAmount} 
                  onChange={(e) => setForm({...form, maxSellAmount: parseFloat(e.target.value) || 0})} 
                />
                <p className="text-[10px] text-gray-400 mt-1">0 表示无限制，防止大单瞬间砸盘</p>
              </div>
            </div>
          </div>

          {/* 2. 涨跌停控制 */}
          <div className="bg-red-50 p-4 rounded-lg border border-red-100">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4"/> 涨跌停熔断
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">涨停幅度 (%)</label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  value={form.limitUpPercent} 
                  onChange={(e) => setForm({...form, limitUpPercent: parseFloat(e.target.value) || 0})} 
                />
                <p className="text-[10px] text-red-600 mt-1">达到涨幅自动关闭买入</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">跌停幅度 (%)</label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  value={form.limitDownPercent} 
                  onChange={(e) => setForm({...form, limitDownPercent: parseFloat(e.target.value) || 0})} 
                />
                <p className="text-[10px] text-red-600 mt-1">达到跌幅自动关闭卖出</p>
              </div>
            </div>
          </div>

          {/* 3. 价格浮动策略 */}
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4"/> 价格自动浮动策略
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">策略类型</label>
                <select 
                  value={form.strategyType}
                  onChange={(e) => setForm({...form, strategyType: e.target.value})}
                  className="w-full border border-gray-300 rounded-md text-sm shadow-sm bg-white p-2"
                >
                  <option value="market">自由市场 (由买卖单决定)</option>
                  <option value="trend_up">强制上涨 (拉盘模式)</option>
                  <option value="trend_down">强制下跌 (砸盘模式)</option>
                </select>
              </div>

              {form.strategyType !== 'market' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">目标涨跌幅 (%)</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      value={form.strategyTargetPercent} 
                      onChange={(e) => setForm({...form, strategyTargetPercent: parseFloat(e.target.value) || 0})} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">预计达成 (分钟)</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      value={form.strategyTargetMinutes} 
                      onChange={(e) => setForm({...form, strategyTargetMinutes: parseFloat(e.target.value) || 0})} 
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md text-sm">取消</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
              {loading ? '保存中...' : '保存配置'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// 主页面组件
// ==========================================
export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 编辑/新增 状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '', code: '', category: '实体', currentPrice: '', closePrice: '',
    issueDate: '', description: '', isActive: true, isLimited: false, totalSupply: 0,
    dividendRate: 0, dividendPerShare: 0, dividendPayInterval: 30,
  });

  // --- 新增：策略配置模态框状态 ---
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [strategyProduct, setStrategyProduct] = useState(null);

  // 历史数据补全 状态
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [historyDate, setHistoryDate] = useState('');
  const [historyPrice, setHistoryPrice] = useState('');

  const router = useRouter(); 

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/products', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setProducts(data.data.data);
      } else {
        toast.error(data.message || '获取产品列表失败');
      }
    } catch (error) {
      console.error(error);
      toast.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = editingProduct ? `/api/admin/products/${editingProduct._id}` : '/api/admin/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        currentPrice: parseFloat(formData.currentPrice),
        closePrice: formData.closePrice ? parseFloat(formData.closePrice) : parseFloat(formData.currentPrice),
        totalSupply: formData.isLimited ? parseFloat(formData.totalSupply) : 0,
        dividendRate: parseFloat(formData.dividendRate),
        dividendPerShare: parseFloat(formData.dividendPerShare),
        dividendPayInterval: parseInt(formData.dividendPayInterval),
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(editingProduct ? '产品更新成功' : '产品发布成功');
        setIsModalOpen(false);
        resetForm();
        fetchProducts();
      } else {
        toast.error(data.message || '保存失败');
      }
    } catch (error) {
      console.error(error);
      toast.error('保存失败');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('确定要删除此产品吗？')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success('删除成功'); fetchProducts();
      } else { toast.error(data.message || '删除失败'); }
    } catch (error) { toast.error('删除失败'); }
  };

  const openHistoryModal = (productId) => {
    setSelectedProductId(productId); setIsHistoryModalOpen(true);
  };

  const handleAddHistory = async (e) => {
    e.preventDefault();
    if (!historyDate || !historyPrice) return toast.error('请填写日期和价格');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/products/${selectedProductId}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: historyDate, price: parseFloat(historyPrice) }),
      });
      if (res.ok) {
        toast.success('历史价格添加成功'); setIsHistoryModalOpen(false); setHistoryDate(''); setHistoryPrice(''); fetchProducts();
      }
    } catch (error) { toast.error('网络错误'); }
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name, code: product.code, category: product.category,
      currentPrice: product.currentPrice, closePrice: product.closePrice,
      issueDate: product.issueDate ? product.issueDate.split('T')[0] : '',
      description: product.description || '', isActive: product.isActive,
      isLimited: product.isLimited || false, totalSupply: product.totalSupply || 0,
      dividendRate: product.dividendRate || 0, dividendPerShare: product.dividendPerShare || 0, dividendPayInterval: product.dividendPayInterval || 30,
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({ name: '', code: '', category: '实体', currentPrice: '', closePrice: '', issueDate: '', description: '', isActive: true, isLimited: false, totalSupply: 0, dividendRate: 0, dividendPerShare: 0, dividendPayInterval: 30 });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">产品管理</h1>
        <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" /> 发布产品
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50"><tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称/代码</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">价格</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr></thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-500">加载中...</td></tr> : products.length === 0 ? <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-500">暂无产品</td></tr> :
            products.map((product) => (
              <tr key={product._id} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{product.name}</div>
                  <div className="text-xs text-gray-500">{product.code}</div>
                  {product.strategyType !== 'market' && (
                    <div className="text-[10px] text-orange-600 font-bold">
                      策略: {product.strategyType === 'trend_up' ? '强涨' : '强跌'}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                  {product.currentPrice.toFixed(2)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {product.isActive ? <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">交易中</span> : <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">已停牌</span>}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {/* 策略按钮 */}
                  <button onClick={() => { setStrategyProduct(product); setShowStrategyModal(true); }} className="text-purple-600 hover:text-purple-900 mr-2" title="配置策略">
                    <Activity className="h-4 w-4 inline" /> 策略
                  </button>
                  <button onClick={() => openEditModal(product)} className="text-blue-600 hover:text-blue-900 mr-2"><Edit className="h-4 w-4 inline" /></button>
                  <button onClick={() => openHistoryModal(product._id)} className="text-green-600 hover:text-green-900 mr-2"><Calendar className="h-4 w-4 inline" /></button>
                  <button onClick={() => handleDeleteProduct(product._id)} className="text-red-600 hover:text-red-900"><Trash2 className="h-4 w-4 inline" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 历史数据补全 模态框 */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">补全历史价格</h2>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-gray-400 hover:text-gray-500">✕</button>
            </div>
            <form onSubmit={handleAddHistory} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">日期</label><input type="date" required className="w-full px-3 py-2 border rounded-md" value={historyDate} onChange={(e) => setHistoryDate(e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">收盘价</label><input type="number" step="0.01" required className="w-full px-3 py-2 border rounded-md" value={historyPrice} onChange={(e) => setHistoryPrice(e.target.value)} /></div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setIsHistoryModalOpen(false)} className="px-4 py-2 border rounded-md">取消</button><button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md">添加</button></div>
            </form>
          </div>
        </div>
      )}

      {/* 价格策略模态框 */}
      <ProductStrategyModal 
        isOpen={showStrategyModal} 
        onClose={() => setShowStrategyModal(false)} 
        product={strategyProduct} 
        onSave={(data) => {
          setProducts(prev => prev.map(p => p._id === strategyProduct._id ? { ...p, ...data } : p));
        }}
      />

      {/* 创建/编辑产品 模态框 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold">{editingProduct ? '编辑产品' : '发布产品'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">✕</button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">产品名称</label><input type="text" required className="w-full px-3 py-2 border rounded-md" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">代码</label><input type="text" required className="w-full px-3 py-2 border rounded-md" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">类别</label><select className="w-full px-3 py-2 border rounded-md" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}><option value="实体">实体</option><option value="虚拟产品">虚拟产品</option><option value="游戏产品">游戏产品</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">当前价格</label><input type="number" step="0.01" required className="w-full px-3 py-2 border rounded-md" value={formData.currentPrice} onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">发行时间</label><input type="date" className="w-full px-3 py-2 border rounded-md" value={formData.issueDate} onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} /></div>
              </div>
              <div className="bg-gray-50 p-3 rounded-md border">
                 <h3 className="text-sm font-semibold mb-2">限量设置</h3>
                 <div className="flex items-center mb-2"><input type="checkbox" id="isLimited" checked={formData.isLimited} onChange={(e) => setFormData({ ...formData, isLimited: e.target.checked })} className="h-4 w-4 text-blue-600" /><label htmlFor="isLimited" className="ml-2 text-sm">开启限量发售</label></div>
                 {formData.isLimited && <div><label className="block text-sm font-medium text-gray-700 mb-1">总发行量</label><input type="number" required className="w-full px-3 py-2 border rounded-md" value={formData.totalSupply} onChange={(e) => setFormData({ ...formData, totalSupply: e.target.value })} /></div>}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md text-gray-700">取消</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">保存</button>
            </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
