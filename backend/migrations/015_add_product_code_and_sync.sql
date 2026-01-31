-- 添加product_code字段到products表，用于关联聚水潭商品
-- 如果字段已存在则跳过

DO $$ 
BEGIN
    -- 添加product_code字段（聚水潭商品编码）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='product_code') THEN
        ALTER TABLE products ADD COLUMN product_code VARCHAR(100);
        CREATE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code);
        COMMENT ON COLUMN products.product_code IS '聚水潭商品编码（i_id）';
    END IF;
    
    -- 确保description字段存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='description') THEN
        ALTER TABLE products ADD COLUMN description TEXT;
        COMMENT ON COLUMN products.description IS '商品描述（由聚水潭字段和数据库字段拼接而成）';
    END IF;
    
    -- 添加jushuitan_description字段，用于存储聚水潭原始描述
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='jushuitan_description') THEN
        ALTER TABLE products ADD COLUMN jushuitan_description TEXT;
        COMMENT ON COLUMN products.jushuitan_description IS '聚水潭原始描述字段';
    END IF;
    
    -- 添加local_description字段，用于存储本地数据库的描述
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='local_description') THEN
        ALTER TABLE products ADD COLUMN local_description TEXT;
        COMMENT ON COLUMN products.local_description IS '本地数据库描述字段';
    END IF;
    
    -- 添加同步时间戳字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='synced_at') THEN
        ALTER TABLE products ADD COLUMN synced_at TIMESTAMP;
        COMMENT ON COLUMN products.synced_at IS '从聚水潭同步的时间';
    END IF;
END $$;












