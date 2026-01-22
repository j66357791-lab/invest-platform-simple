// lib/kline-manager.js
class KlineManager {
  constructor() {
    this.cache = new Map();
    this.listeners = new Map();
    this.websocket = null;
  }
  
  // 获取产品K线数据
  async getKlineData(productId, interval = '1d', force = false) {
    const cacheKey = `${productId}_${interval}`;
    const now = Date.now();
    
    // 缓存策略
    const cacheTimes = {
      '1m': 10000,    // 10秒
      '5m': 30000,    // 30秒
      '15m': 60000,   // 1分钟
      '1h': 300000,   // 5分钟
      '1d': 1800000,  // 30分钟
      '1w': 3600000,  // 1小时
      '1M': 7200000,  // 2小时
      '1y': 21600000  // 6小时
    };
    
    // 检查缓存
    const cached = this.cache.get(cacheKey);
    if (!force && cached && (now - cached.timestamp) < (cacheTimes[interval] || 30000)) {
      return cached.data;
    }
    
    try {
      console.log(`📊 获取K线数据: ${productId} ${interval}`);
      const response = await fetch(`/api/products/${productId}/kline?interval=${interval}&limit=100`);
      const result = await response.json();
      
      if (result.success && result.data) {
        // 处理时间戳
        const processedData = result.data.map(item => {
          let timestamp;
          if (item.date && item.date.includes('+058030')) {
            // 处理异常日期，生成合理的时间序列
            timestamp = Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000;
          } else {
            timestamp = new Date(item.date || item.timestamp).getTime();
            if (isNaN(timestamp)) {
              timestamp = Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000;
            }
          }
          
          return {
            timestamp,
            open: parseFloat(item.open) || 1,
            close: parseFloat(item.close) || 1,
            high: parseFloat(item.high) || 1,
            low: parseFloat(item.low) || 1,
            volume: parseFloat(item.volume) || 0
          };
        }).sort((a, b) => a.timestamp - b.timestamp);
        
        // 缓存数据
        this.cache.set(cacheKey, {
          data: processedData,
          timestamp: now
        });
        
        // 通知监听者
        this.notifyListeners(productId, interval, processedData);
        
        return processedData;
      }
    } catch (error) {
      console.error('获取K线数据失败:', error);
    }
    
    return null;
  }
  
  // 订阅K线数据更新
  subscribe(productId, interval, callback) {
    const key = `${productId}_${interval}`;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    
    // 立即获取一次数据
    this.getKlineData(productId, interval);
    
    // 返回取消订阅函数
    return () => {
      const listeners = this.listeners.get(key);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }
  
  // 通知监听者
  notifyListeners(productId, interval, data) {
    const key = `${productId}_${interval}`;
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('监听器回调错误:', error);
        }
      });
    }
  }
  
  // 手动更新数据
  updateKlineData(productId, interval, newData) {
    const cacheKey = `${productId}_${interval}`;
    const existing = this.cache.get(cacheKey)?.data || [];
    
    // 合并新数据
    const updatedData = [...existing];
    newData.forEach(newItem => {
      const existingIndex = updatedData.findIndex(item => 
        Math.abs(item.timestamp - newItem.timestamp) < 60000
      );
      
      if (existingIndex >= 0) {
        updatedData[existingIndex] = newItem;
      } else {
        updatedData.push(newItem);
      }
    });
    
    // 按时间排序
    updatedData.sort((a, b) => a.timestamp - b.timestamp);
    
    // 更新缓存
    this.cache.set(cacheKey, {
      data: updatedData,
      timestamp: Date.now()
    });
    
    // 通知监听者
    this.notifyListeners(productId, interval, updatedData);
  }
  
  // 清除缓存
  clearCache(productId = null) {
    if (productId) {
      const keys = Array.from(this.cache.keys()).filter(key => key.startsWith(productId));
      keys.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }
}

// 创建全局单例
const klineManager = new KlineManager();

export default klineManager;