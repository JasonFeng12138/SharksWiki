# SharksWiki 部署与初始化指南

本文档包含数据库初始化、本地开发启动以及 Docker 一键部署的完整步骤。

---

## 目录结构

```
SharksWiki/
├── frontend/          # React 前端（Vite + TypeScript）
├── backend/           # Node.js 后端（Express + MySQL）
├── database_init.sql  # 数据库初始化脚本
├── Dockerfile         # 多阶段构建（前端 + 后端合并镜像）
├── docker-compose.yml # Docker 一键编排文件
└── .env.example       # Docker 环境变量示例
```

---

## 方式一：Docker 一键部署（推荐）

### 前置条件
- 已安装 [Docker](https://docs.docker.com/get-docker/) 和 [Docker Compose](https://docs.docker.com/compose/install/)（v2.x）

### 步骤

**1. 配置环境变量**

```bash
cp .env.example .env
```

编辑 `.env`，设置安全的密码和 JWT 密钥：

```dotenv
MYSQL_ROOT_PASSWORD=your_strong_root_password
MYSQL_PASSWORD=your_strong_wiki_password
JWT_SECRET=your_long_random_secret   # 推荐：openssl rand -base64 48
APP_PORT=3001
```

**2. 一键构建并启动**

```bash
docker compose up -d --build
```

Docker 会自动完成：
- 构建前端 React 项目
- 编译后端 TypeScript
- 启动 MySQL 8.0 并执行数据库初始化脚本
- 启动应用服务，托管前端静态文件与后端 API

**3. 访问应用**

浏览器打开 `http://localhost:3001`

默认管理员账号：
| 账号 | 密码 |
|------|------|
| admin | 123456 |

> **安全提示**：首次登录后请立即修改密码。初始密码在数据库中以 MD5 格式存储，后端在首次登录时会自动升级为 bcrypt 格式。

**4. 常用 Docker 命令**

```bash
# 查看运行状态
docker compose ps

# 查看日志
docker compose logs -f app
docker compose logs -f mysql

# 停止服务
docker compose down

# 停止并清除所有数据（危险！）
docker compose down -v
```

---

## 方式二：本地手动部署

### 前置条件
- Node.js v18+
- MySQL 8.0+

### 1. 数据库安装与初始化

**安装 MySQL：**
- **macOS**：`brew install mysql && brew services start mysql`
- **Linux (Ubuntu/Debian)**：`sudo apt update && sudo apt install mysql-server`
- **Windows**：前往 [MySQL 官网](https://dev.mysql.com/downloads/installer/) 下载安装

**创建数据库：**

```bash
mysql -u root -p < database_init.sql
```

或在 MySQL 命令行中：

```sql
source /your/project/path/database_init.sql;
```

**（可选）创建专用数据库用户：**

```sql
CREATE USER 'wiki_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON personal_wiki.* TO 'wiki_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. 启动后端

```bash
cd backend
cp .env.example .env
# 编辑 .env，填写数据库连接信息和 JWT_SECRET
npm install
npm run dev      # 开发模式（支持热重载）
# 或
npm run build && npm run start   # 生产模式
```

后端默认运行在 `http://localhost:3001`。

### 3. 启动前端（开发模式）

为使前端请求能代理到后端，需先在 `frontend/vite.config.ts` 的 `server` 配置中添加代理：

```ts
server: {
  hmr: process.env.DISABLE_HMR !== 'true',
  proxy: {
    '/api': 'http://localhost:3001',
  },
},
```

然后启动前端开发服务器：

```bash
cd frontend
npm install
npm run dev
```

访问 `http://localhost:5173` 进行开发预览。

### 4. 生产模式构建

```bash
# 构建前端
cd frontend && npm run build

# 在后端 .env 中设置
# NODE_ENV=production
# FRONTEND_DIST=../frontend/dist

# 启动后端（同时托管前端静态文件）
cd backend && npm run start
```

访问 `http://localhost:3001`。

---

## 数据库表结构说明

| 表名 | 说明 |
|------|------|
| `permission_groups` | 权限组（创建目录、新增/删除/编辑文件、评论等权限） |
| `users` | 用户表（账号、bcrypt 密码、显示名称） |
| `user_permissions` | 用户与权限组的多对多关联 |
| `file_nodes` | 目录与文件元数据（树形结构，物理文件存于 `docs/` 目录） |
| `comments` | 文件评论（支持回复） |

---

## 环境变量说明（backend/.env）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3001` | 后端监听端口 |
| `NODE_ENV` | `development` | 运行环境 |
| `DB_HOST` | `localhost` | MySQL 主机 |
| `DB_PORT` | `3306` | MySQL 端口 |
| `DB_USER` | `root` | 数据库用户名 |
| `DB_PASSWORD` | *(空)* | 数据库密码 |
| `DB_NAME` | `personal_wiki` | 数据库名 |
| `JWT_SECRET` | *(需修改)* | JWT 签名密钥，生产环境必须设置为随机长字符串 |
| `JWT_EXPIRES_IN` | `7d` | Token 有效期 |
| `DOCS_DIR` | `./docs` | Markdown 文件存储目录 |
| `CONFIG_DIR` | `./config` | Wiki 配置及上传文件目录 |
| `FRONTEND_DIST` | `../frontend/dist` | 生产模式前端静态文件目录 |
