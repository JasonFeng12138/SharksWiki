# Wiki 系统后端接口文档 (API Documentation)

本文档基于现有的 Wiki 功能及数据库表设计整理，供后端开发人员参考。前端已封装了对应的 API 调用层 (`src/services/api.ts`)，目前使用 Node.js (Express) 提供 Mock 数据。当真实的后端服务开发完成后，只需替换前端的 API Base URL 或反向代理目标即可无缝切换。

## 全局说明
- **Base URL**: `/api`
- **认证方式**: 采用 Token 认证 (如 JWT)。前端在登录后会将 Token 存储在 `localStorage` 中，并在后续请求的 Header 中携带：`Authorization: Bearer <token>`。
- **数据格式**: 请求和响应的 `Content-Type` 均为 `application/json`（文件上传除外）。
- **通用返回格式**:
  ```json
  {
    "code": 200,          // 业务状态码，200表示成功
    "message": "success", // 提示信息
    "data": { ... }       // 实际数据
  }
  ```
  *(注：目前的 Mock 接口为了简便，部分直接返回了 data，真实后端建议统一包装)*

---

## 1. 认证与授权 (Auth)

### 1.1 用户登录
- **接口**: `POST /api/auth/login`
- **描述**: 验证用户名密码，返回 Token 及用户信息。
- **请求参数**:
  ```json
  {
    "username": "admin",
    "password": "password123"
  }
  ```
- **响应数据**:
  ```json
  {
    "token": "jwt_token_string",
    "user": {
      "id": 1,
      "account": "admin",
      "name": "System Admin",
      "permissions": {
        "can_create_dir": true,
        "can_add_file": true,
        "can_delete_file": true,
        "can_edit_file": true,
        "can_comment": true
      }
    }
  }
  ```

### 1.2 获取当前登录用户信息
- **接口**: `GET /api/auth/me`
- **描述**: 根据 Header 中的 Token 获取当前用户信息。
- **响应数据**: 同登录接口中的 `user` 对象。

### 1.3 退出登录
- **接口**: `POST /api/auth/logout`
- **描述**: 销毁当前 Token/Session。

---

## 2. 用户管理 (Users)

### 2.1 修改密码
- **接口**: `PUT /api/users/me/password`
- **请求参数**:
  ```json
  {
    "oldPassword": "old_password",
    "newPassword": "new_password"
  }
  ```

### 2.2 修改名称
- **接口**: `PUT /api/users/me/name`
- **请求参数**:
  ```json
  {
    "name": "New Display Name"
  }
  ```

---

## 3. 文档与目录 (Documents)

### 3.1 获取文档树
- **接口**: `GET /api/documents/tree`
- **描述**: 获取左侧导航栏的目录和文件树状结构。
- **响应数据**:
  ```json
  [
    {
      "id": "1",
      "name": "Folder A",
      "path": "Folder A",
      "type": "directory",
      "children": [
        {
          "id": "2",
          "name": "Doc.md",
          "path": "Folder A/Doc.md",
          "type": "file",
          "author": "Admin",
          "createdAt": "2026-04-13T10:00:00Z",
          "updatedAt": "2026-04-13T10:00:00Z"
        }
      ]
    }
  ]
  ```

### 3.2 获取文档详情 (内容)
- **接口**: `GET /api/documents/detail`
- **请求参数 (Query)**: `?path=Folder A/Doc.md` (真实后端可改为 `?id=2`)
- **响应数据**:
  ```json
  {
    "id": "2",
    "content": "# Markdown Content here...",
    "author": "Admin",
    "createdAt": "2026-04-13T10:00:00Z",
    "updatedAt": "2026-04-13T10:00:00Z"
  }
  ```

### 3.3 创建文档或目录
- **接口**: `POST /api/documents`
- **请求参数**:
  ```json
  {
    "parentPath": "Folder A", // 父目录路径或ID
    "name": "NewDoc.md",
    "type": "file",           // 'file' 或 'directory'
    "content": "# New Doc"    // 仅 type='file' 时有效
  }
  ```

### 3.4 更新文档内容
- **接口**: `PUT /api/documents`
- **请求参数**:
  ```json
  {
    "path": "Folder A/Doc.md", // 文档路径或ID
    "content": "# Updated Content"
  }
  ```

### 3.5 删除文档或目录
- **接口**: `DELETE /api/documents`
- **请求参数 (Query)**: `?path=Folder A/Doc.md` (真实后端可改为 `?id=2`)

---

## 4. 评论系统 (Comments) - *待前端UI接入*

### 4.1 获取文档评论列表
- **接口**: `GET /api/comments`
- **请求参数 (Query)**: `?documentId=2`
- **响应数据**:
  ```json
  [
    {
      "id": 1,
      "documentId": "2",
      "content": "这是一条评论",
      "authorId": 1,
      "authorName": "Admin",
      "createdAt": "2026-04-13T12:00:00Z",
      "replyToId": null
    }
  ]
  ```

### 4.2 发表评论
- **接口**: `POST /api/comments`
- **请求参数**:
  ```json
  {
    "documentId": "2",
    "content": "评论内容",
    "replyToId": null // 可选，回复某条评论的ID
  }
  ```

### 4.3 删除评论
- **接口**: `DELETE /api/comments/:id`

---

## 5. 系统配置 (Config)

### 5.1 获取 Wiki 配置
- **接口**: `GET /api/config`
- **响应数据**:
  ```json
  {
    "name": "My Wiki",
    "icon": "/api/uploads/wiki_icon_123.png"
  }
  ```

### 5.2 更新 Wiki 配置
- **接口**: `PUT /api/config`
- **请求参数**:
  ```json
  {
    "name": "New Wiki Name",
    "icon": "/api/uploads/wiki_icon_123.png"
  }
  ```

### 5.3 上传 Wiki 图标
- **接口**: `POST /api/config/icon`
- **请求头**: `Content-Type: image/png` (或 `multipart/form-data`)
- **请求体**: 图片二进制流
- **响应数据**:
  ```json
  {
    "url": "/api/uploads/wiki_icon_123.png"
  }
  ```
