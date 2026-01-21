// lib/utils.js
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ============================================================================
// 类名合并
// ============================================================================

/**
 * 合并 Tailwind CSS 类名
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ============================================================================
// 数字格式化
// ============================================================================

/**
 * 格式化数字，保留指定小数位
 * @param {number} num - 数字
 * @param {number} decimals - 小数位数
 * @returns {string}
 */
export function formatNumber(num, decimals = 2) {
  if (num === null || num === undefined || isNaN(num)) return '0.00';
  return Number(num).toFixed(decimals);
}

/**
 * 格式化货币
 * @param {number} num - 金额
 * @param {string} currency - 货币符号
 * @returns {string}
 */
export function formatCurrency(num, currency = '¥') {
  return `${currency}${formatNumber(num)}`;
}

/**
 * 格式化百分比
 * @param {number} num - 百分比值
 * @param {boolean} withSign - 是否带正负号
 * @returns {string}
 */
export function formatPercent(num, withSign = true) {
  const sign = (withSign && num > 0) ? '+' : '';
  return `${sign}${formatNumber(num)}%`;
}

// ============================================================================
// 日期时间格式化
// ============================================================================

/**
 * 格式化日期时间
 * @param {Date|string} date - 日期
 * @returns {string}
 */
export function formatDateTime(date) {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * 格式化日期
 * @param {Date|string} date - 日期
 * @returns {string}
 */
export function formatDate(date) {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * 获取日期范围
 * @param {string} period - day/week/month/year
 * @returns {{start: Date, end: Date}}
 */
export function getDateRange(period) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  
  let start;
  switch (period) {
    case 'day':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      break;
    case 'week':
      const dayOfWeek = now.getDay() || 7; // 周日为0，改为7
      start = new Date(now);
      start.setDate(now.getDate() - dayOfWeek + 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;
    default:
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
  
  return { start, end };
}

// ============================================================================
// 计算相关
// ============================================================================

/**
 * 计算涨跌幅
 * @param {number} current - 当前值
 * @param {number} previous - 前值
 * @returns {number}
 */
export function calculateChange(current, previous) {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/**
 * 计算止盈/止损价格
 * @param {number} costPrice - 成本价
 * @param {number} rate - 比例（如 10 表示 10%）
 * @param {string} type - profit/loss
 * @returns {number}
 */
export function calculateStopPrice(costPrice, rate, type) {
  if (type === 'profit') {
    return costPrice * (1 + rate / 100);
  } else {
    return costPrice * (1 - rate / 100);
  }
}

/**
 * 计算收益
 * @param {number} quantity - 数量
 * @param {number} currentPrice - 当前价
 * @param {number} avgPrice - 成本价
 * @returns {{profit: number, profitRate: number}}
 */
export function calculateProfit(quantity, currentPrice, avgPrice) {
  const profit = quantity * (currentPrice - avgPrice);
  const profitRate = avgPrice > 0 ? (currentPrice - avgPrice) / avgPrice * 100 : 0;
  return { profit, profitRate };
}

// ============================================================================
// 颜色样式
// ============================================================================

/**
 * 根据数值获取颜色类名
 * @param {number} value - 数值
 * @param {string} type - percent/normal
 * @returns {string}
 */
export function getColorByValue(value, type = 'percent') {
  if (value > 0) return 'text-red-500'; // 涨 - 红色
  if (value < 0) return 'text-green-500'; // 跌 - 绿色
  return 'text-gray-500';
}

/**
 * 根据数值获取背景色类名
 * @param {number} value - 数值
 * @returns {string}
 */
export function getBgColorByValue(value) {
  if (value > 0) return 'bg-red-50 text-red-600';
  if (value < 0) return 'bg-green-50 text-green-600';
  return 'bg-gray-50 text-gray-600';
}

// ============================================================================
// 生成器
// ============================================================================

/**
 * 生成随机邀请码
 * @param {number} length - 长度
 * @returns {string}
 */
export function generateInviteCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 生成订单号
 * @param {string} prefix - 前缀
 * @returns {string}
 */
export function generateOrderNo(prefix = 'ORD') {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

/**
 * 生成流水号
 * @returns {string}
 */
export function generateTxNo() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `TX${timestamp}${random}`;
}

// ============================================================================
// 验证器
// ============================================================================

/**
 * 验证手机号
 * @param {string} phone - 手机号
 * @returns {boolean}
 */
export function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone);
}

/**
 * 验证邮箱
 * @param {string} email - 邮箱
 * @returns {boolean}
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * 验证身份证号
 * @param {string} idCard - 身份证号
 * @returns {boolean}
 */
export function isValidIdCard(idCard) {
  // 简单验证，实际应根据国标GB11643-1999
  return /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/.test(idCard);
}

// ============================================================================
// 分页处理
// ============================================================================

/**
 * 解析分页参数
 * @param {URLSearchParams} searchParams - URL 搜索参数
 * @returns {{page: number, pageSize: number, skip: number}}
 */
export function parsePagination(searchParams) {
  const page = parseInt(searchParams.get('page')) || 1;
  const pageSize = parseInt(searchParams.get('pageSize')) || 20;
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip };
}

/**
 * 构建分页响应
 * @param {Array} data - 数据列表
 * @param {number} total - 总数
 * @param {number} page - 当前页
 * @param {number} pageSize - 每页数量
 * @returns {Object}
 */
export function buildPaginationResponse(data, total, page, pageSize) {
  const totalPages = Math.ceil(total / pageSize);
  return {
    data,
    pagination: {
      total,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

// ============================================================================
// API 响应构建器
// ============================================================================

/**
 * 构建成功响应
 * @param {*} data - 响应数据
 * @param {string} message - 提示信息
 * @param {number} status - HTTP 状态码
 * @returns {Response}
 */
export function successResponse(data = null, message = '操作成功', status = 200) {
  return new Response(JSON.stringify({ success: true, data, message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * 构建错误响应
 * @param {string} message - 错误信息
 * @param {number} status - HTTP 状态码
 * @param {Object} errors - 详细错误对象
 * @returns {Response}
 */
export function errorResponse(message = '操作失败', status = 400, errors = null) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ============================================================================
// 环境检测
// ============================================================================

/**
 * 检查是否为生产环境
 * @returns {boolean}
 */
export function isProduction() {
  return process.env.NODE_ENV === 'production';
}

/**
 * 检查是否为开发环境
 * @returns {boolean}
 */
export function isDevelopment() {
  return process.env.NODE_ENV === 'development';
}

/**
 * 获取 API 基础 URL
 * @returns {string}
 */
export function getApiBaseUrl() {
  if (isProduction()) {
    return process.env.API_BASE_URL || 'https://your-domain.com';
  }
  return 'http://localhost:3000';
}
