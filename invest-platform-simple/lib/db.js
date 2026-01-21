// lib/db.js
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('请在 .env.local 文件中配置 MONGODB_URI');
}

/**
 * 全局变量用于缓存数据库连接
 * 在开发环境中，Next.js 的热重载会导致多次调用 connectDB
 * 使用 cached 可以确保只创建一次连接
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * 连接 MongoDB 数据库
 * 单例模式，确保整个应用只有一个数据库连接实例
 */
async function connectDB() {
  // 如果已连接，直接返回
  if (cached.conn) {
    return cached.conn;
  }

  // 如果没有正在进行的连接，创建新连接
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,          // 连接池最大连接数 (防止高并发排队)
      minPoolSize: 2,           // 连接池最小连接数 (保持活跃)
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,        // 启用重试写入 (生产环境推荐)
      w: 'majority',            // 写入确认级别
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('✅ MongoDB 连接成功');
      console.log(`📦 Database: ${mongoose.connection.name}`);
      console.log(`📍 Host: ${mongoose.connection.host}`);
      return mongoose;
    }).catch((error) => {
      console.error('❌ MongoDB 连接失败:', error.message);
      cached.promise = null; // 失败时重置 promise，允许重试
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

/**
 * 断开连接 (主要用于测试环境或脚本执行完毕后)
 */
async function disconnectDB() {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.log('🔌 MongoDB 连接已关闭');
  }
}

// 导出 mongoose 实例 (方便定义 Schema: import mongoose from '@/lib/db')
export default mongoose;

// 导出函数
export { connectDB, disconnectDB };
