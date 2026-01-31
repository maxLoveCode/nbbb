-- 创建购物车表
-- 特殊规则：
-- 1. 物品无法叠加：每个商品/SKU只能有一条记录（通过UNIQUE约束实现）
-- 2. 数量上限：每件衣服最多3件（通过CHECK约束实现）

CREATE TABLE IF NOT EXISTS shopping_cart (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_code VARCHAR(100) NOT NULL,  -- 商品编码（来自聚水潭）
    sku_id VARCHAR(100),                  -- SKU编码（可选，如果商品有规格）
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 3),  -- 数量限制：1-3件
    selected BOOLEAN DEFAULT TRUE,        -- 是否选中（用于结算时选择）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    -- 注意：唯一约束通过唯一索引实现（见下方）
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_shopping_cart_user_id ON shopping_cart(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_cart_updated_at ON shopping_cart(updated_at);
CREATE INDEX IF NOT EXISTS idx_shopping_cart_product_code ON shopping_cart(product_code);

-- 创建唯一索引：确保同一用户的同一商品/SKU只能有一条记录（实现无法叠加）
-- 使用COALESCE处理NULL值，将NULL转换为空字符串
CREATE UNIQUE INDEX IF NOT EXISTS idx_shopping_cart_unique_user_product_sku 
ON shopping_cart(user_id, product_code, COALESCE(sku_id, ''));

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_shopping_cart_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_shopping_cart_updated_at
    BEFORE UPDATE ON shopping_cart
    FOR EACH ROW
    EXECUTE FUNCTION update_shopping_cart_updated_at();

-- 添加注释
COMMENT ON TABLE shopping_cart IS '购物车表 - 每个商品/SKU只能有一条记录，数量上限3件';
COMMENT ON COLUMN shopping_cart.user_id IS '用户ID';
COMMENT ON COLUMN shopping_cart.product_code IS '商品编码（来自聚水潭）';
COMMENT ON COLUMN shopping_cart.sku_id IS 'SKU编码（可选）';
COMMENT ON COLUMN shopping_cart.quantity IS '数量（1-3件）';
COMMENT ON COLUMN shopping_cart.selected IS '是否选中（用于结算）';

