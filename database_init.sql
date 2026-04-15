-- 创建数据库
CREATE DATABASE IF NOT EXISTS personal_wiki DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE personal_wiki;

-- ==========================================
-- 0. 权限目录表 (Permissions Catalog)
--    定义系统中所有可用权限，权限组的勾选项来源于此表
-- ==========================================
CREATE TABLE IF NOT EXISTS permissions (
    permission_key VARCHAR(50) PRIMARY KEY,
    display_name   VARCHAR(100) NOT NULL,
    description    VARCHAR(255) DEFAULT NULL,
    sort_order     INT DEFAULT 0
);

INSERT IGNORE INTO permissions (permission_key, display_name, description, sort_order) VALUES
    ('can_read',       '阅读',     '可以阅读文档（未登录默认拥有此权限）', 10),
    ('can_comment',    '评论',     '可以发表评论',                         20),
    ('can_add_file',   '新增文档', '可以创建新文档',                        30),
    ('can_edit_file',  '编辑文档', '可以编辑文档内容',                      40),
    ('can_create_dir', '创建目录', '可以创建目录',                          50),
    ('can_delete_file','删除文档', '可以删除文档或目录',                    60),
    ('can_admin',      '管理员',   '可以访问 Wiki 管理面板（用户/权限组管理）', 70);

-- ==========================================
-- 1. 权限组表 (Permission Groups)
-- ==========================================
CREATE TABLE IF NOT EXISTS permission_groups (
    group_id   INT AUTO_INCREMENT PRIMARY KEY,
    group_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 1a. 权限组-权限关联表 (Group Permissions)
--     多对多：权限组拥有哪些权限
-- ==========================================
CREATE TABLE IF NOT EXISTS group_permissions (
    group_id       INT NOT NULL,
    permission_key VARCHAR(50) NOT NULL,
    PRIMARY KEY (group_id, permission_key),
    FOREIGN KEY (group_id)       REFERENCES permission_groups(group_id) ON DELETE CASCADE,
    FOREIGN KEY (permission_key) REFERENCES permissions(permission_key) ON DELETE CASCADE
);

-- ==========================================
-- 2. 人员表 (Users)
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
    user_id        INT AUTO_INCREMENT PRIMARY KEY,
    account        VARCHAR(50) NOT NULL UNIQUE,
    password       VARCHAR(255) NOT NULL,
    anonymous_name VARCHAR(50) NOT NULL,
    is_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. 人员权限关联表 (User Permissions)
-- ==========================================
CREATE TABLE IF NOT EXISTS user_permissions (
    user_id  INT NOT NULL,
    group_id INT NOT NULL,
    PRIMARY KEY (user_id, group_id),
    FOREIGN KEY (user_id)  REFERENCES users(user_id)            ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES permission_groups(group_id) ON DELETE CASCADE
);

-- ==========================================
-- 4. 目录与文件信息表 (File Nodes)
-- ==========================================
CREATE TABLE IF NOT EXISTS file_nodes (
    node_id    INT AUTO_INCREMENT PRIMARY KEY,
    parent_id  INT DEFAULT NULL,
    node_type  ENUM('directory', 'file') NOT NULL,
    title      VARCHAR(255) NOT NULL,
    file_path  VARCHAR(1000) NOT NULL,
    creator_id INT NOT NULL,
    modifier_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES file_nodes(node_id) ON DELETE CASCADE
);

-- ==========================================
-- 5. 评论表 (Comments)
-- ==========================================
CREATE TABLE IF NOT EXISTS comments (
    comment_id           INT AUTO_INCREMENT PRIMARY KEY,
    file_id              INT NOT NULL,
    content              TEXT NOT NULL,
    commenter_id         INT NOT NULL,
    reply_to_comment_id  INT DEFAULT NULL,
    reply_to_user_id     INT DEFAULT NULL,
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id)             REFERENCES file_nodes(node_id) ON DELETE CASCADE,
    FOREIGN KEY (commenter_id)        REFERENCES users(user_id),
    FOREIGN KEY (reply_to_comment_id) REFERENCES comments(comment_id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to_user_id)    REFERENCES users(user_id)
);

