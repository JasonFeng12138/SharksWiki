# ── Stage 1: 构建前端 ────────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend .
RUN npm run build

# ── Stage 2: 构建后端 ────────────────────────────────────────────────────────
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend .
RUN npm run build

# ── Stage 3: 生产镜像 ────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# 只安装生产依赖
COPY backend/package*.json ./
RUN npm ci --omit=dev

# 拷贝编译产物
COPY --from=backend-builder /app/backend/dist ./dist
# 拷贝前端静态文件
COPY --from=frontend-builder /app/frontend/dist ./frontend_dist

# 创建数据目录
RUN mkdir -p /app/docs /app/config/uploads

EXPOSE 3001

ENV NODE_ENV=production
ENV FRONTEND_DIST=/app/frontend_dist
ENV DOCS_DIR=/app/docs
ENV CONFIG_DIR=/app/config

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
