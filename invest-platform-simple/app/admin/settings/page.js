// app/admin/settings/page.js
'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Settings, Bell, Shield, Database, FileText } from 'lucide-react';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('announcements');
  const [announcements, setAnnouncements] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 表单状态
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'system',
    priority: 0,
    isActive: true,
  });

  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (activeTab === 'announcements') {
      fetchAnnouncements();
    }
  }, [activeTab]);

  const tabs = [
    { value: 'announcements', label: '公告管理', icon: Bell },
    { value: 'system', label: '系统配置', icon: Settings },
    { value: 'security', label: '安全设置', icon: Shield },
    { value: 'database', label: '数据备份', icon: Database },
    { value: 'logs', label: '操作日志', icon: FileText },
  ];

  const fetchAnnouncements = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/announcements', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        setAnnouncements(data.data.data || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = editingId 
        ? `/api/admin/announcements/${editingId}`
        : '/api/admin/announcements';
      
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('保存成功');
        setIsModalOpen(false);
        resetForm();
        fetchAnnouncements();
      } else {
        toast.error(data.message || '保存失败');
      }
    } catch (error) {
      console.error(error);
      toast.error('保存失败');
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!confirm('确定要删除此公告吗？')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        toast.success('删除成功');
        fetchAnnouncements();
      } else {
        toast.error(data.message || '删除失败');
      }
    } catch (error) {
      console.error(error);
      toast.error('删除失败');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'system',
      priority: 0,
      isActive: true,
    });
    setEditingId(null);
  };

  const openEditModal = (announcement) => {
    setEditingId(announcement._id);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      priority: announcement.priority,
      isActive: announcement.isActive,
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
      </div>

      {/* Tab 切换 */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={activeTab === tab.value ? (
                    'border-blue-500 text-blue-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center'
                  ) : (
                    'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center'
                  )}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'announcements' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900">公告列表</h2>
                <button
                  onClick={() => {
                    resetForm();
                    setIsModalOpen(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  发布公告
                </button>
              </div>

              <div className="space-y-4">
                {announcements.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    暂无公告
                  </div>
                ) : (
                  announcements.map((announcement) => (
                    <div
                      key={announcement._id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-sm font-semibold text-gray-900">
                              {announcement.title}
                            </h3>
                            <span className={`px-2 py-0.5 text-xs rounded ${
                              announcement.type === 'system' ? 'bg-blue-100 text-blue-800' :
                              announcement.type === 'market' ? 'bg-green-100 text-green-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {announcement.type === 'system' ? '系统' :
                               announcement.type === 'market' ? '市场' : '活动'}
                            </span>
                            {!announcement.isActive && (
                              <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600">
                                已禁用
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{announcement.content}</p>
                          <p className="text-xs text-gray-400">
                            发布于 {new Date(announcement.createdAt).toLocaleString('zh-CN')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(announcement)}
                            className="text-blue-600 hover:text-blue-900 text-sm"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDeleteAnnouncement(announcement._id)}
                            className="text-red-600 hover:text-red-900 text-sm"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">系统配置</h2>
              <div className="text-gray-500 text-sm">
                系统配置功能待开发...
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">安全设置</h2>
              <div className="text-gray-500 text-sm">
                安全设置功能待开发...
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">数据备份</h2>
              <div className="text-gray-500 text-sm">
                数据备份功能待开发...
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">操作日志</h2>
              <div className="text-gray-500 text-sm">
                操作日志功能待开发...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 公告编辑模态框 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">
                {editingId ? '编辑公告' : '发布公告'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSaveAnnouncement} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="system">系统公告</option>
                  <option value="market">市场公告</option>
                  <option value="activity">活动公告</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
                <textarea
                  rows="4"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                />
                <p className="text-xs text-gray-500 mt-1">数字越大越靠前</p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                  立即发布
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
