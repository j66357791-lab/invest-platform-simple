// components/charts/simple-kline-chart.js
import { useEffect, useRef, memo } from 'react';

const SimpleKLineChart = memo(function SimpleKLineChart({ 
  data, 
  period, 
  height = 400,
  loading = false
}) {
  const containerRef = useRef(null);
  
  // 格式化时间显示
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    // 防止无效日期
    if (isNaN(date.getTime())) return '';
    
    if (period === '1d' || period === '1w' || period === '1M' || period === '1y') {
      return date.toLocaleDateString('zh-CN');
    }
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  // 绘制K线图
  const drawChart = () => {
    if (!containerRef.current || !data || data.length === 0) return;
    
    const container = containerRef.current;
    const ctx = container.getContext('2d');
    if (!ctx) return; // 防止获取上下文失败

    try {
      // 清除画布
      ctx.clearRect(0, 0, container.width, container.height);
      
      // 🔧 修复：安全计算价格范围，过滤掉 undefined/null
      const validPrices = data
        .flatMap(d => [d.low, d.high, d.open, d.close])
        .filter(p => typeof p === 'number' && !isNaN(p));

      if (validPrices.length === 0) return;

      const minPrice = Math.min(...validPrices);
      const maxPrice = Math.max(...validPrices);
      const priceRange = maxPrice - minPrice || 0.01; // 🔧 防止除以0
      
      // 设置边距
      const padding = {
        top: 10,
        right: 10,
        bottom: 20,
        left: 40
      };
      
      const chartWidth = container.width - padding.left - padding.right;
      const chartHeight = container.height - padding.top - padding.bottom;
      
      // 绘制网格
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 0.5;
      
      // 横向网格线
      const gridLines = 3;
      for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (chartHeight * i / gridLines);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();
        
        // 价格标签
        const price = maxPrice - (priceRange * i / gridLines);
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(price.toFixed(2), padding.left - 5, y + 3);
      }
      
      // 绘制K线
      const barWidth = Math.max(2, chartWidth / data.length * 0.6);
      const barSpacing = chartWidth / data.length;
      
      data.forEach((item, index) => {
        // 🔧 安全检查
        if (!item || typeof item.open !== 'number') return;

        const x = padding.left + (index * barSpacing) + barSpacing / 2;
        
        // 计算Y坐标
        const priceToY = (price) => {
          return padding.top + chartHeight * (1 - (price - minPrice) / priceRange);
        };
        
        const openY = priceToY(item.open);
        const closeY = priceToY(item.close);
        const highY = priceToY(item.high);
        const lowY = priceToY(item.low);
        
        // 判断涨跌
        const isUp = item.close >= item.open;
        const color = isUp ? '#ef4444' : '#10b981'; // 红涨绿跌
        
        // 绘制实体
        ctx.fillStyle = color;
        const barHeight = Math.max(1, Math.abs(closeY - openY));
        ctx.fillRect(
          x - barWidth / 2,
          Math.min(openY, closeY),
          barWidth,
          barHeight
        );
        
        // 绘制影线
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, Math.min(openY, closeY));
        ctx.moveTo(x, Math.max(openY, closeY));
        ctx.lineTo(x, lowY);
        ctx.stroke();
      });
    } catch (error) {
      console.error('K线绘制错误:', error);
    }
  };
  
  // 初始化图表
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    // 设置 Canvas 尺寸
    container.width = container.clientWidth;
    container.height = height;
    
    if (data && data.length > 0) {
      // 延迟一帧绘制，确保 DOM 已就绪
      requestAnimationFrame(drawChart);
    }
    
    // 窗口大小变化时重绘
    const handleResize = () => {
      if (containerRef.current) {
        containerRef.current.width = containerRef.current.clientWidth;
        requestAnimationFrame(drawChart);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data, period, height]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center bg-gray-50" style={{ height }}>
        <div className="text-center text-gray-400 text-xs">加载中...</div>
      </div>
    );
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center bg-gray-50" style={{ height }}>
        <div className="text-center text-gray-400 text-xs">暂无数据</div>
      </div>
    );
  }
  
  return (
    <div className="relative w-full h-full">
      <canvas
        ref={containerRef}
        className="w-full"
        style={{ height: `${height}px` }}
      />
    </div>
  );
});

export default SimpleKLineChart;
