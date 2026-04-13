-- 创建数据库
CREATE DATABASE IF NOT EXISTS personal_wiki DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE personal_wiki;

-- ==========================================
-- 1. 权限组表 (Permission Groups)
-- 记录权限组有哪些权限 包括创建权限 文件的新增 删除 编辑权限 评论权限等
-- ==========================================
CREATE TABLE IF NOT EXISTS permission_groups (
    group_id INT AUTO_INCREMENT PRIMARY KEY,
    group_name VARCHAR(50) NOT NULL COMMENT '权限组名称',
    can_create_dir BOOLEAN DEFAULT FALSE COMMENT '创建目录权限',
    can_add_file BOOLEAN DEFAULT FALSE COMMENT '新增文件权限',
    can_delete_file BOOLEAN DEFAULT FALSE COMMENT '删除文件权限',
    can_edit_file BOOLEAN DEFAULT FALSE COMMENT '编辑文件权限',
    can_comment BOOLEAN DEFAULT FALSE COMMENT '评论权限',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) COMMENT='权限组表';

-- ==========================================
-- 2. 人员表 (Users)
-- 记录人员id 登录密码 匿名名称 账号，创建时间
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    account VARCHAR(50) NOT NULL UNIQUE COMMENT '登录账号',
    password VARCHAR(255) NOT NULL COMMENT '登录密码(建议加密存储)',
    anonymous_name VARCHAR(50) NOT NULL COMMENT '匿名名称/昵称',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) COMMENT='人员表';

-- ==========================================
-- 3. 人员权限关联表 (User Permissions)
-- 记录人员id对应拥有所属权限组
-- ==========================================
CREATE TABLE IF NOT EXISTS user_permissions (
    user_id INT NOT NULL COMMENT '人员ID',
    group_id INT NOT NULL COMMENT '权限组ID',
    PRIMARY KEY (user_id, group_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES permission_groups(group_id) ON DELETE CASCADE
) COMMENT='人员权限表';

-- ==========================================
-- 4. 目录与文件信息表 (File Nodes)
-- 记录目录结构，以及目录下的文件的基础信息
-- 包括创建人创建时间修改人修改时间 文件标题，文件存放路径等
-- ==========================================
CREATE TABLE IF NOT EXISTS file_nodes (
    node_id INT AUTO_INCREMENT PRIMARY KEY,
    parent_id INT DEFAULT NULL COMMENT '父目录ID，NULL表示根目录',
    node_type ENUM('directory', 'file') NOT NULL COMMENT '节点类型',
    title VARCHAR(255) NOT NULL COMMENT '文件或目录标题',
    file_path VARCHAR(1000) NOT NULL COMMENT '文件存放物理/逻辑路径',
    creator_id INT NOT NULL COMMENT '创建人ID',
    modifier_id INT NOT NULL COMMENT '修改人ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
    FOREIGN KEY (parent_id) REFERENCES file_nodes(node_id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(user_id),
    FOREIGN KEY (modifier_id) REFERENCES users(user_id)
) COMMENT='目录与文件信息表';

-- ==========================================
-- 5. 评论表 (Comments)
-- 记录对应文件的评论信息 包括评论id，评论内容 评论人评论时间 回复人id，回复评论id，文件id等
-- ==========================================
CREATE TABLE IF NOT EXISTS comments (
    comment_id INT AUTO_INCREMENT PRIMARY KEY,
    file_id INT NOT NULL COMMENT '关联的文件ID',
    content TEXT NOT NULL COMMENT '评论内容',
    commenter_id INT NOT NULL COMMENT '评论人ID',
    reply_to_comment_id INT DEFAULT NULL COMMENT '回复的评论ID',
    reply_to_user_id INT DEFAULT NULL COMMENT '回复的人员ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '评论时间',
    FOREIGN KEY (file_id) REFERENCES file_nodes(node_id) ON DELETE CASCADE,
    FOREIGN KEY (commenter_id) REFERENCES users(user_id),
    FOREIGN KEY (reply_to_comment_id) REFERENCES comments(comment_id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to_user_id) REFERENCES users(user_id)
) COMMENT='评论表';

-- ==========================================
-- 插入初始测试数据
-- ==========================================
-- 初始化权限组
INSERT INTO permission_groups (group_name, can_create_dir, can_add_file, can_delete_file, can_edit_file, can_comment) 
VALUES 
('超级管理员', TRUE, TRUE, TRUE, TRUE, TRUE),
('普通用户', FALSE, FALSE, FALSE, FALSE, TRUE);

-- 初始化管理员账号 (密码为 123456 的 MD5 示例)
INSERT INTO users (account, password, anonymous_name) 
VALUES ('admin', 'e10adc3949ba59abbe56e057f20f883e', '系统管理员');

-- 绑定管理员权限
INSERT INTO user_permissions (user_id, group_id) VALUES (1, 1);
