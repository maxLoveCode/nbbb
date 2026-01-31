-- 清理不需要的表和迁移文件
-- 这个脚本用于清理开发过程中创建的不需要的表

-- 注意：由于权限限制，我们无法删除 postgres 用户拥有的表
-- 但我们可以清理 admin 用户拥有的表

-- 如果 category_management 表不再需要，可以取消注释下面的行
-- DROP TABLE IF EXISTS category_management CASCADE;

-- 清理完成后的表结构应该是：
-- - users (用户表)
-- - user_sessions (用户会话表) 
-- - products (商品表)
-- - product_images (商品图片表)
-- - categories (分类表)
-- - orders (订单表)
-- - order_items (订单项表)
-- - cart_items (购物车项表)

-- 当前保留的表说明：
-- categories: 现有的分类表，属于 postgres 用户
-- category_management: 新的分类管理表，属于 admin 用户
-- 其他表: 核心业务表，需要保留

