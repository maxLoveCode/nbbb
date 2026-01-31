# 数据库设计更新日志

## 2024-10-14 更新：移除品牌管理功能

### 背景
根据业务需求，该商城为自有品牌商城，不需要多品牌管理功能，因此移除了品牌相关的表和字段。

### 主要变更

#### 1. 删除的表
- `brands` - 品牌表（完全删除）

#### 2. 修改的表
- `products` 表：
  - 删除 `brand_id` 字段
  - 移除品牌外键约束
  - 删除品牌相关索引

#### 3. 更新的文档
- README.md：更新表数量统计，从40+张表调整为35+张表
- ER_DIAGRAM.md：移除品牌实体及其关系
- 优惠券适用范围：从"全场、指定类目/商品/品牌"调整为"全场、指定类目/商品"

#### 4. 示例数据调整
- `008_insert_sample_data.sql`：
  - 删除品牌示例数据
  - 更新商品数据，移除品牌ID引用
  - 调整统计信息

### 影响范围

#### 正面影响
1. **简化设计**：减少了不必要的表和关系
2. **降低复杂度**：商品管理更加简单直接
3. **提高性能**：减少了一个表的JOIN操作
4. **维护成本**：降低了数据维护的复杂度

#### 需要注意的点
1. **数据迁移**：如果已有品牌数据，需要在应用此变更前做好数据备份
2. **API接口**：相关的品牌查询接口需要相应调整
3. **前端页面**：品牌筛选功能需要移除

### 表数量对比

| 模块 | 变更前 | 变更后 | 说明 |
|------|-------|-------|------|
| 商品模块 | 10张表 | 9张表 | 删除brands表 |
| 订单模块 | 4张表 | 4张表 | 无变化 |
| 营销模块 | 8张表 | 8张表 | 无变化 |
| 用户模块 | 5张表 | 5张表 | 无变化 |
| **总计** | **40+张表** | **35+张表** | **减少5张表** |

### 代码示例

#### 变更前的商品查询：
```sql
SELECT p.*, b.name as brand_name, c.name as category_name
FROM products p
LEFT JOIN brands b ON p.brand_id = b.id  -- 需要JOIN品牌表
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.status = 'on_sale';
```

#### 变更后的商品查询：
```sql
SELECT p.*, c.name as category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id  -- 无需JOIN品牌表
WHERE p.status = 'on_sale';
```

### 迁移指导

如果你已经有使用品牌表的数据，建议按以下步骤迁移：

1. **备份数据**
```bash
pg_dump -t brands -t products your_database > backup_before_brand_removal.sql
```

2. **数据处理**（如需要）
```sql
-- 如果需要保留品牌信息，可以将品牌名称合并到商品名称中
UPDATE products SET 
name = (SELECT brands.name || ' ' || products.name 
        FROM brands 
        WHERE brands.id = products.brand_id)
WHERE brand_id IS NOT NULL;
```

3. **执行新的迁移脚本**
```bash
cd /nbbb/backend/migrations
./run_all_migrations.sh
```

4. **验证数据完整性**
```sql
-- 检查商品数据
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM product_skus;

-- 检查表结构
\d products;
```

### 总结

此次更新使数据库设计更加符合自有品牌商城的业务特点，去除了不必要的复杂度，提高了系统的简洁性和维护性。

**影响的文件列表：**
- `003_create_product_tables.sql` - 删除品牌表，修改商品表
- `007_create_promotion_tables.sql` - 更新优惠券适用范围注释  
- `008_insert_sample_data.sql` - 删除品牌示例数据
- `README.md` - 更新文档说明
- `ER_DIAGRAM.md` - 移除品牌实体关系图
- `CHANGES.md` - 新增：本变更日志

---
**更新时间：** 2024-10-14  
**版本：** v1.1 (自有品牌版)
