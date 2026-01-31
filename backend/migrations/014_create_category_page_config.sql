-- ============================================
-- 分类页配置管理表
-- ============================================

-- 分类页分类配置表
CREATE TABLE IF NOT EXISTS category_page_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,  -- 分类名称（博主甄选、人宠同款、男款上装等）
    type VARCHAR(20) NOT NULL CHECK (type IN ('cards', 'products')),  -- 类型：cards 或 products
    source VARCHAR(20) NOT NULL CHECK (source IN ('category', 'activity', 'promotion')),  -- 数据来源
    category_id INTEGER REFERENCES category_management(id),  -- 关联的分类ID（source=category时使用）
    image TEXT,  -- 分类图片URL（可选）
    description TEXT,  -- 分类描述（可选）
    sort_order INTEGER DEFAULT 0,  -- 排序（数字越小越靠前）
    is_active BOOLEAN DEFAULT true,  -- 是否启用
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 分类页卡片配置表（用于type=cards的activity类型分类）
CREATE TABLE IF NOT EXISTS category_page_cards (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES category_page_categories(id) ON DELETE CASCADE,  -- 所属分类ID
    title VARCHAR(255) NOT NULL,  -- 卡片标题
    image TEXT NOT NULL,  -- 卡片图片URL
    link VARCHAR(500),  -- 跳转链接
    sort_order INTEGER DEFAULT 0,  -- 排序
    is_active BOOLEAN DEFAULT true,  -- 是否启用
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_category_page_categories_source ON category_page_categories(source);
CREATE INDEX IF NOT EXISTS idx_category_page_categories_type ON category_page_categories(type);
CREATE INDEX IF NOT EXISTS idx_category_page_categories_sort ON category_page_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_category_page_categories_active ON category_page_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_category_page_cards_category ON category_page_cards(category_id);
CREATE INDEX IF NOT EXISTS idx_category_page_cards_sort ON category_page_cards(sort_order);
CREATE INDEX IF NOT EXISTS idx_category_page_cards_active ON category_page_cards(is_active);

-- 创建触发器自动更新updated_at
CREATE OR REPLACE FUNCTION update_category_page_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_category_page_categories_updated_at
    BEFORE UPDATE ON category_page_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_category_page_updated_at();

CREATE TRIGGER update_category_page_cards_updated_at
    BEFORE UPDATE ON category_page_cards
    FOR EACH ROW
    EXECUTE FUNCTION update_category_page_updated_at();

-- 插入默认分类配置
INSERT INTO category_page_categories (name, type, source, sort_order, description) VALUES
('博主甄选', 'cards', 'activity', 1, '博主精选好物'),
('人宠同款', 'cards', 'activity', 2, '人宠同款精选'),
('男款上装', 'products', 'category', 3, '男款上装精选'),
('男款下装', 'products', 'category', 4, '男款下装精选'),
('女款上装', 'products', 'category', 5, '女款上装精选'),
('女款下装', 'products', 'category', 6, '女款下装精选'),
('宠物', 'products', 'category', 7, '宠物用品精选'),
('帽子', 'products', 'category', 8, '帽子配饰精选'),
('服饰', 'products', 'category', 9, '服饰配饰精选')
ON CONFLICT (name) DO NOTHING;

-- 插入默认卡片数据（博主甄选）
INSERT INTO category_page_cards (category_id, title, image, link, sort_order)
SELECT 
    c.id,
    t.title,
    t.image,
    t.link,
    t.sort_order
FROM category_page_categories c
CROSS JOIN (VALUES
    ('时尚女装', 'https://example.com/card1.jpg', '/pages/goods/list/index?categoryId=1', 1),
    ('潮流男装', 'https://example.com/card2.jpg', '/pages/goods/list/index?categoryId=2', 2)
) AS t(title, image, link, sort_order)
WHERE c.name = '博主甄选'
ON CONFLICT DO NOTHING;

-- 插入默认卡片数据（人宠同款）
INSERT INTO category_page_cards (category_id, title, image, link, sort_order)
SELECT 
    c.id,
    t.title,
    t.image,
    t.link,
    t.sort_order
FROM category_page_categories c
CROSS JOIN (VALUES
    ('人宠同款T恤', 'https://example.com/card3.jpg', '/pages/goods/list/index?categoryId=3', 1),
    ('人宠同款配饰', 'https://example.com/card4.jpg', '/pages/goods/list/index?categoryId=4', 2)
) AS t(title, image, link, sort_order)
WHERE c.name = '人宠同款'
ON CONFLICT DO NOTHING;

-- 添加注释
COMMENT ON TABLE category_page_categories IS '分类页分类配置表';
COMMENT ON TABLE category_page_cards IS '分类页卡片配置表（用于activity类型的cards分类）';

-- 提示信息
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE '分类页配置表创建完成！';
    RAISE NOTICE '============================================';
    RAISE NOTICE '已创建：';
    RAISE NOTICE '- category_page_categories: 分类页分类配置表（9个默认分类）';
    RAISE NOTICE '- category_page_cards: 分类页卡片配置表';
    RAISE NOTICE '============================================';
END $$;
