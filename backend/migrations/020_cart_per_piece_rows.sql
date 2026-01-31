-- 将购物车改为“每件一行”
-- 处理思路：
-- 1) 移除同一用户+商品+SKU 的唯一索引，允许多行存储
-- 2) 将现有 quantity>1 的记录拆分为多行，每行 quantity=1
-- 3) 将 quantity 约束改为恒等于 1
DO $$
DECLARE
    r RECORD;
BEGIN
    -- 1. 移除唯一索引（如存在）
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
          AND indexname = 'idx_shopping_cart_unique_user_product_sku'
    ) THEN
        DROP INDEX idx_shopping_cart_unique_user_product_sku;
    END IF;

    -- 2. 处理现存数据：将 quantity > 1 的行拆分为多行，每行 quantity=1
    FOR r IN 
        SELECT id, user_id, product_code, sku_id, quantity, selected, created_at, updated_at
        FROM shopping_cart
        WHERE quantity > 1
    LOOP
        -- 插入 (quantity - 1) 行新记录，每行数量=1
        FOR i IN 2..r.quantity LOOP
            INSERT INTO shopping_cart (user_id, product_code, sku_id, quantity, selected, created_at, updated_at)
            VALUES (r.user_id, r.product_code, r.sku_id, 1, r.selected, r.created_at, r.updated_at);
        END LOOP;

        -- 将原记录数量改为1
        UPDATE shopping_cart
        SET quantity = 1
        WHERE id = r.id;
    END LOOP;

    -- 3. 重新设置数量约束为恒等于1
    -- 3.1 删除旧的数量检查约束（名称可能为 shopping_cart_quantity_check）
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'shopping_cart_quantity_check' 
          AND conrelid = 'shopping_cart'::regclass
    ) THEN
        ALTER TABLE shopping_cart DROP CONSTRAINT shopping_cart_quantity_check;
    END IF;

    -- 3.2 添加新的数量检查约束：quantity 必须为 1
    ALTER TABLE shopping_cart
    ADD CONSTRAINT shopping_cart_quantity_check CHECK (quantity = 1);

    -- 4. 更新表注释
    COMMENT ON TABLE shopping_cart IS '购物车表 - 每件商品/SKU 每行一件，数量恒为1';
    COMMENT ON COLUMN shopping_cart.quantity IS '数量，固定为1';
END $$;

