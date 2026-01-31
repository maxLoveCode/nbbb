# 服装电商数据库设计文档

## 概览

这是一套完整的服装电商数据库设计，专为自有品牌商城打造，包含9大模块、35+张表，涵盖商品管理、订单处理、营销促销、用户体系等核心功能。

## 数据库迁移文件执行顺序

1. `001_create_users_and_sessions.sql` - 用户和会话表
2. `002_update_users_for_wechat.sql` - 微信登录支持
3. `003_create_product_tables.sql` - 商品核心表
4. `004_create_cart_and_favorite.sql` - 购物车和收藏
5. `005_create_address_tables.sql` - 收货地址
6. `006_create_order_tables.sql` - 订单相关表
7. `007_create_promotion_tables.sql` - 营销促销表
8. `009_create_admin_tables.sql` - 后台管理员表
9. `008_insert_sample_data.sql` - 示例数据（可选）

## 数据库表结构说明

### 📦 一、商品管理模块（Product Management）

#### 1. 商品SPU/SKU体系

- **categories** - 商品类目表（支持3级分类）
  - 一级：男装、女装、童装、内衣、配饰
  - 二级：T恤、衬衫、裤装、裙装、外套、毛衣
  - 三级：短袖T恤、长袖T恤、POLO衫

- **products** - 商品SPU表（款式级别）
  - SPU是一款商品的抽象，如"黑色修身长袖衬衫"
  - 包含：基础信息、价格、描述、材质、洗涤说明
  - 服装特有：季节、风格、性别、年龄段
  - 状态标记：新品、热卖、推荐
  - 销售统计：销量、浏览量、收藏量

- **product_skus** - 商品SKU表（库存单元）
  - SKU是可售卖的最小单元：颜色 + 尺码
  - 如："黑色修身长袖衬衫-黑色-L"
  - 包含：价格、库存、重量、SKU图片

- **product_images** - 商品图片表
  - 主图、画廊图、详情图
  - 可关联到特定颜色

#### 2. 商品属性系统

- **product_attributes** - 商品属性定义表
  - 可扩展的属性：厚度、版型、领型、袖型等

- **product_attribute_values** - 商品属性值表
  - 关联具体商品的属性值

#### 3. 尺码系统

- **sizes** - 尺码表（标准尺码定义）
  - XS, S, M, L, XL, XXL, XXXL
  - 或数字尺码：80, 90, 100, 110

- **size_charts** - 尺码对照表
  - 详细尺寸参数：胸围、腰围、臀围、肩宽、袖长、衣长
  - 建议身高体重范围

#### 4. 商品评价

- **product_reviews** - 商品评价表
  - 评分（1-5星）
  - 详细评分：质量、尺码准确度、颜色准确度
  - 尺码反馈：偏小、正常、偏大
  - 晒图、有用数

### 🛒 二、购物流程模块

- **shopping_cart** - 购物车表
  - 用户ID、SKU ID、数量、是否选中

- **favorites** - 收藏表
  - 用户收藏的商品

- **browse_history** - 浏览历史表
  - 记录用户浏览行为

### 📍 三、地址管理模块

- **user_addresses** - 收货地址表
  - 省市区街道、详细地址
  - 收货人、电话
  - 默认地址（自动确保唯一）
  - 地址标签：家、公司、学校

### 📦 四、订单管理模块

#### 1. 订单主流程

- **orders** - 订单主表
  - 订单号、用户ID
  - 金额：商品总额、运费、优惠、实付金额
  - 收货地址快照（防止地址被修改）
  - 订单状态流转：待支付→已支付→已发货→已收货→已完成
  - 支付信息、物流信息
  - 发票信息

- **order_items** - 订单明细表
  - 商品信息快照（防止商品被修改或删除）
  - 价格、数量、小计
  - 退款状态

- **order_status_history** - 订单状态历史表
  - 自动记录订单状态变更
  - 操作人、操作时间、备注

#### 2. 售后服务

