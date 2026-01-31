-- 添加微信登录相关字段到现有 users 表
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS openid VARCHAR(64),
ADD COLUMN IF NOT EXISTS unionid VARCHAR(64),
ADD COLUMN IF NOT EXISTS nickname VARCHAR(100),
ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

-- 创建 openid 的唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_openid ON users(openid) WHERE openid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_unionid ON users(unionid) WHERE unionid IS NOT NULL;

-- 更新现有用户数据（可选）
UPDATE users SET 
  nickname = COALESCE(first_name ||   || last_name, username),
  avatar_url = https://via.placeholder.com/100
WHERE nickname IS NULL;
