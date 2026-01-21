// app/admin/deposits/page.js
'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Search, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';

export default function AdminDepositsPage() {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('reviewing'); // 默认显示审核中

  useEffect(() => {
    fetchDeposits();
  }, [statusFilter]);

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/admin/deposits?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        setDeposits(data.data.data);
      } else {
        toast.error(data.message);
      }
    } catch (e) {
      toast.error('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id, action) => {
    const remark = prompt(`请输入${action === 'approve' ? '通过' : '拒绝'}备注：`);
    if (remark === null) return; // 取消

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/deposits/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, remark }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('操作成功');
        fetchDeposits();
      } else {
        toast.error(data.message);
      }
    } catch (e) {
      toast.error('网络错误');
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending': return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">待支付</span>;
      case 'reviewing': return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">审核中</span>;
      case 'completed': return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">已到账</span>;
      case 'cancelled': return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">已取消</span>;
      default: return <span className="text-gray-500">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">充值管理</h1>
        <button onClick={fetchDeposits} className="text-blue-600 hover:text-blue-700">
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* 筛选 */}
      <div className="flex gap-2 mb-4">
        {['reviewing', 'completed', 'cancelled', 'pending'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              statusFilter === status ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {status === 'reviewing' ? '审核中' : status === 'completed' ? '已到账' : status === 'cancelled' ? '已取消' : '待支付'}
          </button>
        ))}
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">订单号</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">金额</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan="6" className="p-8 text-center text-gray-500">加载中...</td></tr>
            ) : deposits.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-gray-500">暂无数据</td></tr>
            ) : (
              deposits.map((d) => (
                <tr key={d._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{d.userId?.username}</div>
                    <div className="text-xs text-gray-500">{d.userId?.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{d.orderNo}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">¥{d.amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(d.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(d.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {d.status === 'reviewing' && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleReview(d._id, 'approve')}
                          className="text-green-600 hover:text-green-900"
                          title="通过并到账"
                        >
                          <CheckCircle className="h-5 w-5 inline" />
                        </button>
                        <button
                          onClick={() => handleReview(d._id, 'reject')}
                          className="text-red-600 hover:text-red-900"
                          title="拒绝"
                        >
                          <XCircle className="h-5 w-5 inline" />
                        </button>
                      </div>
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