- **order_refunds** - 退款/售后表
  - 退款类型：仅退款、退货退款
  - 退款原因、凭证图片
  - 退货物流信息
  - 审核流程、退款完成

### 💰 五、营销促销模块

#### 1. 优惠券系统

- **coupons** - 优惠券表
  - 类型：固定金额、百分比折扣、免运费
  - 使用条件：最低消费金额
  - 适用范围：全场、指定类目/商品
  - 发放数量、每人限领

- **user_coupons** - 用户优惠券表
  - 领取、使用、过期状态

#### 2. 促销活动

- **promotions** - 促销活动表
  - 类型：秒杀、拼团、预售、限时折扣、满减、套装
  - 活动时间、规则（JSON）

- **promotion_products** - 促销商品关联表
  - 促销价格、活动库存、限购

#### 3. 满减规则

- **full_reduction_rules** - 满减规则表
  - 满额减、满件减
  - 多档位设置
  - 可叠加使用

#### 4. 会员体系

- **member_levels** - 会员等级表
  - 普通会员、银卡、金卡、钻石卡
  - 升级条件：累计消费、订单数
  - 会员权益：折扣、积分倍率、包邮、生日券

- **user_members** - 用户会员信息表
  - 成长值、积分
  - 消费统计

- **point_records** - 积分明细表
  - 积分来源：订单、签到、评价、退款、兑换
  - 积分有效期

## 核心设计思想

### 1. SPU vs SKU 设计

```
SPU (Standard Product Unit) - 标准产品单元
└── 一款商品的抽象
    └── 例如："2024春季新款修身长袖衬衫"
        
SKU (Stock Keeping Unit) - 库存保有单元  
└── 可售卖的最小单元 = SPU + 颜色 + 尺码
    └── 例如："2024春季新款修身长袖衬衫-黑色-L"
```

**为什么要分离SPU和SKU？**
- SPU存储商品通用信息（描述、材质、风格等）
- SKU存储具体规格信息（颜色、尺码、库存、价格差异）
- 避免数据冗余，便于管理和查询

### 2. 数据快照设计

**订单数据快照：** 在订单生成时，复制以下数据到订单表：
- 收货地址信息
- 商品信息（名称、规格、图片）
- 价格信息

**原因：**
- 用户可能修改或删除收货地址
- 商品信息可能更新（价格、名称、图片）
- 订单应保持下单时的原始信息

### 3. 软删除 vs 硬删除

- 订单相关表使用 `ON DELETE RESTRICT`（不允许删除）
- 用户相关表使用 `ON DELETE CASCADE`（级联删除）
- 关键业务数据考虑使用软删除（添加 `is_deleted` 字段）

### 4. 触发器自动化

- **自动更新时间：** `update_updated_at_column()`
- **订单状态跟踪：** 自动记录状态变更历史
- **默认地址唯一性：** 确保每个用户只有一个默认地址

## 服装电商特有设计

### 1. 颜色 + 尺码 二维规格

```sql
-- SKU表设计
product_skus (
    color: '黑色',
    size: 'L',
    stock: 100
)
```

### 2. 详细尺码对照表

```sql
-- 尺码对照表
size_charts (
    size_code: 'L',
    bust: 100.0,      -- 胸围
    waist: 82.0,      -- 腰围
    shoulder: 45.0,   -- 肩宽
    sleeve: 58.0,     -- 袖长
    height_min: 170,  -- 建议身高
    height_max: 178
)
```

### 3. 服装专属属性

- **季节：** 春、夏、秋、冬、四季
- **风格：** 休闲、商务、运动、韩版、日系
- **性别：** 男、女、中性、童装
- **材质：** 棉、涤纶、羊毛、丝绸等
- **洗涤说明：** 水洗、干洗、熨烫温度

### 4. 评价中的尺码反馈

```sql
product_reviews (
    size_fit: '偏大' | '正常' | '偏小'  -- 尺码准确度反馈
)
```

