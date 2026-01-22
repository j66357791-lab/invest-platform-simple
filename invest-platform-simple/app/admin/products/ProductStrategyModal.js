// components/admin/ProductStrategyModal.js
'use client';
import { useState, useEffect } from 'react';
import Modal from '@/components/ui/modal';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';

export default function ProductStrategyModal({ isOpen, onClose, product, onSave }) {
  const [form, setForm] = useState({
    maxBuyAmount: 10000, // 默认值
    maxSellAmount: 10000,
    limitUpPercent: 20,
    limitDownPercent: 20,
    strategyType: 'market', // 'market', 'trend_up', 'trend_down'
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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`配置价格策略: ${product?.name}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* 1. 交易限制 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">交易限制</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                单笔最大买入量
              </label>
              <Input 
                type="number" 
                value={form.maxBuyAmount} 
                onChange={(e) => setForm({...form, maxBuyAmount: parseFloat(e.target.value) || 0})} 
                placeholder="设置上限，防止大单拉盘"
              />
              <p className="text-xs text-gray-500 mt-1">限量产品建议设置较小值</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                单笔最大卖出量
              </label>
              <Input 
                type="number" 
                value={form.maxSellAmount} 
                onChange={(e) => setForm({...form, maxSellAmount: parseFloat(e.target.value) || 0})} 
                placeholder="设置上限，防止大单砸盘"
              />
            </div>
          </div>
        </div>

        {/* 2. 涨跌停控制 */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">涨跌停熔断机制</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                涨停幅度 (%)
              </label>
              <Input 
                type="number" 
                value={form.limitUpPercent} 
                onChange={(e) => setForm({...form, limitUpPercent: parseFloat(e.target.value) || 0})} 
              />
              <p className="text-xs text-gray-500 mt-1">达到涨幅将自动关闭买入功能</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                跌停幅度 (%)
              </label>
              <Input 
                type="number" 
                value={form.limitDownPercent} 
                onChange={(e) => setForm({...form, limitDownPercent: parseFloat(e.target.value) || 0})} 
              />
              <p className="text-xs text-gray-500 mt-1">达到跌幅将自动关闭卖出功能</p>
            </div>
          </div>
        </div>

        {/* 3. 价格浮动策略 */}
        <div className="bg-orange-50 p-4 rounded-lg">
          <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">价格自动浮动策略</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                策略类型
              </label>
              <select 
                value={form.strategyType}
                onChange={(e) => setForm({...form, strategyType: e.target.value})}
                className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 bg-white"
              >
                <option value="market">自由市场 (由买卖单决定)</option>
                <option value="trend_up">强制上涨 (拉盘模式)</option>
                <option value="trend_down">强制下跌 (砸盘模式)</option>
                <option value="volatile">剧烈震荡 (随机漫步)</option>
              </select>
            </div>

            {form.strategyType !== 'market' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    目标涨跌幅 (%)
                  </label>
                  <Input 
                    type="number" 
                    value={form.strategyTargetPercent} 
                    onChange={(e) => setForm({...form, strategyTargetPercent: parseFloat(e.target.value) || 0})} 
                    placeholder="例如: 10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    预计达成时长 (分钟)
                  </label>
                  <Input 
                    type="number" 
                    value={form.strategyTargetMinutes} 
                    onChange={(e) => setForm({...form, strategyTargetMinutes: parseFloat(e.target.value) || 0})} 
                    placeholder="例如: 60"
                  />
                </div>
              </div>
            )}
            <p className="text-xs text-orange-700">
              * 后台定时任务将根据此配置在指定时间内逐步调整价格。若选择自由市场，则完全由用户买卖驱动。
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" type="button" onClick={onClose}>
            取消
          </Button>
          <Button type="button" onClick={handleSubmit}>
            保存配置
          </Button>
        </div>
      </form>
    </Modal>
  );
}
