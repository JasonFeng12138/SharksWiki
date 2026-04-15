# AGENT.md — SharksWiki

> 本文件供 AI Agent 快速了解项目规范，开始工作前请完整阅读。

---

## 项目概述

**SharksWiki** 是一个自托管的个人知识库（Wiki）系统，支持 Markdown 文档的创建、编辑、目录管理、评论及 AI 辅助功能。系统采用前后端分离架构，可通过 Docker Compose 一键部署。

---

## 技术栈

| 层次 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite 6 + Tailwind CSS v4 |
| 后端 | Node.js + Express 4 + TypeScript 5 (ESM) |
| 数据库 | MySQL 8.0 |
| 认证 | JWT (jsonwebtoken) + bcryptjs |
| AI 功能 | Google Generative AI (`@google/genai`) |
| 部署 | Docker + Docker Compose |
| 包管理器 | **npm** |

---

## 常用命令

### 后端 (`cd backend`)

```bash
npm install          # 安装依赖
npm run dev          # 开发模式（tsx watch，热重载）
npm run build        # 编译 TypeScript → dist/
npm start            # 运行编译产物
```

### 前端 (`cd frontend`)

```bash
npm install          # 安装依赖
npm run dev          # 开发模式（Vite + tsx server.ts）
npm run build        # 生产构建 → dist/
npm run preview      # 预览生产构建
npm run lint         # TypeScript 类型检查（tsc --noEmit）
npm run clean        # 清理 dist/
```

### Docker 部署

```bash
# 复制并填写环境变量
cp .env.example .env

# Step 1：启动数据库（仅首次执行，长期保持运行）
docker compose -f docker-compose.db.yml up -d

# Step 2：构建并启动应用
docker compose up -d --build

# 重新部署应用（不影响数据库）
docker compose up -d --build --force-recreate

# 查看日志
docker compose logs -f app
docker compose -f docker-compose.db.yml logs -f mysql
```

> ⚠️ **数据库与应用分离**：`docker-compose.db.yml` 管理 MySQL，`docker-compose.yml` 管理应用。
> 重新部署只需操作应用 Compose，数据库和数据不受任何影响。

---

## API 规范

- 所有接口以 `/api` 为前缀。
- 请求/响应使用 JSON，`Content-Type: application/json`。
- 鉴权接口需携带 `Authorization: Bearer <token>` 请求头。
- 错误响应格式：`{ "code": number, "message": string }`。
- 成功响应格式：直接返回数据对象或数组，无统一外层包装（保持与现有代码一致）。

### 路由总览

| 前缀 | 描述 |
|------|------|
| `/api/auth` | 登录、注册 |
| `/api/users` | 用户列表、权限管理 |
| `/api/documents` | 文档树、文档内容 CRUD |
| `/api/comments` | 文档评论 |
| `/api/config` | 站点名称/图标配置、文件上传 |
| `/api/uploads/*` | 上传文件静态访问 |
| `/health` | 健康检查 |

---

## 权限系统

用户拥有以下细粒度权限（均为 `boolean`），存储在 JWT payload 中：

| 字段 | 含义 |
|------|------|
| `can_create_dir` | 创建目录 |
| `can_add_file` | 新增文档 |
| `can_delete_file` | 删除文档 |
| `can_edit_file` | 编辑文档 |
| `can_comment` | 发表评论 |

**使用方式**：先使用 `authMiddleware`，再使用 `requirePermission('can_edit_file')` 工厂函数。

---

## 代码风格规范

- **TypeScript 严格模式**：后端 `"strict": true`，必须正确标注所有类型，禁止使用 `any`。
- **ESM 模块**：前后端均使用 `"type": "module"`，后端导入本地文件须带 `.js` 后缀（`import ... from './foo.js'`）。
- **命名规范**：
  - 文件名：`kebab-case`（如 `auth.router.ts`）
  - 变量/函数：`camelCase`
  - 类型/接口：`PascalCase`
  - 常量：`UPPER_SNAKE_CASE`
- **组件**：使用 React 函数式组件 + Hooks，禁止 class 组件。
- **样式**：使用 Tailwind CSS 工具类，复杂复用样式通过 `cn()`（`lib/utils.ts`）合并。
- **路由文件**：每个资源对应一个独立 `*.router.ts`，在 `index.ts` 中统一注册。
- **中间件**：通用中间件放在 `middleware/` 目录，不内联到路由文件中。

---

## 环境变量

所有敏感信息**必须通过环境变量注入**，不得硬编码。`.env` 文件不得提交至版本控制。

| 变量 | 说明 | 示例 |
|------|------|------|
| `MYSQL_ROOT_PASSWORD` | MySQL root 密码 | — |
| `MYSQL_PASSWORD` | Wiki 应用数据库密码 | — |
| `JWT_SECRET` | JWT 签名密钥（建议 48+ 字节随机串） | `openssl rand -base64 48` |
| `APP_PORT` | 应用对外端口 | `3001` |
| `NODE_ENV` | 运行环境 | `production` / `development` |
| `DOCS_DIR` | 文档存储路径 | `./docs` |
| `CONFIG_DIR` | 配置/上传文件路径 | `./config` |
| `FRONTEND_DIST` | 前端静态文件路径（生产） | `../frontend/dist` |

参考 `.env.example` 进行配置。

---

## 安全注意事项

1. **不得提交 `.env` 文件**，仅提交 `.env.example`（已加入 `.gitignore`）。
2. `JWT_SECRET` 必须使用足够长的随机字符串，禁止使用默认值 `sharkswiki_secret_key`。
3. **所有用户输入**在写入数据库前须经过参数化查询（禁止拼接 SQL）。
4. **文件上传**：校验文件类型与大小，禁止路径穿越（`../`）攻击。
5. **生产环境** CORS 已限制为 `false`（仅允许同源），开发环境允许 `localhost:3000` 和 `localhost:5173`。
6. 密码存储使用 `bcryptjs` 哈希，禁止明文存储。
7. 权限受保护的接口必须同时使用 `authMiddleware` + `requirePermission`，不得省略任一层。

---

## 数据库

- **数据库名**：`personal_wiki`
- **用户**：`wiki_user`
- 初始化脚本位于 `database_init.sql`，在容器首次启动时自动执行。
- 修改表结构时同步更新 `database_init.sql` 。

---

## 开发约定

- **不要**在 `frontend/src/services/api.ts` 之外直接调用 `fetch`，所有 API 调用须通过该服务层封装。
- **不要**在路由处理器中直接操作文件系统，涉及文档/配置的 I/O 应封装为独立函数。
- 新增路由时，同步更新 `API_DOCS.md`。
- 密钥管理：所有密钥存于 .env 文件，不得硬编码到代码中
- 如果有代码或项目结构上的变化也要同步更新`AGENT.md`。
- 前端页面及后端代码尽可能按功能区分，放到不同的代码源文件中，**不要**所有代码都放到一个文件中
- 如果数据库中表结构有变化，请分析是否需要变更后台的接口及前台展示的内容，如果前台需要展示字段，请同步更新相关接口代码及接口文档`API_DOCS.md`。
- Docker 构建使用多阶段构建（见 `Dockerfile`），确保生产镜像不包含开发依赖和源码。
- 健康检查接口 `/health` 应保持无需鉴权、始终可用。

## 调试与排错
- 日志位置：logs/ 目录，按日期分区（如 logs/2026-03-12.log）
- 常见问题：
  1. 开发服务启动失败：检查 3000 端口是否被占用
  2. 测试失败：确认数据库已执行 pnpm db:init 初始化
