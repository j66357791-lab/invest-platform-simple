// app/api/products/[id]/kline/route.js
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Product } from '@/lib/models';

export async function GET(req, { params }) {
  try {
    await connectDB();
    const { id } = params; // 移除await
    
    // 解析查询参数
    const { searchParams } = new URL(req.url);
    const interval = searchParams.get('interval') || '1m';
    const limit = parseInt(searchParams.get('limit') || '100');

    // 获取产品数据
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ 
        success: false, 
        message: '产品不存在' 
      }, { status: 404 });
    }

    let klineData = [];
    
    // 修复时间戳函数
    const fixTimestamp = (timestamp) => {
      try {
        if (typeof timestamp === 'string') {
          // 处理异常日期格式
          if (timestamp.includes('+058030')) {
            const now = Date.now();
            // 生成最近30天内的随机时间戳
            return now - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000);
          }
          const date = new Date(timestamp);
          return isNaN(date.getTime()) ? Date.now() : date.getTime();
        }
        return timestamp || Date.now();
      } catch {
        return Date.now();
      }
    };

    // 根据周期选择数据源
    switch (interval) {
      case '1m':
        klineData = product.minuteKlineData || [];
        break;
      case '5m':
        klineData = aggregateKlineData(product.minuteKlineData || [], 5);
        break;
      case '15m':
        klineData = aggregateKlineData(product.minuteKlineData || [], 15);
        break;
      case '1h':
        klineData = aggregateKlineData(product.minuteKlineData || [], 60);
        break;
      case '1d':
        klineData = product.priceHistory || [];
        break;
      case '1w':
        // 周线：从日线数据聚合
        klineData = aggregateWeeklyData(product.priceHistory || []);
        break;
      case '1M':
        // 月线：从日线数据聚合
        klineData = aggregateMonthlyData(product.priceHistory || []);
        break;
      case '1y':
        // 年线：从日线数据聚合
        klineData = aggregateYearlyData(product.priceHistory || []);
        break;
      default:
        klineData = product.minuteKlineData || [];
    }

    // 如果数据为空，生成模拟数据
    if (!klineData || klineData.length === 0) {
      klineData = generateKlineData(
        product.currentPrice || 1,
        interval,
        limit
      );
    }

    // 格式化数据
    const formattedData = klineData
      .filter(item => item && (item.date || item.timestamp))
      .map(item => {
        const timestamp = fixTimestamp(item.date || item.timestamp);
        return {
          timestamp,
          date: new Date(timestamp).toISOString(),
          open: parseFloat(item.open) || product.currentPrice || 1,
          close: parseFloat(item.close) || product.currentPrice || 1,
          high: parseFloat(item.high) || product.currentPrice || 1,
          low: parseFloat(item.low) || product.currentPrice || 1,
          volume: parseFloat(item.volume) || 0
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-limit);

    return NextResponse.json({
      success: true,
      data: formattedData,
      product: {
        id: product._id,
        currentPrice: product.currentPrice || 0,
        closePrice: product.closePrice || 1,
        dailyChange: product.dailyChange || 0
      }
    });

  } catch (error) {
    console.error('[Kline API Error]', error);
    return NextResponse.json({ 
      success: false, 
      message: '获取K线失败',
      error: error.message 
    }, { status: 500 });
  }
}

// 生成K线数据
function generateKlineData(basePrice, interval, count = 100) {
  const data = [];
  const now = Date.now();
  
  // 时间间隔映射
  const intervalMap = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
    '1M': 30 * 24 * 60 * 60 * 1000,
    '1y': 365 * 24 * 60 * 60 * 1000
  };
  
  const intervalMs = intervalMap[interval] || intervalMap['1m'];
  let price = basePrice;
  
  for (let i = count; i >= 0; i--) {
    const timestamp = now - (i * intervalMs);
    
    // 随机波动
    const change = (Math.random() - 0.5) * 0.02;
    price = price * (1 + change);
    
    const open = price;
    const close = price * (1 + (Math.random() - 0.5) * 0.01);
    const high = Math.max(open, close) * (1 + Math.random() * 0.005);
    const low = Math.min(open, close) * (1 - Math.random() * 0.005);
    
    data.push({
      timestamp,
      date: new Date(timestamp).toISOString(),
      open: parseFloat(open.toFixed(4)),
      close: parseFloat(close.toFixed(4)),
      high: parseFloat(high.toFixed(4)),
      low: parseFloat(low.toFixed(4)),
      volume: Math.floor(Math.random() * 10000) + 1000
    });
  }
  
  return data;
}