-- ==========================================
-- 6. 初始化数据
-- ==========================================
-- 初始权限组（超级管理员 / 普通用户）
INSERT IGNORE INTO permission_groups (group_id, group_name) VALUES (1, '超级管理员'), (2, '普通用户');

-- 超级管理员拥有全部权限
INSERT IGNORE INTO group_permissions (group_id, permission_key) VALUES
    (1, 'can_read'), (1, 'can_comment'), (1, 'can_add_file'),
    (1, 'can_edit_file'), (1, 'can_create_dir'), (1, 'can_delete_file'), (1, 'can_admin');

-- 普通用户拥有阅读+评论权限（默认勾选 can_read）
INSERT IGNORE INTO group_permissions (group_id, permission_key) VALUES
    (2, 'can_read'), (2, 'can_comment');

-- 管理员用户（密码 123456，MD5 格式，首次登录自动升级为 bcrypt）
INSERT IGNORE INTO users (user_id, account, password, anonymous_name)
VALUES (1, 'admin', 'e10adc3949ba59abbe56e057f20f883e', '系统管理员');

INSERT IGNORE INTO user_permissions (user_id, group_id) VALUES (1, 1);

-- ==========================================
-- 7. 存量数据迁移（仅当旧字段存在时执行，幂等安全）
--    将旧 permission_groups 的 boolean 列迁移到 group_permissions 表
-- ==========================================
DROP PROCEDURE IF EXISTS migrate_old_permissions;
DELIMITER //
CREATE PROCEDURE migrate_old_permissions()
BEGIN
    -- 检查旧列是否存在
    IF EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'permission_groups'
          AND COLUMN_NAME = 'can_create_dir'
    ) THEN
        -- 迁移：对旧列为 TRUE 的权限组插入 group_permissions 记录
        INSERT IGNORE INTO group_permissions (group_id, permission_key)
            SELECT group_id, 'can_read'        FROM permission_groups; -- 所有组默认获得 can_read
        INSERT IGNORE INTO group_permissions (group_id, permission_key)
            SELECT group_id, 'can_create_dir'  FROM permission_groups WHERE can_create_dir  = TRUE;
        INSERT IGNORE INTO group_permissions (group_id, permission_key)
            SELECT group_id, 'can_add_file'    FROM permission_groups WHERE can_add_file    = TRUE;
        INSERT IGNORE INTO group_permissions (group_id, permission_key)
            SELECT group_id, 'can_delete_file' FROM permission_groups WHERE can_delete_file = TRUE;
        INSERT IGNORE INTO group_permissions (group_id, permission_key)
            SELECT group_id, 'can_edit_file'   FROM permission_groups WHERE can_edit_file   = TRUE;
        INSERT IGNORE INTO group_permissions (group_id, permission_key)
            SELECT group_id, 'can_comment'     FROM permission_groups WHERE can_comment     = TRUE;
        -- 拥有全部旧权限的组视为管理员
        INSERT IGNORE INTO group_permissions (group_id, permission_key)
            SELECT group_id, 'can_admin' FROM permission_groups
            WHERE can_create_dir=TRUE AND can_add_file=TRUE AND can_delete_file=TRUE
              AND can_edit_file=TRUE AND can_comment=TRUE;
        -- 删除旧列
        ALTER TABLE permission_groups
            DROP COLUMN IF EXISTS can_create_dir,
            DROP COLUMN IF EXISTS can_add_file,
            DROP COLUMN IF EXISTS can_delete_file,
            DROP COLUMN IF EXISTS can_edit_file,
            DROP COLUMN IF EXISTS can_comment;
    END IF;
END //
DELIMITER ;
CALL migrate_old_permissions();
DROP PROCEDURE IF EXISTS migrate_old_permissions;

-- ==========================================
-- 8. 说明：wiki_user 的创建与授权由 docker-compose.yml 中
--    MYSQL_USER / MYSQL_PASSWORD 环境变量自动完成，无需在此重复。
-- ==========================================
