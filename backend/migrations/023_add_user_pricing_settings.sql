-- 023_add_user_pricing_settings.sql
-- 为用户增加价格策略字段，支持后台维护白名单折扣

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS pricing_tier VARCHAR(32) NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS pricing_discount_rate NUMERIC(5, 4),
  ADD COLUMN IF NOT EXISTS pricing_updated_at TIMESTAMP;

COMMENT ON COLUMN users.pricing_tier IS '价格策略类型：default / whitelist / member';
COMMENT ON COLUMN users.pricing_discount_rate IS '价格折扣系数，例如 0.3000 表示三折';
COMMENT ON COLUMN users.pricing_updated_at IS '价格策略最近更新时间';

CREATE INDEX IF NOT EXISTS idx_users_pricing_tier ON users(pricing_tier);
