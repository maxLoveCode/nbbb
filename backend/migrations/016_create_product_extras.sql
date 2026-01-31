-- 016_create_product_extras.sql
-- 专门用于存放商品的本地补充信息（按聚水潭商品编码 product_code 映射）

DO $$
BEGIN
    -- 创建 product_extras 表
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_extras') THEN
        CREATE TABLE product_extras (
            id SERIAL PRIMARY KEY,
            product_code VARCHAR(100) NOT NULL UNIQUE,
            local_description TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        COMMENT ON TABLE product_extras IS '商品补充信息表，仅按 product_code 存放本地扩展字段（如描述）';
        COMMENT ON COLUMN product_extras.product_code IS '聚水潭商品编码（i_id），唯一键';
        COMMENT ON COLUMN product_extras.local_description IS '本地维护的商品描述，用于拼接聚水潭 description';
    END IF;

    -- 如果之前在 products 表里已经有 product_code + local_description，可按需迁移
    -- 这里只做幂等插入：将已有的非空 local_description 拷贝过来（避免重复）
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        INSERT INTO product_extras (product_code, local_description, created_at, updated_at)
        SELECT DISTINCT
            p.product_code,
            p.local_description,
            COALESCE(p.created_at, CURRENT_TIMESTAMP),
            COALESCE(p.updated_at, CURRENT_TIMESTAMP)
        FROM products p
        WHERE p.product_code IS NOT NULL
          AND p.product_code <> ''
          AND p.local_description IS NOT NULL
          AND p.local_description <> ''
          AND NOT EXISTS (
                SELECT 1 FROM product_extras e
                WHERE e.product_code = p.product_code
            );
    END IF;
END $$;


