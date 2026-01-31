# 分类系统数据备份

> 备份时间: 2026-01-31
> 用途: 重构分类系统前的完整数据备份

---

## 1. category_page_categories (分类页配置)

| id | name | type | source | category_id | description | sort_order |
|----|------|------|--------|-------------|-------------|------------|
| 1 | 博主甄选 | products | category | NULL | 博主精选好物 | 1 |
| 2 | 人宠同款 | products | category | NULL | 人宠同款精选 | 2 |
| 3 | 男款上装 | products | category | 1 | 男款上装精选 | 3 |
| 4 | 男款下装 | products | category | 1 | 男款下装精选 | 4 |
| 5 | 女款上装 | products | category | 1 | 女款上装精选 | 5 |
| 6 | 女款下装 | products | category | 1 | 女款下装精选 | 6 |
| 7 | 宠物 | products | category | 2 | 宠物用品精选 | 7 |
| 8 | 帽子 | products | category | NULL | 帽子配饰精选 | 8 |
| 9 | 服饰 | products | category | NULL | 服饰配饰精选 | 9 |
| 10 | 配饰 | products | category | NULL | 配饰精选 | 10 |

---

## 2. category_page_cards (分类页卡片 - 未使用)

| id | category_id | title | image | link |
|----|-------------|-------|-------|------|
| 1 | 1 | 时尚女装 | https://example.com/card1.jpg | /pages/goods/list/index?categoryId=1 |
| 2 | 1 | 潮流男装 | https://example.com/card2.jpg | /pages/goods/list/index?categoryId=2 |
| 3 | 2 | 人宠同款T恤 | https://example.com/card3.jpg | /pages/goods/list/index?categoryId=3 |
| 4 | 2 | 人宠同款配饰 | https://example.com/card4.jpg | /pages/goods/list/index?categoryId=4 |

---

## 3. category_page_product_codes (分类页商品编码映射)

### 博主甄选 (13个商品)
```
NBB-AW003B, NBB-AWZ001, NBB-AWC002, NBB-AWJ006, NBB-AWJ005,
NBB-AWJ004, NBB-25AW016, NBB-AWC005, NBB-25AW020, NBB-25AW002,
NBB-AWTR005, NBB-AWD002, NBB-25AWC008
```

### 人宠同款 (15个商品)
```
NBB-AWC002, NBB-25AW007, NBB-AWJ003, NBB-25AW004, NBB-AWJ005,
NBB-AWJ002, NBB-AWTR008, NBB-25AW002, NBB-AWJ001A, NBB-AWTR001A,
NBB-25AW001B, NBB-AWD001, NBB-25AW008, NBB-AW003B, NBB-AWD002
```

---

## 4. category_management (选购页二级分类)

### 一级分类
| id | name | sort_order |
|----|------|------------|
| 1 | 2025FW | 1 |
| 2 | 2025FW宠物 | 2 |
| 3 | 2025FW搭配 | 3 |
| 4 | 外套 | 4 |
| 5 | 上装 | 5 |
| 6 | 下装 | 6 |
| 7 | 人宠同款 | 7 |
| 8 | 男女同款 | 8 |

### 二级分类 (parent_id=1, 即 2025FW)
| id | name | product_codes |
|----|------|---------------|
| 9 | 休闲裤 | NBB-AWTR004;NBB-AWTR003;NBB-AWTR007;NBB-AWTR005 |
| 10 | 牛仔裤 | NBB-AWTR006;NBB-AWTR008 |
| 11 | 西裤 | NBB-AWTR009;NBB-AWTR010 |
| 12 | 卫衣 | NBB-AWTR011;NBB-AWTR012 |
| 13 | 毛衣针织 | NBB-AWTR013;NBB-AWTR014 |

---

## 5. categories (商品分类 - 从聚水潭导入)

