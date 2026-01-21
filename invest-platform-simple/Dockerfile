# 1. 使用官方 Node.js 镜像 (18版本)
FROM node:18-alpine

# 2. 设置工作目录
WORKDIR /app

# 3. 先复制依赖描述文件 (利用 Docker 缓存)
COPY package.json package-lock.json* ./

# 4. 安装依赖
RUN npm install

# 5. 复制其余代码
COPY . .

# 6. 构建Next.js项目
RUN npm run build

# 7. 设置端口环境变量 (配合你的 package.json)
ENV PORT=8080

# 8. 暴露端口
EXPOSE 8080

# 9. 启动命令 (执行 package.json 里的 start)
CMD ["npm", "run", "start"]
