-- 创建数据库
CREATE DATABASE IF NOT EXISTS personal_wiki DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE personal_wiki;

-- ==========================================
-- 1. 权限组表 (Permission Groups)
-- ==========================================
CREATE TABLE IF NOT EXISTS permission_groups (
    group_id INT AUTO_INCREMENT PRIMARY KEY,
    group_name VARCHAR(50) NOT NULL,
    can_create_dir BOOLEAN DEFAULT FALSE,
    can_add_file BOOLEAN DEFAULT FALSE,
    can_delete_file BOOLEAN DEFAULT FALSE,
    can_edit_file BOOLEAN DEFAULT FALSE,
    can_comment BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. 人员表 (Users)
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    account VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    anonymous_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. 人员权限关联表 (User Permissions)
-- ==========================================
CREATE TABLE IF NOT EXISTS user_permissions (
    user_id INT NOT NULL,
    group_id INT NOT NULL,
    PRIMARY KEY (user_id, group_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES permission_groups(group_id) ON DELETE CASCADE
);

-- ==========================================
-- 4. 目录与文件信息表 (File Nodes)
-- ==========================================
CREATE TABLE IF NOT EXISTS file_nodes (
    node_id INT AUTO_INCREMENT PRIMARY KEY,
    parent_id INT DEFAULT NULL,
    node_type ENUM('directory', 'file') NOT NULL,
    title VARCHAR(255) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    creator_id INT NOT NULL,
    modifier_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES file_nodes(node_id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(user_id),
    FOREIGN KEY (modifier_id) REFERENCES users(user_id)
);

-- ==========================================
-- 5. 评论表 (Comments)
-- ==========================================
CREATE TABLE IF NOT EXISTS comments (
    comment_id INT AUTO_INCREMENT PRIMARY KEY,
    file_id INT NOT NULL,
    content TEXT NOT NULL,
    commenter_id INT NOT NULL,
    reply_to_comment_id INT DEFAULT NULL,
    reply_to_user_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES file_nodes(node_id) ON DELETE CASCADE,
    FOREIGN KEY (commenter_id) REFERENCES users(user_id),
    FOREIGN KEY (reply_to_comment_id) REFERENCES comments(comment_id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to_user_id) REFERENCES users(user_id)
);

-- ==========================================
-- 6. 初始化测试数据
-- ==========================================
INSERT IGNORE INTO permission_groups (group_id, group_name, can_create_dir, can_add_file, can_delete_file, can_edit_file, can_comment) 
VALUES (1, '超级管理员', TRUE, TRUE, TRUE, TRUE, TRUE), (2, '普通用户', FALSE, FALSE, FALSE, FALSE, TRUE);

INSERT IGNORE INTO users (user_id, account, password, anonymous_name) 
VALUES (1, 'admin', 'e10adc3949ba59abbe56e057f20f883e', '系统管理员');

INSERT IGNORE INTO user_permissions (user_id, group_id) VALUES (1, 1);

-- ==========================================
-- 7. 权限配置 (关键：移除干扰性注释和格式)
-- ==========================================
# 直接在容器内以 root 权限分行执行了：
CREATE USER IF NOT EXISTS 'wiki_user'@'%' IDENTIFIED BY 'wiki_password';
GRANT ALL PRIVILEGES ON personal_wiki.* TO 'wiki_user'@'%';
-- 同时兼容了旧版工具的认证插件
ALTER USER 'wiki_user'@'%' IDENTIFIED WITH mysql_native_password BY 'wiki_password';
FLUSH PRIVILEGES;
