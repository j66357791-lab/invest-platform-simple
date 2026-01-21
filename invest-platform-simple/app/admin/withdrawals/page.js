// app/admin/withdrawals/page.js
'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, Search, Filter, DollarSign } from 'lucide-react';

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    fetchWithdrawals();
  }, [statusFilter, keyword]);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (keyword) params.append('keyword', keyword);

      // 🔑 关键修复1：增加 credentials: 'include'
      // 🔑 关键修复2：路径与后端文件夹一致 (withdraws)
      const res = await fetch(`/api/admin/withdraws?${params}`, {
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include', // 携带 Cookie
      });

      // 🔑 关键修复3：检查 HTTP 状态码，防止解析 HTML 导致报错
      if (!res.ok) {
        console.error('API Error Status:', res.status);
        if (res.status === 401 || res.status === 403) {
          toast.error('权限不足或登录已过期，请重新登录');
          // 可选：跳转登录页
          // window.location.href = '/login';
        } else if (res.status === 404) {
          toast.error('API 接口不存在 (404)，请检查文件路径');
        } else {
          toast.error('服务器错误');
        }
        setWithdrawals([]);
        setLoading(false);
        return;
      }

      // 只有状态码正常才解析 JSON
      const data = await res.json();

      if (data.success) {
        setWithdrawals(Array.isArray(data.data?.data) ? data.data.data : []);
      } else {
        toast.error(data.message || '获取提现记录失败');
        setWithdrawals([]);
      }
    } catch (error) {
      console.error('Fetch Error:', error);
      toast.error('网络请求失败');
      setWithdrawals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action, remark = '') => {
    try {
      const token = localStorage.getItem('token');
      
      const res = await fetch(`/api/admin/withdraws/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ 
          status: action,
          reviewRemark: remark,
        }),
      });

      if (!res.ok) {
        toast.error(`操作失败 (${res.status})`);
        return;
      }

      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message || '操作成功');
        fetchWithdrawals();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch (error) {
      console.error(error);
      toast.error('网络错误');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">待审核</span>;
      case 'approved':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">已通过 (待打款)</span>;
      case 'rejected':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">已拒绝</span>;
      case 'completed':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">已完成</span>;
      default:
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">提现审核</h1>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-lg shadow-sm p-4 flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索用户/订单号..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </div>
        <select
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">全部状态</option>
          <option value="pending">待审核</option>
          <option value="approved">已通过</option>
          <option value="rejected">已拒绝</option>
          <option value="completed">已完成</option>
        </select>
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">金额</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">银行信息</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">加载中...</td></tr>
            ) : withdrawals.length === 0 ? (
              <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">暂无记录</td></tr>
            ) : (
              withdrawals.map((w) => (
                <tr key={w._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {w.userId?.username || '未知用户'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                    ¥{w.amount?.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div>{w.bankName}</div>
                    <div>{w.bankAccount}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(w.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                    {/* 待审核状态：显示通过和拒绝 */}
                    {w.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            if (confirm('确定审核通过？')) handleAction(w._id, 'approved');
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="审核通过"
                        >
                          <CheckCircle className="h-5 w-5 inline" />
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('请输入拒绝原因：');
                            if (reason) handleAction(w._id, 'rejected', reason);
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="拒绝"
                        >
                          <XCircle className="h-5 w-5 inline" />
                        </button>
                      </div>
                    )}

                    {/* 已通过状态：显示打款完成 */}
                    {w.status === 'approved' && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            if (confirm('确定已打款并完成订单？')) {
                              handleAction(w._id, 'completed');
                            }
                          }}
                          className="text-green-600 hover:text-green-900"
                          title="打款完成"
                        >
                          <DollarSign className="h-5 w-5 inline" />
                        </button>
                      </div>
                    )}

                    {/* 已拒绝或已完成 */}
                    {w.status !== 'pending' && w.status !== 'approved' && (
                      <span className="text-gray-400 text-xs">已处理</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
