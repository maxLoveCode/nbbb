-- 更新订单表，添加聚水潭相关字段
-- 如果字段已存在则跳过

-- 添加聚水潭相关字段到orders表
DO $$ 
BEGIN
    -- 添加聚水潭内部单号
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='jst_o_id') THEN
        ALTER TABLE orders ADD COLUMN jst_o_id INTEGER;
    END IF;
    
    -- 添加聚水潭线上单号
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='jst_so_id') THEN
        ALTER TABLE orders ADD COLUMN jst_so_id VARCHAR(50);
    END IF;
    
    -- 添加店铺编号
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='shop_id') THEN
        ALTER TABLE orders ADD COLUMN shop_id INTEGER;
    END IF;
    
    -- 添加订单日期（聚水潭）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='order_date') THEN
        ALTER TABLE orders ADD COLUMN order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    -- 添加订单状态（聚水潭）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='shop_status') THEN
        ALTER TABLE orders ADD COLUMN shop_status VARCHAR(50) DEFAULT 'WAIT_BUYER_PAY';
    END IF;
    
    -- 添加买家账号
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='shop_buyer_id') THEN
        ALTER TABLE orders ADD COLUMN shop_buyer_id VARCHAR(50);
    END IF;
    
    -- 添加收货地址详细字段
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
    
    -- 添加运费
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='freight') THEN
        ALTER TABLE orders ADD COLUMN freight DECIMAL(10, 2) DEFAULT 0;
    END IF;
    
    -- 添加应付金额（聚水潭）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='pay_amount') THEN
        ALTER TABLE orders ADD COLUMN pay_amount DECIMAL(10, 2) DEFAULT 0;
    END IF;
    
    -- 添加买家留言
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='buyer_message') THEN
        ALTER TABLE orders ADD COLUMN buyer_message TEXT;
    END IF;
    
    -- 添加订单标签
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='labels') THEN
        ALTER TABLE orders ADD COLUMN labels VARCHAR(200);
    END IF;
    
    -- 添加物流信息
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
    
    -- 添加同步状态
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

-- 检查order_items表，添加聚水潭相关字段
DO $$ 
BEGIN
    -- 添加商品编码（聚水潭）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='product_code') THEN
        ALTER TABLE order_items ADD COLUMN product_code VARCHAR(100);
    END IF;
    
    -- 添加店铺商品编码
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='shop_sku_id') THEN
        ALTER TABLE order_items ADD COLUMN shop_sku_id VARCHAR(128);
    END IF;
    
    -- 添加店铺商品款式编码
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='shop_i_id') THEN
        ALTER TABLE order_items ADD COLUMN shop_i_id VARCHAR(100);
    END IF;
    
    -- 添加ERP内款号
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='i_id') THEN
        ALTER TABLE order_items ADD COLUMN i_id VARCHAR(40);
    END IF;
    
    -- 添加商品属性
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='properties_value') THEN
        ALTER TABLE order_items ADD COLUMN properties_value VARCHAR(100);
    END IF;
    
    -- 添加原价
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='base_price') THEN
        ALTER TABLE order_items ADD COLUMN base_price DECIMAL(10, 2);
    END IF;
    
    -- 添加成交总额
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='amount') THEN
        ALTER TABLE order_items ADD COLUMN amount DECIMAL(10, 2);
    END IF;
    
    -- 添加退款信息
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='refund_qty') THEN
        ALTER TABLE order_items ADD COLUMN refund_qty INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='refund_status') THEN
        ALTER TABLE order_items ADD COLUMN refund_status VARCHAR(20);
    END IF;
    
    -- 添加外部订单明细ID
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='outer_oi_id') THEN
        ALTER TABLE order_items ADD COLUMN outer_oi_id VARCHAR(50);
    END IF;
    
    -- 添加是否赠品
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='is_gift') THEN
        ALTER TABLE order_items ADD COLUMN is_gift BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 检查order_payments表是否存在，如果不存在则创建
CREATE TABLE IF NOT EXISTS order_payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    outer_pay_id VARCHAR(50) NOT NULL,
    pay_date TIMESTAMP NOT NULL,
    payment VARCHAR(20) NOT NULL,
    seller_account VARCHAR(50) NOT NULL,
    buyer_account VARCHAR(200) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(order_id, outer_pay_id)
);

CREATE INDEX IF NOT EXISTS idx_order_payments_order_id ON order_payments(order_id);