// 聚合K线数据
function aggregateKlineData(minuteData, minutesPerBar) {
  if (!Array.isArray(minuteData) || minuteData.length === 0) {
    return [];
  }
  
  const aggregated = [];
  let currentBar = null;
  let count = 0;
  
  minuteData.forEach((item) => {
    const timestamp = new Date(item.date || item.timestamp).getTime();
    
    if (count % minutesPerBar === 0) {
      if (currentBar) {
        aggregated.push(currentBar);
      }
      
      currentBar = {
        timestamp,
        date: new Date(timestamp).toISOString(),
        open: parseFloat(item.open) || 0,
        high: parseFloat(item.high) || 0,
        low: parseFloat(item.low) || 0,
        close: parseFloat(item.close) || 0,
        volume: parseFloat(item.volume) || 0
      };
    } else {
      if (currentBar) {
        currentBar.high = Math.max(currentBar.high, parseFloat(item.high) || 0);
        currentBar.low = Math.min(currentBar.low, parseFloat(item.low) || 0);
        currentBar.close = parseFloat(item.close) || 0;
        currentBar.volume += parseFloat(item.volume) || 0;
      }
    }
    
    count++;
  });
  
  if (currentBar) {
    aggregated.push(currentBar);
  }
  
  return aggregated;
}

// 聚合周线数据
function aggregateWeeklyData(dailyData) {
  if (!Array.isArray(dailyData) || dailyData.length === 0) {
    return [];
  }
  
  const weeklyData = [];
  let currentWeek = null;
  
  dailyData.forEach((item) => {
    const date = new Date(item.date || item.timestamp);
    const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
    
    if (!currentWeek || currentWeek.weekStart.getTime() !== weekStart.getTime()) {
      if (currentWeek) {
        weeklyData.push(currentWeek);
      }
      
      currentWeek = {
        timestamp: weekStart.getTime(),
        date: weekStart.toISOString(),
        open: parseFloat(item.open) || 0,
        high: parseFloat(item.high) || 0,
        low: parseFloat(item.low) || 0,
        close: parseFloat(item.close) || 0,
        volume: parseFloat(item.volume) || 0
      };
    } else {
      if (currentWeek) {
        currentWeek.high = Math.max(currentWeek.high, parseFloat(item.high) || 0);
        currentWeek.low = Math.min(currentWeek.low, parseFloat(item.low) || 0);
        currentWeek.close = parseFloat(item.close) || 0;
        currentWeek.volume += parseFloat(item.volume) || 0;
      }
    }
  });
  
  if (currentWeek) {
    weeklyData.push(currentWeek);
  }
  
  return weeklyData;
}

// 聚合月线数据
function aggregateMonthlyData(dailyData) {
  if (!Array.isArray(dailyData) || dailyData.length === 0) {
    return [];
  }
  
  const monthlyData = [];
  let currentMonth = null;
  
  dailyData.forEach((item) => {
    const date = new Date(item.date || item.timestamp);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    
    if (!currentMonth || currentMonth.monthKey !== monthKey) {
      if (currentMonth) {
        monthlyData.push(currentMonth);
      }
      
      currentMonth = {
        monthKey,
        timestamp: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
        date: new Date(date.getFullYear(), date.getMonth(), 1).toISOString(),
        open: parseFloat(item.open) || 0,
        high: parseFloat(item.high) || 0,
        low: parseFloat(item.low) || 0,
        close: parseFloat(item.close) || 0,
        volume: parseFloat(item.volume) || 0
      };
    } else {
      if (currentMonth) {
        currentMonth.high = Math.max(currentMonth.high, parseFloat(item.high) || 0);
        currentMonth.low = Math.min(currentMonth.low, parseFloat(item.low) || 0);
        currentMonth.close = parseFloat(item.close) || 0;
        currentMonth.volume += parseFloat(item.volume) || 0;
      }
    }
  });
  
  if (currentMonth) {
    monthlyData.push(currentMonth);
  }
  
  return monthlyData;
}

// 聚合年线数据
function aggregateYearlyData(dailyData) {
  if (!Array.isArray(dailyData) || dailyData.length === 0) {
    return [];
  }
  
  const yearlyData = [];
  let currentYear = null;
  
  dailyData.forEach((item) => {
    const date = new Date(item.date || item.timestamp);
    const year = date.getFullYear();
    
    if (!currentYear || currentYear.year !== year) {
      if (currentYear) {
        yearlyData.push(currentYear);
      }
      
      currentYear = {
        year,
        timestamp: new Date(year, 0, 1).getTime(),
        date: new Date(year, 0, 1).toISOString(),
        open: parseFloat(item.open) || 0,
        high: parseFloat(item.high) || 0,
        low: parseFloat(item.low) || 0,
        close: parseFloat(item.close) || 0,
        volume: parseFloat(item.volume) || 0
      };
    } else {
      if (currentYear) {
        currentYear.high = Math.max(currentYear.high, parseFloat(item.high) || 0);
        currentYear.low = Math.min(currentYear.low, parseFloat(item.low) || 0);
        currentYear.close = parseFloat(item.close) || 0;
        currentYear.volume += parseFloat(item.volume) || 0;
      }
    }
  });
  
  if (currentYear) {
    yearlyData.push(currentYear);
  }
  
  return yearlyData;
}