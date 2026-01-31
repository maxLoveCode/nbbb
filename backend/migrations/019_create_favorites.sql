-- 创建收藏/心愿单表
-- 业务规则：
-- 1. 同一用户对同一商品只保留一条记录（UNIQUE 约束）
-- 2. 仅按聚水潭商品编码 product_code 进行收藏

DO $$
BEGIN
    -- 创建 favorites 表
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'favorites') THEN
        CREATE TABLE favorites (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            product_code VARCHAR(100) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        COMMENT ON TABLE favorites IS '收藏/心愿单表';
        COMMENT ON COLUMN favorites.user_id IS '用户ID';
        COMMENT ON COLUMN favorites.product_code IS '聚水潭商品编码';
        COMMENT ON COLUMN favorites.created_at IS '收藏时间';
    END IF;

    -- 唯一索引：同一用户同一商品仅一条
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename = 'favorites' AND indexname = 'idx_favorites_unique_user_product'
    ) THEN
        CREATE UNIQUE INDEX idx_favorites_unique_user_product ON favorites(user_id, product_code);
    END IF;

    -- 辅助索引
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename = 'favorites' AND indexname = 'idx_favorites_user_id'
    ) THEN
        CREATE INDEX idx_favorites_user_id ON favorites(user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename = 'favorites' AND indexname = 'idx_favorites_product_code'
    ) THEN
        CREATE INDEX idx_favorites_product_code ON favorites(product_code);
    END IF;
END $$;

