// app/wallet/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Wallet, ArrowUpRight, ArrowDownLeft, RefreshCw, XCircle, Plus, CreditCard, Banknote, ArrowRight, Calendar } from 'lucide-react';

export default function WalletPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // --- 数据状态 (所有明细) ---
  const [rechargeData, setRechargeData] = useState([]);
  const [withdrawData, setWithdrawData] = useState([]);
  const [tradeData, setTradeData] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'deposit', 'withdraw', 'trade'

  // --- 充值操作状态 ---
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [currentDepositOrder, setCurrentDepositOrder] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRechargeLoading, setIsRechargeLoading] = useState(false);

  // --- 提现操作状态 ---
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isWithdrawLoading, setIsWithdrawLoading] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchHistory();
  }, []);

  // 倒计时逻辑
  useEffect(() => {
    let interval;
    if (currentDepositOrder && currentDepositOrder.status === 'pending' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleOrderTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentDepositOrder, timeLeft]);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/user', { credentials: 'include' });
      if (res.ok) setUser(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/user/transactions?days=30', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        const all = data.data;
        setRechargeData(all.filter(i => i.type === 'deposit'));
        setWithdrawData(all.filter(i => i.type === 'withdraw'));
        setTradeData(all.filter(i => i.type === 'transaction'));
      }
    } catch (e) { console.error(e); }
  };

  // --- 充值逻辑 ---
  const createRechargeOrder = async () => {
    if (!rechargeAmount || rechargeAmount <= 0) return toast.error('请输入有效金额');
    setIsRechargeLoading(true);
    try {
      const res = await fetch('/api/user/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount: parseFloat(rechargeAmount) }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentDepositOrder(data.data);
        const expiresAt = new Date(data.data.expiresAt).getTime();
        const now = Date.now();
        setTimeLeft(Math.max(0, Math.floor((expiresAt - now) / 1000)));
      } else {
        toast.error(data.message);
      }
    } catch (e) {
      toast.error('网络错误');
    } finally {
      setIsRechargeLoading(false);
    }
  };

  const confirmPayment = async () => {
    if (!currentDepositOrder) return;
    try {
      const res = await fetch(`/api/user/deposit/${currentDepositOrder._id}/confirm`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('已提交审核');
        setIsRechargeModalOpen(false);
        setCurrentDepositOrder(null);
        fetchUser();
        fetchHistory();
      } else {
        toast.error(data.message);
      }
    } catch (e) {
      toast.error('网络错误');
    }
  };

  const handleOrderTimeout = () => {
    toast.error('充值超时');
    setCurrentDepositOrder(null);
    setIsRechargeModalOpen(false);
  };

  // --- 提现逻辑 ---
  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!withdrawAmount || withdrawAmount <= 0) return toast.error('请输入有效金额');
    if (!bankName || !bankAccount || !accountName) return toast.error('请填写完整银行信息');
    if (parseFloat(withdrawAmount) > user.balance) return toast.error('余额不足');

    setIsWithdrawLoading(true);
    try {
      const res = await fetch('/api/user/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: parseFloat(withdrawAmount),
          bankName,
          bankAccount,
          accountName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('提现申请已提交');
        setIsWithdrawModalOpen(false);
        setWithdrawAmount('');
        setBankName('');
        setBankAccount('');
        setAccountName('');
        fetchUser();
        fetchHistory();
      } else {
        toast.error(data.message);
      }
    } catch (e) {
      toast.error('网络错误');
    } finally {
      setIsWithdrawLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (type, status) => {
    if (type === 'deposit') {
      if (status === 'pending') return <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">待支付</span>;
      if (status === 'reviewing') return <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">待审核</span>;
      if (status === 'completed') return <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">已完成</span>;
      if (status === 'cancelled' || status === 'expired') return <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800">已取消</span>;
    }
    if (type === 'withdraw') {
      if (status === 'pending') return <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">待审核</span>;
      if (status === 'approved') return <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">已打款</span>;
      if (status === 'cancelled' || status === 'rejected') return <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800">已取消</span>;
      if (status === 'completed') return <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">已完成</span>;
    }
    return <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800">{status}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* 顶部资产卡片 - 仿 Dashboard */}
      <div className="bg-white shadow-sm border-b border-gray-100 p-4 sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900">我的钱包</h1>
        <button onClick={() => { fetchUser(); fetchHistory(); }} className="text-gray-400 hover:text-blue-600">
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* 资产展示大卡片 */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 shadow-lg text-white flex justify-between items-center">
          <div>
            <div className="text-blue-100 text-sm mb-1">可用余额 (CNY)</div>
            <div className="text-4xl font-bold">
              {loading ? '---' : (user?.balance?.toFixed(2) || '0.00')}
            </div>
          </div>
          <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
            <Wallet className="h-8 w-8 text-white" />
          </div>
        </div>

        {/* 核心操作区：充值 + 提现 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 充值入口卡牌 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow flex flex-col justify-between h-40 group cursor-pointer" onClick={() => setIsRechargeModalOpen(true)}>
            <div className="flex justify-between items-start">
              <div>
                <div className="text-gray-500 text-sm mb-1">账户充值</div>
                <div className="text-xl font-bold text-gray-900">余额不足？</div>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center text-green-600 group-hover:bg-green-100 transition-colors">
                <ArrowDownLeft className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-green-600 font-medium group-hover:translate-x-1 transition-transform">
              立即充值 <ArrowRight className="h-4 w-4 ml-1" />
            </div>
          </div>

          {/* 提现入口卡牌 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow flex flex-col justify-between h-40 group cursor-pointer" onClick={() => setIsWithdrawModalOpen(true)}>
            <div className="flex justify-between items-start">
              <div>
                <div className="text-gray-500 text-sm mb-1">申请提现</div>
                <div className="text-xl font-bold text-gray-900">资金变现</div>
              </div>
              <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center text-red-600 group-hover:bg-red-100 transition-colors">
                <ArrowUpRight className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-red-600 font-medium group-hover:translate-x-1 transition-transform">
              去提现 <ArrowRight className="h-4 w-4 ml-1" />
            </div>
          </div>

        </div>

        {/* 交易明细卡牌 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">最近交易明细</h2>
            {/* 简单的Tab筛选 */}
            <div className="flex gap-2 text-xs">
              <button onClick={() => setActiveTab('all')} className={`px-3 py-1 rounded-full ${activeTab==='all'?'bg-blue-600 text-white':'bg-gray-100 text-gray-600'}`}>全部</button>
              <button onClick={() => setActiveTab('deposit')} className={`px-3 py-1 rounded-full ${activeTab==='deposit'?'bg-blue-600 text-white':'bg-gray-100 text-gray-600'}`}>充值</button>
              <button onClick={() => setActiveTab('withdraw')} className={`px-3 py-1 rounded-full ${activeTab==='withdraw'?'bg-blue-600 text-white':'bg-gray-100 text-gray-600'}`}>提现</button>
              <button onClick={() => setActiveTab('trade')} className={`px-3 py-1 rounded-full ${activeTab==='trade'?'bg-blue-600 text-white':'bg-gray-100 text-gray-600'}`}>交易</button>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-8 text-center text-gray-500">加载中...</div>
            ) : (
              (() => {
                let list = [];
                if (activeTab === 'all') list = [...rechargeData, ...withdrawData, ...tradeData];
                else if (activeTab === 'deposit') list = rechargeData;
                else if (activeTab === 'withdraw') list = withdrawData;
                else if (activeTab === 'trade') list = tradeData;
                
                // 排序
                list.sort((a, b) => b.createdAt - a.createdAt);

                return list.length === 0 ? (
                  <div className="p-12 text-center text-gray-400">暂无相关记录</div>
                ) : list.slice(0, 10).map((item) => (
                  <div key={item._id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {item.type === 'deposit' ? '账户充值' : 
                           item.type === 'withdraw' ? '账户提现' : 
                           item.description || '产品交易'}
                        </span>
                        {getStatusBadge(item.type, item.status)}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(item.createdAt).toLocaleString()}
                        {item.orderNo && <span className="ml-2 font-mono text-gray-400">({item.orderNo})</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold text-lg ${item.amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {item.amount > 0 ? '+' : ''}{item.amount?.toFixed(2) || '0.00'}
                      </div>
                      {item.balance !== null && (
                         <div className="text-xs text-gray-500">余额: ¥{item.balance.toFixed(2)}</div>
                      )}
                    </div>
                  </div>
                ));
              })()
            )}
          </div>
        </div>

      </div>

      {/* ================= 模态框：充值操作 (仿Dashboard UI) ================= */}
      {isRechargeModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">账户充值</h3>
              <button onClick={() => setIsRechargeModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              {!currentDepositOrder ? (
                // 充值表单
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">选择金额</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[100, 500, 1000, 2000, 5000, 10000].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setRechargeAmount(amt)}
                          className={`py-3 rounded-lg border text-center font-medium transition-all ${
                            rechargeAmount == amt
                              ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                              : 'border-gray-200 text-gray-600 hover:border-blue-200'
                          }`}
                        >
                          ¥{amt}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">自定义金额</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">¥</span>
                      <input
                        type="number"
                        value={rechargeAmount}
                        onChange={(e) => setRechargeAmount(e.target.value)}
                        placeholder="请输入充值金额"
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold text-lg"
                      />
                    </div>
                  </div>

                  <button
                    onClick={createRechargeOrder}
                    disabled={isRechargeLoading}
                    className="w-full py-3.5 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 disabled:opacity-50 shadow-md"
                  >
                    {isRechargeLoading ? '创建中...' : '立即充值'}
                  </button>
                  
                  <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded text-blue-800 leading-relaxed">
                    <p>• 请确保转账金额与订单金额一致。</p>
                    <p>• 订单生成后请在15分钟内完成支付。</p>
                  </div>
                </div>
              ) : (
                // 支付倒计时页面
                <div className="space-y-6 text-center">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-2">剩余支付时间</div>
                    <div className="text-4xl font-mono font-bold text-blue-600 tracking-wider">
                      {formatTime(timeLeft)}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 text-left space-y-3">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                      <span className="text-gray-500 text-sm">收款账号</span>
                      <span className="font-mono font-bold text-gray-900 text-lg">18679012034</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                      <span className="text-gray-500 text-sm">收款方式</span>
                      <span className="text-gray-900 font-medium">支付宝</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-gray-500 text-sm">需转账金额</span>
                      <span className="text-2xl font-bold text-red-600">¥{currentDepositOrder.amount}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={confirmPayment} className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-sm">
                      我已支付
                    </button>
                    <button onClick={() => { setCurrentDepositOrder(null); setRechargeAmount(''); setIsRechargeModalOpen(false); }} className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300">
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= 模态框：提现操作 (仿Dashboard UI) ================= */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">申请提现</h3>
              <button onClick={() => setIsWithdrawModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">提现金额</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">¥</span>
                    <input
                      type="number"
                      step="0.01"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="请输入提现金额"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-right">可提现余额: ¥{user?.balance?.toFixed(2) || '0.00'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">收款人姓名</label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="请输入开户人姓名"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">银行名称</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="例如：中国工商银行"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">银行卡号</label>
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="请输入银行卡号"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isWithdrawLoading}
                  className="w-full py-3.5 bg-blue-600 text-white rounded-lg font-bold text-lg hover:bg-blue-700 disabled:opacity-50 shadow-md mt-2"
                >
                  {isWithdrawLoading ? '提交中...' : '确认提现'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
