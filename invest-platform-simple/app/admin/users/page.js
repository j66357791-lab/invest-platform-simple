// app/admin/users/page.js
'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Search, UserCheck, UserX, Wallet, Edit, Trash2, Shield, Layers, Calendar, Package } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // --- 余额调整状态 ---
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [balanceUser, setBalanceUser] = useState(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceType, setBalanceType] = useState('add'); // 'add' or 'sub'
  const [balanceRemark, setBalanceRemark] = useState('');

  // --- 持仓限制状态 ---
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [limitUser, setLimitUser] = useState(null);
  const [products, setProducts] = useState([]); // 产品列表
  const [selectedProductId, setSelectedProductId] = useState('');
  const [limitQuantity, setLimitQuantity] = useState('');

  // ========== 新增：持仓管理状态 ==========
  const [isHoldingModalOpen, setIsHoldingModalOpen] = useState(false);
  const [holdingUser, setHoldingUser] = useState(null); // 当前查看的用户
  const [userHoldings, setUserHoldings] = useState([]); // 用户的持仓列表
  const [loadingHoldings, setLoadingHoldings] = useState(false);
  
  // 持仓编辑状态
  const [editingHoldingId, setEditingHoldingId] = useState(null);
  const [holdingAction, setHoldingAction] = useState('add');
  const [holdingAmount, setHoldingAmount] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchProducts();
  }, [keyword, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (keyword) params.append('keyword', keyword);
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        setUsers(data.data.data || []);
      } else {
        toast.error(data.message || '获取用户列表失败');
      }
    } catch (error) {
      console.error(error);
      toast.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/products', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setProducts(data.data.data || []);
      }
    } catch (error) {
      console.error('获取产品列表失败', error);
    }
  };

  const handleToggleStatus = async (userId, isActive) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !isActive }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('状态更新成功');
        fetchUsers();
      } else {
        toast.error(data.message || '更新失败');
      }
    } catch (error) {
      console.error(error);
      toast.error('网络错误');
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('角色更新成功');
        fetchUsers();
      } else {
        toast.error(data.message || '更新失败');
      }
    } catch (error) {
      console.error(error);
      toast.error('网络错误');
    }
  };

  // --- 余额调整逻辑 ---
  const openBalanceModal = (user) => {
    setBalanceUser(user);
    setBalanceAmount('');
    setBalanceType('add');
    setBalanceRemark('管理员手动调整');
    setIsBalanceModalOpen(true);
  };

  const handleUpdateBalance = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/users/${balanceUser._id}/balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseFloat(balanceAmount),
          type: balanceType,
          remark: balanceRemark,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('余额调整成功');
        setIsBalanceModalOpen(false);
        fetchUsers(); // 刷新列表显示新余额
      } else {
        toast.error(data.message || '调整失败');
      }
    } catch (error) {
      console.error(error);
      toast.error('网络错误');
    }
  };

  // --- 持仓限制逻辑 ---
  const openLimitModal = (user) => {
    setLimitUser(user);
    setSelectedProductId('');
    setLimitQuantity('');
    setIsLimitModalOpen(true);
  };

  const handleSetLimit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/users/${limitUser._id}/limits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: selectedProductId,
          maxQuantity: parseInt(limitQuantity),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('持仓限制设置成功');
        setIsLimitModalOpen(false);
      } else {
        toast.error(data.message || '设置失败');
      }
    } catch (error) {
      console.error(error);
      toast.error('网络错误');
    }
  };

  // ========== 新增：持仓管理逻辑 ==========
  
  // 打开持仓弹窗并获取该用户的持仓
  const openHoldingModal = async (user) => {
    setHoldingUser(user);
    setUserHoldings([]);
    setIsHoldingModalOpen(true);
    setLoadingHoldings(true);

    try {
      const token = localStorage.getItem('token');
      // 调用后端获取用户持仓 (假设后端有 /api/holdings?userId=xxx 或者在 /api/admin/users/[id]/route.js 返回了)
      // 为了保险，这里我们假设 /api/admin/users/[id]/route.js 已经支持返回 holdings
      // 如果你没有改后端，这里可以暂时为空，或者你需要确保后端返回了 holdings
      const res = await fetch(`/api/admin/users/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      
      // 注意：这里假设后端返回结构为 data.data.holdings
      // 如果你的后端没有返回 holdings，这个列表会是空的
      if (data.success && data.data.holdings) {
        setUserHoldings(data.data.holdings);
      }
    } catch (error) {
      console.error('获取持仓失败', error);
      toast.error('获取持仓失败');
    } finally {
      setLoadingHoldings(false);
    }
  };

  // 提交持仓调整
  const handleAdjustHolding = async (holdingId) => {
    if (!holdingAmount) return toast.error('请输入数量');
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/holdings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          holdingId,
          action: holdingAction,
          amount: parseFloat(holdingAmount),
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('持仓调整成功');
        setEditingHoldingId(null);
        setHoldingAmount('');
        // 刷新持仓列表
        openHoldingModal(holdingUser); 
        // 如果调整后余额变了，可能需要刷新用户列表，这里暂不刷新整个列表以保持状态
      } else {
        toast.error(data.message || '调整失败');
      }
    } catch (error) {
      console.error(error);
      toast.error('网络错误');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索用户名/手机号/邮箱..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
          </div>
          <select
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">全部角色</option>
            <option value="user">普通用户</option>
            <option value="admin">管理员</option>
            <option value="superadmin">超级管理员</option>
          </select>
          <select
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">全部状态</option>
            <option value="active">正常</option>
            <option value="frozen">冻结</option>
          </select>
        </div>
      </div>

      {/* 用户列表 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户信息</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">余额</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">注册时间</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                  加载中...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                  暂无用户
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.username}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={user.role}
                      onChange={(e) => handleUpdateRole(user._id, e.target.value)}
                      className={`text-sm px-2 py-1 rounded ${
                        user.role === 'superadmin' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}
                      disabled={user.role === 'superadmin'}
                    >
                      <option value="user">用户</option>
                      <option value="admin">管理员</option>
                      <option value="superadmin">超级管理员</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    ¥{user.balance ? user.balance.toFixed(2) : '0.00'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleStatus(user._id, user.isActive)}
                        className={`p-1 rounded ${
                          user.isActive ? 'text-green-600 hover:bg-green-50' : 'text-red-600 hover:bg-red-50'
                        }`}
                      >
                        {user.isActive ? <UserCheck className="h-5 w-5" /> : <UserX className="h-5 w-5" />}
                      </button>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isFrozen ? '冻结' : (user.isActive ? '正常' : '禁用')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {/* 余额调整按钮 */}
                      <button
                        onClick={() => openBalanceModal(user)}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="调整余额"
                      >
                        <Wallet className="h-4 w-4" />
                      </button>
                      {/* 持仓管理按钮 (这里复用了Layers图标，或者可以用Package) */}
                      <button
                        onClick={() => openHoldingModal(user)}
                        className="text-blue-600 hover:text-blue-900"
                        title="管理持仓"
                      >
                        <Package className="h-4 w-4" />
                      </button>
                      {/* 持仓限制按钮 */}
                      <button
                        onClick={() => openLimitModal(user)}
                        className="text-purple-600 hover:text-purple-900"
                        title="持仓限制"
                      >
                        <Layers className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 调整余额模态框 */}
      {isBalanceModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">调整余额</h2>
              <button onClick={() => setIsBalanceModalOpen(false)} className="text-gray-400 hover:text-gray-500">✕</button>
            </div>
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">用户：{balanceUser?.username}</p>
              <p className="text-sm font-bold text-gray-900">当前余额：¥{balanceUser?.balance ? balanceUser.balance.toFixed(2) : '0.00'}</p>
            </div>
            <form onSubmit={handleUpdateBalance} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">操作类型</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="add"
                      checked={balanceType === 'add'}
                      onChange={(e) => setBalanceType(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-green-600">增加</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="sub"
                      checked={balanceType === 'sub'}
                      onChange={(e) => setBalanceType(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-red-600">扣减</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">金额</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={balanceRemark}
                  onChange={(e) => setBalanceRemark(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsBalanceModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  确认调整
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 持仓限制模态框 */}
      {isLimitModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">设置持仓限制</h2>
              <button onClick={() => setIsLimitModalOpen(false)} className="text-gray-400 hover:text-gray-500">✕</button>
            </div>
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">用户：{limitUser?.username}</p>
            </div>
            <form onSubmit={handleSetLimit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">选择产品</label>
                <select
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                >
                  <option value="">-- 请选择产品 --</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">最大持有数量 (0=无限制)</label>
                <input
                  type="number"
                  min="0"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={limitQuantity}
                  onChange={(e) => setLimitQuantity(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsLimitModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  确认设置
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== 新增：持仓管理模态框 ========== */}
      {isHoldingModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">持仓管理 - {holdingUser?.username}</h2>
              <button onClick={() => setIsHoldingModalOpen(false)} className="text-gray-400 hover:text-gray-500">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {loadingHoldings ? (
                <div className="text-center py-8 text-gray-500">加载持仓数据...</div>
              ) : userHoldings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">该用户暂无持仓</div>
              ) : (
                <div className="space-y-4">
                  {userHoldings.map((holding) => (
                    <div key={holding._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-gray-900">{holding.productId?.name}</h3>
                          <p className="text-xs text-gray-500">{holding.productId?.code}</p>
                        </div>
                        <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md">
                          当前: {holding.amount}
                        </span>
                      </div>

                      {editingHoldingId === holding._id ? (
                        // 编辑模式
                        <div className="bg-gray-50 rounded-lg p-3 space-y-3">
                          <div className="flex gap-2">
                            {['add', 'subtract', 'set'].map((action) => (
                              <button
                                key={action}
                                onClick={() => setHoldingAction(action)}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                                  holdingAction === action
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                }`}
                              >
                                {action === 'add' ? '增加' : action === 'subtract' ? '减少' : '设为'}
                              </button>
                            ))}
                          </div>
                          <input
                            type="number"
                            value={holdingAmount}
                            onChange={(e) => setHoldingAmount(e.target.value)}
                            placeholder="输入数量"
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAdjustHolding(holding._id)}
                              className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                            >
                              确认
                            </button>
                            <button
                              onClick={() => { setEditingHoldingId(null); setHoldingAmount(''); }}
                              className="flex-1 py-2 bg-white text-gray-700 rounded-lg font-medium hover:bg-gray-100 border border-gray-200"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        // 查看模式
                        <button
                          onClick={() => { setEditingHoldingId(holding._id); setHoldingAction('add'); setHoldingAmount(''); }}
                          className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                        >
                          调整持仓数量
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
