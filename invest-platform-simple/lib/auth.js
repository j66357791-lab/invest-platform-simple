// lib/auth.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * 生成邀请码
 * @returns {string} 6位随机邀请码
 */
export function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 生成订单号
 * @returns {string} 订单号格式: ORD + 时间戳 + 4位随机数
 */
export function generateOrderNo() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD${timestamp}${random}`;
}

/**
 * 生成交易流水号
 * @returns {string} 流水号格式: TXN + 时间戳 + 4位随机数
 */
export function generateTxNo() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TXN${timestamp}${random}`;
}

/**
 * 加密密码
 * @param {string} password - 原始密码
 * @returns {Promise<string>} 加密后的密码
 */
export async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

/**
 * 验证密码
 * @param {string} password - 原始密码
 * @param {string} hashedPassword - 加密后的密码
 * @returns {Promise<boolean>} 是否匹配
 */
export async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

/**
 * 生成 JWT Token
 * @param {Object} payload - Token 载荷
 * @returns {string} JWT Token
 */
export function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

/**
 * 验证 JWT Token
 * @param {string} token - JWT Token
 * @returns {Object|null} 解码后的载荷，验证失败返回 null
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * 格式化金额
 * @param {number} amount - 金额
 * @param {number} decimals - 小数位数，默认2位
 * @returns {string} 格式化后的金额
 */
export function formatAmount(amount, decimals = 2) {
  if (amount === null || amount === undefined) {
    return '0.00';
  }
  return Number(amount).toFixed(decimals);
}

/**
 * 计算百分比
 * @param {number} current - 当前值
 * @param {number} previous - 之前值
 * @returns {number} 百分比
 */
export function calculateChangePercent(current, previous) {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/**
 * 验证手机号
 * @param {string} phone - 手机号
 * @returns {boolean} 是否有效
 */
export function isValidPhone(phone) {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * 验证邮箱
 * @param {string} email - 邮箱
 * @returns {boolean} 是否有效
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证身份证号
 * @param {string} idCard - 身份证号
 * @returns {boolean} 是否有效
 */
export function isValidIdCard(idCard) {
  const idCardRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
  return idCardRegex.test(idCard);
}
