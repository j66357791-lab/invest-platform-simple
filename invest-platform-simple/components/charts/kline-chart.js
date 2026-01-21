// components/charts/stock-kline-chart.js
'use client';

import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

const StockKLineChart = ({ data = [], period = 'day', height = '450px' }) => {
  // 计算移动平均线
  const calculateMA = (dayCount, rawData) => {
    var result = [];
    for (var i = 0, len = rawData.length; i < len; i++) {
      if (i < dayCount) {
        result.push('-');
        continue;
      }
      var sum = 0;
      for (var j = 0; j < dayCount; j++) {
        sum += rawData[i][1]; // open
      }
      result.push((sum / dayCount).toFixed(2));
    }
    return result;
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center bg-white border border-gray-100 rounded-lg" style={{ height }}>
        <p className="text-gray-400 text-sm">暂无 K 线数据</p>
      </div>
    );
  }

  // ========================================
  // 🔑 核心修复：数据清洗与排序
  // ========================================
  const validData = data.filter(item => {
    const timestamp = new Date(item.date).getTime();
    const hasPrice = item.open && item.close && item.high && item.low;
    return !isNaN(timestamp) && hasPrice;
  });

  if (validData.length === 0) {
    return (
      <div className="flex items-center justify-center bg-white border border-gray-100 rounded-lg" style={{ height }}>
        <p className="text-red-400 text-sm">数据格式错误，无法显示</p>
      </div>
    );
  }

  // 按时间正序排序
  validData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const dates = [];
  const values = [];
  const volumes = [];
  
  const hasVolume = validData.length > 0 && validData[0].volume !== undefined;

  validData.forEach(item => {
    const timestamp = new Date(item.date).getTime();
    dates.push(timestamp);
    
    // ECharts K线数据格式: [open, close, low, high]
    values.push([item.open, item.close, item.low, item.high]);
    
    // 成交量数据: [timestamp, volume, open, close]
    volumes.push([
      timestamp,
      hasVolume ? item.volume : 0,
      item.open,
      item.close
    ]);
  });

  const dataMA5 = calculateMA(5, values);
  const dataMA10 = calculateMA(10, values);

  // 🔑 动态时间格式化：根据周期决定显示格式
  const getXAxisFormatter = () => {
    // 如果是分钟级，显示 HH:mm
    if (['1m', '5m', '15m', '1h'].includes(period)) {
      return (val) => {
        const date = new Date(val);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      };
    } 
    // 如果是日级以上，显示 MM-dd
    return (val) => {
      const date = new Date(val);
      return `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    };
  };

  const option = {
    backgroundColor: '#fff',
    title: { text: '' },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#ccc',
      borderWidth: 1,
      textStyle: { color: '#333' },
      formatter: function (params) {
        if (!params || params.length === 0) return '';
        const kline = params.find(p => p.seriesName === '日K');
        const ma5 = params.find(p => p.seriesName === 'MA5');
        const ma10 = params.find(p => p.seriesName === 'MA10');
        const volume = params.find(p => p.seriesName === '成交量');
        
        // 根据周期调整日期显示
        const dateObj = new Date(kline.axisValue);
        let dateStr = '';
        if (['1m', '5m', '15m', '1h'].includes(period)) {
          dateStr = dateObj.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        } else {
          dateStr = dateObj.toLocaleDateString('zh-CN');
        }
        
        const color = kline.color;
        
        return `
          <div style="font-weight:bold; margin-bottom:4px; border-bottom:1px solid #eee; padding-bottom:4px;">${dateStr}</div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 0 10px; font-size:12px; line-height:1.8;">
            <div>开: <span style="color:${color}">${kline.data[0]}</span></div>
            <div>收: <span style="color:${color}">${kline.data[1]}</span></div>
            <div>低: <span style="color:${color}">${kline.data[2]}</span></div>
            <div>高: <span style="color:${color}">${kline.data[3]}</span></div>
            <div>MA5: <span style="color:#f39c12">${ma5 ? ma5.data : '-'}</span></div>
            <div>MA10: <span style="color:#2980b9">${ma10 ? ma10.data : '-'}</span></div>
            ${volume ? `<div style="grid-column: 1 / -1; margin-top:4px;">成交量: ${(volume.data[1] / 1000).toFixed(1)}k</div>` : ''}
          </div>
        `;
      }
    },
    axisPointer: { link: { xAxisIndex: 'all' }, label: { backgroundColor: '#777' } },
    grid: [
      { left: '8%', right: '8%', top: '10%', height: '55%' },
      { left: '8%', right: '8%', top: '70%', height: '12%' }
    ],
    xAxis: [
      {
        type: 'category',
        data: dates,
        scale: true,
        boundaryGap: false,
        axisLine: { onZero: false, lineStyle: { color: '#E5E7EB' } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          show: true, 
          color: '#666', 
          fontSize: 11,
          interval: 'auto',
          formatter: getXAxisFormatter()
        },
        min: 'dataMin',
        max: 'dataMax'
      },
      {
        type: 'category',
        gridIndex: 1,
        data: dates,
        scale: true,
        boundaryGap: false,
        axisLine: { onZero: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        min: 'dataMin',
        max: 'dataMax'
      }
    ],
    yAxis: [
      {
        scale: true,
        splitArea: {
          show: true,
          areaStyle: {
            color: ['rgba(246,246,246,0.8)', 'rgba(255,255,255,0.8)']
          }
        },
        axisLabel: { 
          color: '#666',
          formatter: function (value) { return value.toFixed(2); } 
        }
      },
      {
        scale: true,
        gridIndex: 1,
        splitNumber: 2,
        splitLine: { show: false },
        axisLabel: { show: false },
        axisLine: { show: false },
        axisTick: { show: false }
      }
    ],
    dataZoom: [
      { type: 'inside', xAxisIndex: [0, 1], start: 0, end: 100 },
      { show: true, xAxisIndex: [0, 1], type: 'slider', top: '88%', start: 0, end: 100, height: 20 }
    ],
    visualMap: {
      show: false,
      seriesIndex: 5,
      dimension: 2,
      pieces: [
        { value: 1, color: '#ef4444' },
        { value: -1, color: '#22c55e' }
      ]
    },
    series: [
      {
        name: '日K',
        type: 'candlestick',
        data: values,
        itemStyle: {
          color: '#ef4444',
          color0: '#22c55e',
          borderColor: '#ef4444',
          borderColor0: '#22c55e'
        }
      },
      {
        name: 'MA5',
        type: 'line',
        data: dataMA5,
        smooth: true,
        showSymbol: false,
        lineStyle: { opacity: 0.8, width: 2, color: '#f39c12' }
      },
      {
        name: 'MA10',
        type: 'line',
        data: dataMA10,
        smooth: true,
        showSymbol: false,
        lineStyle: { opacity: 0.8, width: 2, color: '#2980b9' }
      },
      {
        name: '成交量',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: volumes,
        itemStyle: {
          color: function (params) {
            return params.data[2] > params.data[3] ? '#ef4444' : '#22c55e';
          }
        },
        barMaxWidth: 15,
        barCategoryGap: '20%'
      }
    ]
  };

  return (
    <div className="w-full border border-gray-100 rounded-lg shadow-sm bg-white overflow-hidden">
      <ReactECharts 
        option={option} 
        style={{ height }} 
        opts={{ renderer: 'canvas' }}
        notMerge={true} 
        lazyUpdate={true}
      />
    </div>
  );
};

export default StockKLineChart;
