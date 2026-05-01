-- 022_add_pricing_to_product_extras.sql
-- 为 product_extras 表增加本地定价字段
-- sale_price 不为 null 时，覆盖聚水潭标价；为 null 则继续用聚水潭价

ALTER TABLE product_extras
  ADD COLUMN IF NOT EXISTS sale_price     INT,           -- 本地售价（分），null = 使用聚水潭价
  ADD COLUMN IF NOT EXISTS original_price INT,           -- 划线原价（分），null = 不显示划线价
  ADD COLUMN IF NOT EXISTS price_note     VARCHAR(100);  -- 价格备注，如"限时特惠""会员价"

COMMENT ON COLUMN product_extras.sale_price     IS '本地售价（分），不为null时覆盖聚水潭s_price';
COMMENT ON COLUMN product_extras.original_price IS '划线原价（分），前端展示删除线价格，null则不显示';
COMMENT ON COLUMN product_extras.price_note     IS '价格备注文案，如"限时特惠"，可选';

-- 创建索引：方便批量查询有本地定价的商品
CREATE INDEX IF NOT EXISTS idx_product_extras_sale_price
  ON product_extras(product_code) WHERE sale_price IS NOT NULL;
