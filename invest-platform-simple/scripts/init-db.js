// scripts/init-db.js
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function initDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 连接到新数据库成功');

    // 定义 Schema (独立于 models.js，避免缓存问题)
    const UserSchema = new mongoose.Schema({
      username: String,
      password: String,
      email: String,
      role: String,
      isVerified: Boolean,
      phone: String,
      balance: Number,
    });
    const User = mongoose.model('User', UserSchema);

    const targetAccount = '18679012034';

    // 检查是否存在
    const user = await User.findOne({ 
      $or: [
        { username: targetAccount },
        { phone: targetAccount }
      ]
    });

    if (user) {
      console.log(`ℹ️  账号 ${targetAccount} 已存在，升级权限...`);
      user.role = 'superadmin';
      user.isVerified = true;
      await user.save();
      console.log('✅ 账号已升级为超级管理员');
    } else {
      // 创建新的
      const hashedPassword = await bcrypt.hash('628727', 10);
      const superAdmin = await User.create({
        username: targetAccount,
        password: hashedPassword,
        email: `${targetAccount}@chaowan.com`,
        phone: targetAccount,
        role: 'superadmin',
        isVerified: true,
        balance: 0,
      });

      console.log('==============================================');
      console.log('🎉 新集群初始化成功！');
      console.log('==============================================');
      console.log(`用户名: ${superAdmin.username}`);
      console.log(`手机号: ${superAdmin.phone}`);
      console.log(`密码: 628727`);
      console.log(`角色: ${superAdmin.role}`);
      console.log('==============================================');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    process.exit(1);
  }
}

initDB();
