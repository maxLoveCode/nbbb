-- ============================================
-- 分类系统重构迁移脚本
-- 日期: 2026-01-31
-- 目标: 简化分类系统，统一商品编码存储方式
-- ============================================

-- 新设计架构：
-- 
-- ┌─────────────────────────────────┐
-- │  category_page_categories       │  分类页 Tab 配置
-- │  (博主甄选、人宠同款、宠物...)  │
-- └─────────────┬───────────────────┘
--               │ 1:N (category_id)
--               ▼
-- ┌─────────────────────────────────┐
-- │  category_page_products         │  分类-商品关联 (新表，统一存储)
-- │  (category_id, product_code)    │
-- └─────────────────────────────────┘
--
-- 保留的表：
-- - listed_products: 全局商品清单（Excel导入）
-- - categories: 聚水潭商品分类
-- - category_management: 选购页分类（去除product_codes字段依赖）

BEGIN;

-- ============================================
-- 1. 创建新的统一商品关联表
-- ============================================
CREATE TABLE IF NOT EXISTS category_page_products (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES category_page_categories(id) ON DELETE CASCADE,
  product_code VARCHAR(50) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category_id, product_code)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_category_page_products_category ON category_page_products(category_id);
CREATE INDEX IF NOT EXISTS idx_category_page_products_code ON category_page_products(product_code);
CREATE INDEX IF NOT EXISTS idx_category_page_products_active ON category_page_products(is_active);
CREATE INDEX IF NOT EXISTS idx_category_page_products_sort ON category_page_products(sort_order);

-- 创建更新触发器
CREATE OR REPLACE FUNCTION update_category_page_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_category_page_products ON category_page_products;
CREATE TRIGGER trigger_update_category_page_products
  BEFORE UPDATE ON category_page_products
  FOR EACH ROW
  EXECUTE FUNCTION update_category_page_products_updated_at();

-- ============================================
-- 2. 迁移数据：从 category_page_product_codes 迁移
-- ============================================
INSERT INTO category_page_products (category_id, product_code, sort_order, is_active)
SELECT 
  cpc.id as category_id,
  cppc.product_code,
  cppc.sort_order,
  cppc.is_active
FROM category_page_product_codes cppc
JOIN category_page_categories cpc ON cpc.name = cppc.category_name
ON CONFLICT (category_id, product_code) DO NOTHING;

-- ============================================
-- 3. 迁移数据：从 category_management 迁移商品编码
-- ============================================
-- 将 category_management 的 product_codes 迁移到 category_page_products
-- 关联关系：category_page_categories.category_id -> category_management.id

-- 创建临时函数来拆分商品编码
CREATE OR REPLACE FUNCTION migrate_category_management_products()
RETURNS void AS $$
DECLARE
  rec RECORD;
  codes TEXT[];
  code TEXT;
  idx INTEGER;
  target_category_id INTEGER;
BEGIN
  -- 遍历所有有 product_codes 的 category_management 记录
  FOR rec IN 
    SELECT cm.id as cm_id, cm.product_codes, cm.parent_id
    FROM category_management cm
    WHERE cm.product_codes IS NOT NULL AND cm.product_codes != ''
  LOOP
    -- 找到关联的 category_page_categories (通过 parent_id)
    -- category_page_categories.category_id 指向 category_management 的一级分类
    FOR target_category_id IN
      SELECT cpc.id 
      FROM category_page_categories cpc
      WHERE cpc.category_id = rec.parent_id
    LOOP
      -- 拆分商品编码
      codes := string_to_array(rec.product_codes, ';');
      idx := 0;
      FOREACH code IN ARRAY codes
      LOOP
        code := trim(code);
        IF code != '' THEN
          INSERT INTO category_page_products (category_id, product_code, sort_order, is_active)
          VALUES (target_category_id, code, idx, true)
          ON CONFLICT (category_id, product_code) DO NOTHING;
          idx := idx + 1;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 执行迁移
SELECT migrate_category_management_products();

-- 删除临时函数
DROP FUNCTION IF EXISTS migrate_category_management_products();

-- ============================================
-- 4. 更新 category_page_categories 表
-- ============================================
-- 移除对 category_management 的外键依赖（改为可选）
-- 保留 category_id 字段用于向后兼容，但不再强制使用

-- 添加新字段：直接存储分类来源类型
ALTER TABLE category_page_categories 
ADD COLUMN IF NOT EXISTS data_source VARCHAR(50) DEFAULT 'custom';

-- 更新现有数据的 data_source
UPDATE category_page_categories SET data_source = 'custom' WHERE category_id IS NULL;
UPDATE category_page_categories SET data_source = 'category_management' WHERE category_id IS NOT NULL;

-- ============================================
-- 5. 验证迁移结果
-- ============================================
DO $$
DECLARE
  old_count INTEGER;
  new_count INTEGER;
BEGIN
  -- 检查 category_page_product_codes 数据量
  SELECT COUNT(*) INTO old_count FROM category_page_product_codes;
  
  -- 检查 category_page_products 数据量
  SELECT COUNT(*) INTO new_count FROM category_page_products;
  
  RAISE NOTICE '迁移完成: category_page_product_codes 有 % 条, category_page_products 有 % 条', old_count, new_count;
  
  -- 如果新表数据量少于旧表，发出警告
  IF new_count < old_count THEN
    RAISE WARNING '警告: 新表数据量少于旧表，请检查迁移是否完整';
  END IF;
END $$;

-- ============================================
-- 6. 保留旧表，添加废弃标记（稳妥起见）
-- ============================================
COMMENT ON TABLE category_page_product_codes IS '已废弃：数据已迁移到 category_page_products 表';
COMMENT ON TABLE category_page_cards IS '已废弃：未使用的卡片表';

-- ============================================
-- 7. 输出迁移统计
-- ============================================
SELECT 
  cpc.name as category_name,
  COUNT(cpp.id) as product_count
FROM category_page_categories cpc
LEFT JOIN category_page_products cpp ON cpp.category_id = cpc.id AND cpp.is_active = true
GROUP BY cpc.id, cpc.name
ORDER BY cpc.sort_order;

COMMIT;

-- ============================================
-- 说明
-- ============================================
-- 
-- 迁移后的数据获取方式统一为：
-- 
-- SELECT cpp.product_code
-- FROM category_page_products cpp
-- WHERE cpp.category_id = :category_id AND cpp.is_active = true
-- ORDER BY cpp.sort_order
--
-- 不再需要：
-- 1. 查询 category_page_product_codes (按分类名)
-- 2. 查询 category_management.product_codes (分号分隔)
-- 3. 查询 listed_products (按分类名 fallback)
--
-- 保留 listed_products 表用于：
-- 1. 全局商品清单展示
-- 2. 商品搜索
-- 3. 其他未配置 category_page_products 的场景 fallback
