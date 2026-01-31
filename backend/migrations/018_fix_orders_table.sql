-- 修复orders表，添加缺失的字段
-- 兼容现有表结构，添加聚水潭相关字段

-- 添加order_no字段（如果不存在）
DO $$ 
BEGIN
    -- 检查order_no字段是否存在
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='orders' AND column_name='order_no') THEN
        -- 添加order_no字段
        ALTER TABLE orders ADD COLUMN order_no VARCHAR(50);
        
        -- 将order_number的值复制到order_no
        UPDATE orders SET order_no = order_number WHERE order_no IS NULL AND order_number IS NOT NULL;
        
        -- 创建唯一索引（允许NULL值）
        CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_no_unique 
        ON orders(order_no) WHERE order_no IS NOT NULL;
    END IF;
END $$;

-- 添加其他缺失的字段（使用012_update_orders_for_jushuitan.sql的逻辑）
DO $$ 
BEGIN
    -- 聚水潭相关字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='jst_o_id') THEN
        ALTER TABLE orders ADD COLUMN jst_o_id INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='jst_so_id') THEN
        ALTER TABLE orders ADD COLUMN jst_so_id VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='shop_id') THEN
        ALTER TABLE orders ADD COLUMN shop_id INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='order_date') THEN
        ALTER TABLE orders ADD COLUMN order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='shop_status') THEN
        ALTER TABLE orders ADD COLUMN shop_status VARCHAR(50) DEFAULT 'WAIT_BUYER_PAY';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='shop_buyer_id') THEN
        ALTER TABLE orders ADD COLUMN shop_buyer_id VARCHAR(50);
    END IF;
    
    -- 收货地址字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='receiver_state') THEN
        ALTER TABLE orders ADD COLUMN receiver_state VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='receiver_city') THEN
        ALTER TABLE orders ADD COLUMN receiver_city VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='receiver_district') THEN
        ALTER TABLE orders ADD COLUMN receiver_district VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='receiver_address') THEN
        ALTER TABLE orders ADD COLUMN receiver_address VARCHAR(200);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='receiver_name') THEN
        ALTER TABLE orders ADD COLUMN receiver_name VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='receiver_phone') THEN
        ALTER TABLE orders ADD COLUMN receiver_phone VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='receiver_mobile') THEN
        ALTER TABLE orders ADD COLUMN receiver_mobile VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='receiver_email') THEN
        ALTER TABLE orders ADD COLUMN receiver_email VARCHAR(200);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='receiver_zip') THEN
        ALTER TABLE orders ADD COLUMN receiver_zip VARCHAR(20);
    END IF;
    
    -- 金额字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='freight') THEN
        ALTER TABLE orders ADD COLUMN freight DECIMAL(10, 2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='pay_amount') THEN
        ALTER TABLE orders ADD COLUMN pay_amount DECIMAL(10, 2) DEFAULT 0;
    END IF;
    
    -- 其他字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='buyer_message') THEN
        ALTER TABLE orders ADD COLUMN buyer_message TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='labels') THEN
        ALTER TABLE orders ADD COLUMN labels VARCHAR(200);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='logistics_company') THEN
        ALTER TABLE orders ADD COLUMN logistics_company VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='lc_id') THEN
        ALTER TABLE orders ADD COLUMN lc_id VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='l_id') THEN
        ALTER TABLE orders ADD COLUMN l_id VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='send_date') THEN
        ALTER TABLE orders ADD COLUMN send_date TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='sync_status') THEN
        ALTER TABLE orders ADD COLUMN sync_status VARCHAR(20) DEFAULT 'pending';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='sync_at') THEN
        ALTER TABLE orders ADD COLUMN sync_at TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='sync_error') THEN
        ALTER TABLE orders ADD COLUMN sync_error TEXT;
    END IF;
END $$;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_orders_jst_o_id ON orders(jst_o_id);
CREATE INDEX IF NOT EXISTS idx_orders_jst_so_id ON orders(jst_so_id);
CREATE INDEX IF NOT EXISTS idx_orders_sync_status ON orders(sync_status);
CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON orders(shop_id);

-- 验证迁移结果
DO $$ 
BEGIN
    RAISE NOTICE 'Migration completed. Checking fields...';
END $$;