### 一级分类
| id | name | description |
|----|------|-------------|
| 4 | 女装 | 女装/女士精品 |
| 5 | 配饰 | 服饰配件/皮带/帽子/围巾 |
| 6 | 宠物 | 宠物/宠物食品及用品 |
| 7 | 其他 | 其他 |

### 二级分类
| id | name | parent_id (parent_name) |
|----|------|-------------------------|
| 8 | 羽绒服 | 4 (女装) |
| 9 | 西装 | 4 (女装) |
| 10 | 卫衣/绒衫 | 4 (女装) |
| 11 | 卫裤 | 4 (女装) |
| 12 | 皮衣 | 4 (女装) |
| 13 | 牛仔裤 | 4 (女装) |
| 14 | 棉衣/棉服 | 4 (女装) |
| 15 | 毛针织衫 | 4 (女装) |
| 16 | 毛衣 | 4 (女装) |
| 17 | 毛呢外套 | 4 (女装) |
| 18 | 裤子 | 4 (女装) |
| 19 | 短外套 | 4 (女装) |
| 20 | T恤 | 4 (女装) |
| 21 | 鞋包/皮带配件 | 5 (配饰) |
| 22 | 帽子 | 5 (配饰) |
| 23 | 宠物服饰及配件 | 6 (宠物) |
| 24 | 赠品 | 7 (其他) |

---

## 6. listed_products (上架商品清单)

### 按分类统计
| category | count | 商品编码 |
|----------|-------|----------|
| 羽绒服 | 3 | NBB-AWC004, NBB-25AWC008, NBB-AWC005 |
| 西装 | 2 | NBB-AWJ005, NBB-AWJ002 |
| 卫衣/绒衫 | 1 | NBB-AWD002 |
| 卫裤 | 1 | NBB-AWTR005 |
| 皮衣 | 3 | NBB-AWJ006, NBB-AWJ004, NBB-AWJ003 |
| 牛仔裤 | 1 | NBB-AWTR001A |
| 棉衣/棉服 | 1 | NBB-AWC002 |
| 毛针织衫 | 3 | NBB-AWT003, NBB-AWKN001B, NBB-AWKN001A |
| 毛衣 | 1 | NBB-AWKN002 |
| 毛呢外套 | 3 | NBB-AWC001, NBB-25AWC007, NBB-AWD001 |
| 裤子 | 5 | NBB-AWTR010, NBB-AWTR003, NBB-AWTR004, NBB-AWTR008, NBB-AWTR007 |
| 短外套 | 1 | NBB-AWJ001A |
| T恤 | 2 | NBB-AWT001, NBB-AWT002 |
| 鞋包/皮带配件 | 1 | NBB-AWZ001 |
| 帽子 | 2 | NBB-AWH002, NBB-AWH001 |
| 宠物服饰及配件 | 12 | NBB-25AW011, NBB-25AW020, NBB-25AW009, NBB-25AW005, NBB-25AW016, NBB-AW003B, NBB-25AW004, NBB-25AW001B, NBB-25AW007, NBB-25AW014, NBB-25AW002, NBB-25AW008 |

### 完整商品列表 (42个)
```sql
NBB-AWC004, NBB-25AWC008, NBB-AWC005, NBB-AWJ005, NBB-AWJ002,
NBB-AWD002, NBB-AWTR005, NBB-AWJ006, NBB-AWJ004, NBB-AWJ003,
NBB-AWTR001A, NBB-AWC002, NBB-AWT003, NBB-AWKN001B, NBB-AWKN001A,
NBB-AWKN002, NBB-AWC001, NBB-25AWC007, NBB-AWD001, NBB-AWTR010,
NBB-AWTR003, NBB-AWTR004, NBB-AWTR008, NBB-AWTR007, NBB-AWJ001A,
NBB-AWT001, NBB-AWT002, NBB-AWZ001, NBB-AWH002, NBB-AWH001,
NBB-25AW011, NBB-25AW020, NBB-25AW009, NBB-25AW005, NBB-25AW016,
NBB-AW003B, NBB-25AW004, NBB-25AW001B, NBB-25AW007, NBB-25AW014,
NBB-25AW002, NBB-25AW008
```

