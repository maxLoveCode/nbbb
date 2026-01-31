-- 创建订单表
-- 订单系统：本地存储订单，同步到聚水潭，维护ID对应关系

-- 订单主表
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_no VARCHAR(50) NOT NULL UNIQUE,  -- 本地订单号（唯一）
    jst_o_id INTEGER,                       -- 聚水潭内部单号（o_id）
    jst_so_id VARCHAR(50),                  -- 聚水潭线上单号（so_id）
    shop_id INTEGER,                        -- 聚水潭店铺编号
    order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- 订单日期
    shop_status VARCHAR(50) NOT NULL DEFAULT 'WAIT_BUYER_PAY',  -- 订单状态
    shop_buyer_id VARCHAR(50) NOT NULL,     -- 买家账号
    
    -- 收货地址信息
    receiver_state VARCHAR(50),
    receiver_city VARCHAR(50),
    receiver_district VARCHAR(50),
    receiver_address VARCHAR(200) NOT NULL,
    receiver_name VARCHAR(50) NOT NULL,
    receiver_phone VARCHAR(50),
    receiver_mobile VARCHAR(50),
    receiver_email VARCHAR(200),
    receiver_zip VARCHAR(20),
    
    -- 金额信息
    pay_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,  -- 应付金额
    freight DECIMAL(10, 2) NOT NULL DEFAULT 0,     -- 运费
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0, -- 订单总金额（商品总额+运费）
    
    -- 其他信息
    buyer_message TEXT,                     -- 买家留言
    remark TEXT,                            -- 卖家备注
    labels VARCHAR(200),                    -- 订单标签（逗号分隔）
    
    -- 物流信息
    logistics_company VARCHAR(100),         -- 快递公司名称
    lc_id VARCHAR(50),                      -- 快递公司编码
    l_id VARCHAR(100),                      -- 快递单号
    send_date TIMESTAMP,                    -- 发货日期
    
    -- 同步状态
    sync_status VARCHAR(20) DEFAULT 'pending',  -- pending/success/failed
    sync_at TIMESTAMP,                      -- 同步时间
    sync_error TEXT,                        -- 同步错误信息
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    CONSTRAINT chk_receiver_contact CHECK (
        receiver_phone IS NOT NULL OR receiver_mobile IS NOT NULL
    )
);

-- 订单明细表
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_code VARCHAR(100) NOT NULL,     -- 商品编码（聚水潭）
    sku_id VARCHAR(100) NOT NULL,           -- SKU编码
    shop_sku_id VARCHAR(128),               -- 店铺商品编码
    shop_i_id VARCHAR(100),                 -- 店铺商品款式编码
    i_id VARCHAR(40),                       -- ERP内款号/货号
    name VARCHAR(100) NOT NULL,             -- 商品名称
    properties_value VARCHAR(100),          -- 商品属性
    pic VARCHAR(300),                       -- 图片地址
    
    -- 价格和数量
    price DECIMAL(10, 4),                   -- 单价
    base_price DECIMAL(10, 2) NOT NULL,     -- 原价
    amount DECIMAL(10, 2) NOT NULL,         -- 成交总额
    qty INTEGER NOT NULL DEFAULT 1,         -- 数量
    
    -- 退款信息
    refund_qty INTEGER DEFAULT 0,          -- 退货数量
    refund_status VARCHAR(20),              -- 退款状态：waiting/success/closed
    
    -- 其他
    outer_oi_id VARCHAR(50) NOT NULL,      -- 外部订单明细ID（用于拆单合单溯源）
    remark TEXT,                           -- 订单明细备注
    is_gift BOOLEAN DEFAULT FALSE,          -- 是否赠品
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 确保outer_oi_id在订单内唯一
    UNIQUE(order_id, outer_oi_id)
);

-- 订单支付明细表
CREATE TABLE IF NOT EXISTS order_payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    outer_pay_id VARCHAR(50) NOT NULL,     -- 外部支付单号
    pay_date TIMESTAMP NOT NULL,            -- 支付日期
    payment VARCHAR(20) NOT NULL,          -- 支付方式
    seller_account VARCHAR(50) NOT NULL,   -- 收款账户
    buyer_account VARCHAR(200) NOT NULL,   -- 买家支付账号
    amount DECIMAL(10, 2) NOT NULL,        -- 支付总额
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 确保outer_pay_id在订单内唯一
    UNIQUE(order_id, outer_pay_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);
CREATE INDEX IF NOT EXISTS idx_orders_jst_o_id ON orders(jst_o_id);
CREATE INDEX IF NOT EXISTS idx_orders_jst_so_id ON orders(jst_so_id);
CREATE INDEX IF NOT EXISTS idx_orders_sync_status ON orders(sync_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_code ON order_items(product_code);
CREATE INDEX IF NOT EXISTS idx_order_payments_order_id ON order_payments(order_id);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_orders_updated_at();

CREATE TRIGGER trigger_update_order_items_updated_at
    BEFORE UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_orders_updated_at();

CREATE TRIGGER trigger_update_order_payments_updated_at
    BEFORE UPDATE ON order_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_orders_updated_at();

-- 添加注释
COMMENT ON TABLE orders IS '订单主表 - 本地订单，同步到聚水潭';
COMMENT ON COLUMN orders.order_no IS '本地订单号（唯一）';
COMMENT ON COLUMN orders.jst_o_id IS '聚水潭内部单号（o_id）';
COMMENT ON COLUMN orders.jst_so_id IS '聚水潭线上单号（so_id）';
COMMENT ON COLUMN orders.sync_status IS '同步状态：pending=待同步，success=同步成功，failed=同步失败';








