-- 购物车商品快照字段扩展
-- 目的：添加商品时存储快照，减少API调用
-- 展示购物车时只需查库存，不需要再查商品详情

-- 添加商品快照字段
ALTER TABLE shopping_cart ADD COLUMN IF NOT EXISTS product_name VARCHAR(500);           -- 商品名称
ALTER TABLE shopping_cart ADD COLUMN IF NOT EXISTS product_pic TEXT;                     -- 商品图片URL
ALTER TABLE shopping_cart ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10, 2);           -- 销售价格
ALTER TABLE shopping_cart ADD COLUMN IF NOT EXISTS original_price DECIMAL(10, 2);       -- 原价（吊牌价）
ALTER TABLE shopping_cart ADD COLUMN IF NOT EXISTS properties_value VARCHAR(200);        -- SKU属性值（如"黑色;M码"）
ALTER TABLE shopping_cart ADD COLUMN IF NOT EXISTS sku_pic TEXT;                         -- SKU图片URL（如有）
ALTER TABLE shopping_cart ADD COLUMN IF NOT EXISTS snapshot_at TIMESTAMP;                -- 快照创建时间

-- 添加注释
COMMENT ON COLUMN shopping_cart.product_name IS '商品名称快照';
COMMENT ON COLUMN shopping_cart.product_pic IS '商品主图URL快照';
COMMENT ON COLUMN shopping_cart.sale_price IS '销售价格快照';
COMMENT ON COLUMN shopping_cart.original_price IS '原价（吊牌价）快照';
COMMENT ON COLUMN shopping_cart.properties_value IS 'SKU属性值快照（如"黑色;M码"）';
COMMENT ON COLUMN shopping_cart.sku_pic IS 'SKU图片URL快照';
COMMENT ON COLUMN shopping_cart.snapshot_at IS '商品快照创建时间';