## 索引策略

### 高频查询索引

```sql
-- 商品查询
idx_products_category_id
idx_products_status
idx_products_sales_count

-- SKU查询
idx_product_skus_product_id
idx_product_skus_color
idx_product_skus_size

-- 订单查询
idx_orders_user_id
idx_orders_status
idx_orders_created_at
```

### 复合索引建议

```sql
-- 商品搜索（类目 + 状态）
CREATE INDEX idx_products_category_status ON products(category_id, status);

-- 订单查询（用户 + 状态 + 时间）
CREATE INDEX idx_orders_user_status_time ON orders(user_id, status, created_at DESC);
```

## 性能优化建议

### 1. 读写分离
- 主库处理写操作
- 从库处理查询（商品列表、详情、评价等）

### 2. 缓存策略
- **商品信息：** Redis缓存，1小时过期
- **库存数量：** Redis缓存，实时更新
- **购物车：** Redis存储，定期同步数据库

### 3. 分表策略（高并发场景）
- **订单表：** 按月分表或按用户ID分表
- **评价表：** 按商品ID分表
- **积分记录表：** 按时间分表

### 4. 异步处理
- 订单状态变更通知（MQ）
- 销量、浏览量更新（MQ + 定时任务）
- 评价审核（异步队列）

## 业务流程示例

### 下单流程

```
1. 用户选择SKU，加入购物车
2. 进入结算页，选择收货地址
3. 选择优惠券（校验可用性）
4. 创建订单（锁定库存）
   - 订单表插入记录（status: pending_payment）
   - 订单明细表插入商品快照
   - SKU库存扣减（预扣）
5. 发起支付
6. 支付回调
   - 更新订单状态（paid）
   - 确认库存扣减
   - 增加销量
   - 优惠券标记为已使用
   - 记录积分
```

### 退款流程

```
1. 用户申请退款
   - 创建退款单（status: pending）
2. 商家审核
   - 同意：status → approved
   - 拒绝：status → rejected
3. 用户退货（退货退款类型）
   - 填写物流信息
   - status → returning
4. 商家收货，发起退款
   - status → refunding
5. 退款完成
   - status → completed
   - 恢复SKU库存
   - 恢复优惠券
   - 扣减积分
```

## 扩展功能建议

### 1. 搭配推荐
```sql
CREATE TABLE product_combinations (
    id SERIAL PRIMARY KEY,
    main_product_id INTEGER REFERENCES products(id),
    recommend_product_id INTEGER REFERENCES products(id),
    sort_order INTEGER
);
```

### 2. 穿搭指南
```sql
CREATE TABLE style_guides (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200),
    content TEXT,
    cover_image VARCHAR(500),
    product_ids INTEGER[]
);
```

### 3. 预售管理
```sql
ALTER TABLE products ADD COLUMN presale_time TIMESTAMP;
ALTER TABLE products ADD COLUMN ship_days INTEGER;  -- 预计发货天数
```

### 4. 虚拟试衣
```sql
CREATE TABLE virtual_fitting_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    product_id INTEGER REFERENCES products(id),
    user_height DECIMAL(5,2),
    user_weight DECIMAL(5,2),
    user_body_shape VARCHAR(20),
    recommend_size VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 安全性考虑

1. **敏感字段加密**
   - 手机号：AES加密
   - 收货地址：部分脱敏展示

2. **SQL注入防护**
   - 使用参数化查询
   - ORM框架

3. **数据权限**
   - 用户只能查询自己的订单
   - 行级权限控制

4. **审计日志**
   - 关键操作记录（价格修改、库存调整）
   - 管理员操作日志

## 监控指标

- 订单量、GMV（成交总额）
- 商品浏览量、转化率
- 购物车放弃率
- 退款率
- 平均客单价
- 复购率
- 会员增长率
- 库存周转率

---

**版本：** 1.0  
**更新时间：** 2025-10-14  
**数据库：** PostgreSQL 12+