---

## 7. 数据恢复 SQL

如需恢复数据，可执行以下 SQL：

```sql
-- 恢复 category_page_categories
INSERT INTO category_page_categories (id, name, type, source, category_id, description, sort_order, is_active)
VALUES 
  (1, '博主甄选', 'products', 'category', NULL, '博主精选好物', 1, true),
  (2, '人宠同款', 'products', 'category', NULL, '人宠同款精选', 2, true),
  (3, '男款上装', 'products', 'category', 1, '男款上装精选', 3, true),
  (4, '男款下装', 'products', 'category', 1, '男款下装精选', 4, true),
  (5, '女款上装', 'products', 'category', 1, '女款上装精选', 5, true),
  (6, '女款下装', 'products', 'category', 1, '女款下装精选', 6, true),
  (7, '宠物', 'products', 'category', 2, '宠物用品精选', 7, true),
  (8, '帽子', 'products', 'category', NULL, '帽子配饰精选', 8, true),
  (9, '服饰', 'products', 'category', NULL, '服饰配饰精选', 9, true),
  (10, '配饰', 'products', 'category', NULL, '配饰精选', 10, true)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, type = EXCLUDED.type, source = EXCLUDED.source,
  category_id = EXCLUDED.category_id, description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

-- 恢复博主甄选商品编码
INSERT INTO category_page_product_codes (category_name, product_code, sort_order, is_active)
VALUES 
  ('博主甄选', 'NBB-AW003B', 0, true),
  ('博主甄选', 'NBB-AWZ001', 1, true),
  ('博主甄选', 'NBB-AWC002', 2, true),
  ('博主甄选', 'NBB-AWJ006', 3, true),
  ('博主甄选', 'NBB-AWJ005', 4, true),
  ('博主甄选', 'NBB-AWJ004', 5, true),
  ('博主甄选', 'NBB-25AW016', 6, true),
  ('博主甄选', 'NBB-AWC005', 7, true),
  ('博主甄选', 'NBB-25AW020', 8, true),
  ('博主甄选', 'NBB-25AW002', 9, true),
  ('博主甄选', 'NBB-AWTR005', 10, true),
  ('博主甄选', 'NBB-AWD002', 11, true),
  ('博主甄选', 'NBB-25AWC008', 12, true)
ON CONFLICT (category_name, product_code) DO NOTHING;

-- 恢复人宠同款商品编码
INSERT INTO category_page_product_codes (category_name, product_code, sort_order, is_active)
VALUES 
  ('人宠同款', 'NBB-AWC002', 0, true),
  ('人宠同款', 'NBB-25AW007', 1, true),
  ('人宠同款', 'NBB-AWJ003', 2, true),
  ('人宠同款', 'NBB-25AW004', 3, true),
  ('人宠同款', 'NBB-AWJ005', 4, true),
  ('人宠同款', 'NBB-AWJ002', 5, true),
  ('人宠同款', 'NBB-AWTR008', 6, true),
  ('人宠同款', 'NBB-25AW002', 7, true),
  ('人宠同款', 'NBB-AWJ001A', 8, true),
  ('人宠同款', 'NBB-AWTR001A', 9, true),
  ('人宠同款', 'NBB-25AW001B', 10, true),
  ('人宠同款', 'NBB-AWD001', 11, true),
  ('人宠同款', 'NBB-25AW008', 12, true),
  ('人宠同款', 'NBB-AW003B', 13, true),
  ('人宠同款', 'NBB-AWD002', 14, true)
ON CONFLICT (category_name, product_code) DO NOTHING;
```

---

## 8. Excel 数据来源

- `商品表.xlsx` - 上架商品主数据
- `博主甄选、人宠同款分类页.xlsx` - 博主甄选和人宠同款的商品编码

---

*备份完成*
