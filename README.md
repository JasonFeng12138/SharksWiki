<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# SharksWiki

**自托管个人知识库系统，支持 Markdown 编辑、AI 辅助、多用户权限管理，一键 Docker 部署。**

[![Node.js](https://img.shields.io/badge/Node.js-20-green?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-orange?logo=mysql)](https://www.mysql.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue?logo=docker)](https://docs.docker.com/compose/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## ✨ 功能特性

- **Markdown 编辑**：支持 GFM（GitHub Flavored Markdown）、代码高亮、表格、任务列表
- **文档树管理**：树形目录结构，支持创建目录与文档、拖拽排序
- **AI 辅助写作**：集成 Google Generative AI，辅助内容生成与润色
- **多用户权限**：细粒度权限控制（创建目录、新增/编辑/删除文档、评论）
- **评论系统**：文档级评论，支持回复
- **文件上传**：支持图片等附件上传，自动服务静态资源
- **双语界面**：中文 / 英文切换
- **深色模式**：支持亮色 / 暗色主题
- **自托管**：所有数据存储在本地，无第三方依赖

---

## 🏗️ 技术栈

| 层次 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite 6 + Tailwind CSS v4 |
| 后端 | Node.js 20 + Express 4 + TypeScript 5（ESM） |
| 数据库 | MySQL 8.0 |
| 认证 | JWT + bcryptjs |
| AI | Google Generative AI (`@google/genai`) |
| 部署 | Docker + Docker Compose（数据库与应用分离） |

---

## 🚀 快速开始

### 前置条件
- Docker & Docker Compose v2.x

### 1. 克隆仓库

```bash
git clone https://github.com/JasonFeng12138/SharksWiki.git
cd SharksWiki
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`：

```dotenv
MYSQL_ROOT_PASSWORD=your_strong_root_password
MYSQL_PASSWORD=your_strong_wiki_password
JWT_SECRET=your_long_random_secret   # openssl rand -base64 48
APP_PORT=3001
```

### 3. 启动数据库（仅首次）

```bash
docker compose -f docker-compose.db.yml up -d
```

### 4. 启动应用

```bash
docker compose up -d --build
```

### 5. 访问

浏览器打开 **http://localhost:3001**

| 账号 | 密码 |
|------|------|
| admin | 123456 |

> **安全提示**：首次登录后请立即修改密码！

---

## 🔄 重新部署应用

数据库与应用服务**独立管理**，重新部署不会丢失任何数据：

```bash
# 仅重建应用，数据库持续运行
docker compose up -d --build --force-recreate
```

---

## 📁 项目结构

```
SharksWiki/
├── backend/                    # 后端服务（Express + TypeScript）
│   └── src/
│       ├── index.ts            # 应用入口
│       ├── config/database.ts  # MySQL 连接池
│       ├── middleware/auth.ts  # JWT 鉴权 & 权限中间件
│       ├── routes/             # 路由（auth / users / documents / comments / config）
│       └── types/index.ts      # 共享类型定义
├── frontend/                   # 前端（React + Vite）
│   └── src/
│       ├── App.tsx             # 根组件（编辑器、文档树、评论）
│       ├── services/api.ts     # 所有 API 调用封装
│       └── lib/utils.ts        # 工具函数
├── docker-compose.db.yml       # 数据库服务（独立生命周期）
├── docker-compose.yml          # 应用服务
├── Dockerfile                  # 多阶段构建
├── database_init.sql           # 数据库初始化脚本
└── .env.example                # 环境变量模板
```

---

## 🔑 权限说明

每个用户可独立配置以下权限：

| 权限 | 说明 |
|------|------|
| `can_create_dir` | 创建目录 |
| `can_add_file` | 新增文档 |
| `can_edit_file` | 编辑文档 |
| `can_delete_file` | 删除文档 |
| `can_comment` | 发表评论 |

---

## 🛠️ 本地开发

```bash
# 启动后端（热重载）
cd backend && npm install && npm run dev

# 启动前端（另开终端）
cd frontend && npm install && npm run dev
```

> 前端开发服务器运行在 `http://localhost:3000`，API 请求代理到 `http://localhost:3001`。
> 详细步骤见 [DEPLOYMENT.md](DEPLOYMENT.md)。

---

## 📖 文档

- [部署指南](DEPLOYMENT.md) — Docker 部署、本地开发、数据库说明
- [API 文档](API_DOCS.md) — 完整接口列表与请求/响应格式
- [AGENT.md](AGENT.md) — AI Agent 项目规范（代码风格、安全约定）

---

## 📄 License

[MIT](LICENSE)
