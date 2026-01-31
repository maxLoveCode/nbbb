-- 创建上架商品配置表
-- 用于管理哪些商品在前台展示

CREATE TABLE IF NOT EXISTS listed_products (
  id SERIAL PRIMARY KEY,
  product_code VARCHAR(50) UNIQUE NOT NULL,  -- 商品编码（对应聚水潭的i_id）
  display_order INT DEFAULT 0,                -- 显示排序（数字越小越靠前）
  is_active BOOLEAN DEFAULT true,             -- 是否上架
  category VARCHAR(100),                      -- 类目（用于前端筛选）
  price_hint INT,                             -- 价格提示（分），可为空，实际价格从聚水潭获取
  notes TEXT,                                 -- 备注信息
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_listed_products_code ON listed_products(product_code);
CREATE INDEX idx_listed_products_active ON listed_products(is_active);
CREATE INDEX idx_listed_products_order ON listed_products(display_order);
CREATE INDEX idx_listed_products_category ON listed_products(category);

-- 添加注释
COMMENT ON TABLE listed_products IS '上架商品配置表 - 控制哪些商品对外展示';
COMMENT ON COLUMN listed_products.product_code IS '商品编码（对应聚水潭的i_id）';
COMMENT ON COLUMN listed_products.display_order IS '显示排序，数字越小越靠前';
COMMENT ON COLUMN listed_products.is_active IS '是否上架，false则前台不显示';
COMMENT ON COLUMN listed_products.category IS '商品类目，用于前端筛选';
COMMENT ON COLUMN listed_products.price_hint IS '价格提示（分），实际价格从聚水潭获取';
COMMENT ON COLUMN listed_products.notes IS '备注信息，如上架理由、特殊说明等';




