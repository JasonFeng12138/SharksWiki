# 个人 Wiki 部署与初始化指南

本文档包含数据库的安装、新建、初始化脚本，以及应用的本地部署步骤。

## 1. 数据库安装与初始化

本项目使用 MySQL 数据库来存储用户、权限、文件结构及评论信息。

### 1.1 安装 MySQL
- **Windows**: 前往 [MySQL 官网](https://dev.mysql.com/downloads/installer/) 下载安装程序并按提示安装。
- **macOS**: 使用 Homebrew 安装：`brew install mysql`，然后启动服务 `brew services start mysql`。
- **Linux (Ubuntu/Debian)**: 运行 `sudo apt update && sudo apt install mysql-server`。

### 1.2 创建数据库与表结构
1. 登录 MySQL 控制台：
   ```bash
   mysql -u root -p
   ```
2. 执行项目根目录下的 `database_init.sql` 脚本：
   ```bash
   mysql -u root -p < database_init.sql
   ```
   *或者在 MySQL 命令行中执行：*
   ```sql
   source /你的项目路径/database_init.sql;
   ```

### 1.3 数据库配置说明
初始脚本会自动创建名为 `personal_wiki` 的数据库，并包含以下表：
- `permission_groups`: 权限组表（记录创建、新增、删除、编辑、评论等权限）
- `users`: 人员表（记录账号、密码、匿名名称等，默认包含一个 admin 账号）
- `user_permissions`: 人员权限关联表（人员与权限组的映射）
- `file_nodes`: 目录与文件信息表（记录文件标题、路径、创建人、修改人等）
- `comments`: 评论表（记录评论内容、评论人、回复目标等）

---

## 2. 应用初始化与部署

### 2.1 环境准备
- 确保已安装 **Node.js** (推荐 v18 或更高版本)。
- 确保已安装包管理工具 (npm 或 yarn)。

### 2.2 安装依赖
在项目根目录下，打开终端并运行：
```bash
npm install
```

### 2.3 启动应用

**开发模式（支持热更新）：**
```bash
npm run dev
```
启动后，访问 `http://localhost:3000` 即可预览应用。

**生产模式部署：**
1. 构建前端静态资源：
   ```bash
   npm run build
   ```
2. 启动生产环境服务器：
   ```bash
   npm run start
   ```
   生产环境下，Express 会直接提供 `dist` 目录下的静态文件，并运行在 3000 端口。

### 2.4 目录结构说明
- `docs/`: 存放实际的 Markdown 文件，应用启动时会自动创建。
- `src/`: 前端 React 源码。
- `server.ts`: 后端 Express 服务入口。
- `database_init.sql`: 数据库初始化脚本。
- `DEPLOYMENT.md`: 部署说明文档。

---

## 3. 后续扩展说明
目前的 Wiki 系统采用的是本地文件系统直接读写。为了接入刚刚创建的 MySQL 数据库，您后续需要在 `server.ts` 中引入数据库驱动（如 `mysql2` 或 `prisma`），将文件的新增、修改、删除操作与 `file_nodes` 表同步，并开发登录鉴权及评论相关的 API 接口。
