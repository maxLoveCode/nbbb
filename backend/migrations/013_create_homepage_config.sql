-- ============================================
-- 首页配置管理表
-- ============================================

-- 1. 首页轮播图配置表 (banners)
CREATE TABLE IF NOT EXISTS homepage_banners (
    id SERIAL PRIMARY KEY,
    type VARCHAR(10) NOT NULL CHECK (type IN ('image', 'video')),  -- 类型：image 或 video
    image TEXT,  -- 图片URL（type=image时必填，type=video时为null）
    video TEXT,  -- 视频URL（type=video时必填，type=image时为null）
    title VARCHAR(255),  -- 标题
    subtitle VARCHAR(255),  -- 副标题
    brand_name VARCHAR(100) DEFAULT 'NOT-BORING BOREBOI',  -- 品牌名称
    button_text VARCHAR(50),  -- 按钮文字
    button_action VARCHAR(20) CHECK (button_action IN ('explore', 'products', 'detail')),  -- 按钮动作
    link VARCHAR(500),  -- 跳转链接
    sort_order INTEGER DEFAULT 0,  -- 排序（数字越小越靠前）
    is_active BOOLEAN DEFAULT true,  -- 是否启用
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 横向轮播配置表 (lowerSwiper)
CREATE TABLE IF NOT EXISTS homepage_lower_swiper (
    id SERIAL PRIMARY KEY,
    image TEXT NOT NULL,  -- 图片URL（必填）
    title VARCHAR(255),  -- 标题
    link VARCHAR(500),  -- 跳转链接
    sort_order INTEGER DEFAULT 0,  -- 排序
    is_active BOOLEAN DEFAULT true,  -- 是否启用
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 三图展示配置表 (threeImages)
CREATE TABLE IF NOT EXISTS homepage_three_images (
    id SERIAL PRIMARY KEY,
    image TEXT NOT NULL,  -- 图片URL（必填）
    link VARCHAR(500),  -- 跳转链接
    sort_order INTEGER DEFAULT 0,  -- 排序
    is_active BOOLEAN DEFAULT true,  -- 是否启用
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_homepage_banners_sort ON homepage_banners(sort_order);
CREATE INDEX IF NOT EXISTS idx_homepage_banners_active ON homepage_banners(is_active);
CREATE INDEX IF NOT EXISTS idx_homepage_lower_swiper_sort ON homepage_lower_swiper(sort_order);
CREATE INDEX IF NOT EXISTS idx_homepage_lower_swiper_active ON homepage_lower_swiper(is_active);
CREATE INDEX IF NOT EXISTS idx_homepage_three_images_sort ON homepage_three_images(sort_order);
CREATE INDEX IF NOT EXISTS idx_homepage_three_images_active ON homepage_three_images(is_active);

-- 插入默认数据（可选，用于初始化）
-- Banners
INSERT INTO homepage_banners (type, image, video, title, subtitle, brand_name, button_text, button_action, link, sort_order) VALUES
('video', NULL, 'https://nbbb.oss-cn-hangzhou.aliyuncs.com/0822_1.mp4', '甄选好物 传递爱意', '优雅生活，品质之选', 'NOT-BORING BOREBOI', '探索系列', 'explore', '/pages/goods/list/index', 1),
('video', NULL, 'https://nbbb.oss-cn-hangzhou.aliyuncs.com/0822_2.mp4', '夏日精选 清凉一夏', '品质生活，从这里开始', 'NOT-BORING BOREBOI', '立即选购', 'products', '/pages/category/index', 2),
('image', 'https://tdesign.gtimg.com/miniprogram/template/retail/home/v2/banner3.png', NULL, '新品上市 限时特惠', '独特设计，彰显个性', 'NOT-BORING BOREBOI', '查看详情', 'detail', '/pages/goods/details/index', 3)
ON CONFLICT DO NOTHING;

-- Lower Swiper
INSERT INTO homepage_lower_swiper (image, title, link, sort_order) VALUES
('https://nbbb.oss-cn-hangzhou.aliyuncs.com/image-0.png', '女士小皮具', '/pages/goods/list/index?category=women-leather', 1),
('https://nbbb.oss-cn-hangzhou.aliyuncs.com/image-1.png', '皮质手袋精选', '/pages/goods/list/index?category=leather-bags', 2),
('https://nbbb.oss-cn-hangzhou.aliyuncs.com/image-2.png', '男士精选', '/pages/goods/list/index?category=men-collection', 3)
ON CONFLICT DO NOTHING;

-- Three Images
INSERT INTO homepage_three_images (image, link, sort_order) VALUES
('https://nbbb.oss-cn-hangzhou.aliyuncs.com/image-4.png', '/pages/goods/list/index?category=featured', 1),
('https://nbbb.oss-cn-hangzhou.aliyuncs.com/image-5.png', '/pages/goods/list/index?category=new', 2),
('https://nbbb.oss-cn-hangzhou.aliyuncs.com/image-6.png', '/pages/goods/list/index?category=hot', 3)
ON CONFLICT DO NOTHING;

-- 添加注释
COMMENT ON TABLE homepage_banners IS '首页轮播图配置表';
COMMENT ON TABLE homepage_lower_swiper IS '首页横向轮播配置表';
COMMENT ON TABLE homepage_three_images IS '首页三图展示配置表';

