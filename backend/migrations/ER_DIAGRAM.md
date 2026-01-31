# 服装电商数据库ER图

## 核心实体关系图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          服装电商数据库 ER 图                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│    users     │ 用户表
├──────────────┤
│ id (PK)      │
│ openid       │
│ nickname     │
│ mobile       │
└──────┬───────┘
       │
       │ 1:N
       ├────────────────────────────────────────────┐
       │                                            │
       ▼                                            ▼
┌──────────────┐                            ┌──────────────┐
│user_sessions │ 会话表                      │user_members  │ 会员信息
├──────────────┤                            ├──────────────┤
│ id (PK)      │                            │ id (PK)      │
│ user_id (FK) │                            │ user_id (FK) │
│ session_key  │                            │ level_id (FK)│
└──────────────┘                            │ points       │
                                            └──────┬───────┘
                                                   │
                                                   │ N:1
                                                   ▼
                                            ┌──────────────┐
                                            │member_levels │ 会员等级
                                            ├──────────────┤
                                            │ id (PK)      │
                                            │ name         │
                                            │ discount_%   │
                                            └──────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              商品体系                                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│ categories   │ 类目（3级）
├──────────────┤
│ id (PK)      │
│ parent_id(FK)│◄──┐ 自关联
│ name         │   │
│ level        │   │
└──────┬───────┘   │
       │           │
       └───────────┘
       
┌──────────────┐        1:N        ┌──────────────┐
│  products    │◄───────────────────│product_images│ 商品图片
│  (SPU)       │                    ├──────────────┤
├──────────────┤                    │ id (PK)      │
│ id (PK)      │                    │ product_id(FK)│
│ spu_code     │                    │ image_url    │
│ name         │                    │ color        │
│ category_id  │                    │ type         │
│ price        │
│ material     │
│ season       │        1:N        ┌──────────────┐
│ style        │◄───────────────────│product_skus  │ SKU
│ gender       │                    │  (库存单元)   │
└──────┬───────┘                    ├──────────────┤
       │                            │ id (PK)      │
       │                            │ product_id(FK)│
       │                            │ sku_code     │
       │ 1:N                        │ color        │
       ├────────────────────────────┤ size         │
       │                            │ stock        │
       │                            │ price        │
       ▼                            └──────┬───────┘
┌──────────────┐                          │
│ size_charts  │ 尺码对照表                 │
├──────────────┤                          │
│ id (PK)      │                          │
│ product_id(FK)│                         │
│ size_code    │                          │
│ bust         │                          │
│ waist        │                          │
│ hip          │                          │
│ shoulder_w   │                          │
└──────────────┘                          │
                                          │
       ┌──────────────┐                  │
       │product_reviews│ 商品评价          │
       ├──────────────┤                  │
       │ id (PK)      │                  │
       │ product_id(FK)│──────────────────┘
       │ user_id (FK) │
       │ sku_id (FK)  │
       │ rating       │
       │ size_fit     │
       └──────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          购物流程                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│    users     │
└──────┬───────┘
       │
       │ 1:N
       ├──────────────────┬──────────────────┬──────────────────┐
       │                  │                  │                  │
       ▼                  ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│shopping_cart │   │  favorites   │  │browse_history│  │user_addresses│
│   购物车      │   │    收藏       │  │   浏览历史    │  │  收货地址     │
├──────────────┤   ├──────────────┤  ├──────────────┤  ├──────────────┤
│ id (PK)      │   │ id (PK)      │  │ id (PK)      │  │ id (PK)      │
│ user_id (FK) │   │ user_id (FK) │  │ user_id (FK) │  │ user_id (FK) │
│ sku_id (FK)  │   │ product_id   │  │ product_id   │  │ receiver_name│
│ quantity     │   └──────────────┘  └──────────────┘  │ province     │
└──────────────┘                                       │ city         │
                                                       │ detail_addr  │
                                                       │ is_default   │
                                                       └──────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              订单系统                                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│    users     │
└──────┬───────┘
       │
       │ 1:N
       ▼
┌──────────────────┐        1:N         ┌──────────────────┐
│     orders       │◄────────────────────│  order_items     │ 订单明细
│    订单主表       │                     ├──────────────────┤
├──────────────────┤                     │ id (PK)          │
│ id (PK)          │                     │ order_id (FK)    │
│ order_no         │                     │ product_id (FK)  │
│ user_id (FK)     │                     │ sku_id (FK)      │
│ total_amount     │                     │ product_name     │
│ pay_amount       │                     │ color            │
│ status           │                     │ size             │
│ receiver_name    │ ◄─ 地址快照          │ price            │
│ receiver_phone   │                     │ quantity         │
│ receiver_address │                     │ total_amount     │
│ shipping_company │                     │ refund_status    │
│ shipping_no      │                     └────────┬─────────┘
└────────┬─────────┘                             │
         │                                       │
         │ 1:N                                   │
         ▼                                       │ N:1
┌──────────────────┐                            │
│order_status_hist │ 状态历史                    │
├──────────────────┤                            │
│ id (PK)          │                            │
│ order_id (FK)    │                            ▼
│ status           │                     ┌──────────────────┐
│ operator_type    │                     │  order_refunds   │ 退款/售后
│ created_at       │                     ├──────────────────┤
└──────────────────┘                     │ id (PK)          │
                                         │ refund_no        │
                                         │ order_id (FK)    │
                                         │ order_item_id(FK)│
                                         │ user_id (FK)     │
                                         │ refund_type      │
                                         │ reason           │
                                         │ refund_amount    │
                                         │ status           │
                                         └──────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            营销促销                                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   coupons    │ 优惠券
├──────────────┤
│ id (PK)      │
│ name         │
│ code         │
│ type         │
│ discount_amt │
│ min_amount   │
└──────┬───────┘
       │
       │ 1:N
       ▼
┌──────────────┐
│user_coupons  │ 用户优惠券
├──────────────┤
│ id (PK)      │
│ user_id (FK) │
│ coupon_id(FK)│
│ status       │
│ order_id (FK)│
└──────────────┘

┌──────────────┐        1:N         ┌──────────────────┐
│  promotions  │◄────────────────────│promotion_products│ 促销商品
│   促销活动    │                     ├──────────────────┤
├──────────────┤                     │ id (PK)          │
│ id (PK)      │                     │ promotion_id (FK)│
│ name         │                     │ product_id (FK)  │
│ type         │                     │ sku_id (FK)      │
│ start_time   │                     │ promotion_price  │
│ end_time     │                     │ promotion_stock  │
│ rules (JSON) │                     │ limit_per_user   │
└──────────────┘                     └──────────────────┘

┌──────────────────┐
│full_reduction_   │ 满减规则
│      rules       │
├──────────────────┤
│ id (PK)          │
│ name             │
│ threshold        │ 门槛
│ reduction_amount │ 减免金额
│ applicable_type  │
└──────────────────┘

┌──────────────┐
│point_records │ 积分明细
├──────────────┤
│ id (PK)      │
│ user_id (FK) │
│ points       │
│ balance      │
│ source_type  │
│ created_at   │
└──────────────┘
```

## 关键关系说明

### 1. SPU-SKU关系（1:N）
- 一个SPU（商品款式）可以有多个SKU（具体规格）
- SKU = SPU + 颜色 + 尺码

### 2. 用户-订单关系（1:N）
- 一个用户可以有多个订单
- 一个订单属于一个用户

### 3. 订单-订单明细关系（1:N）
- 一个订单可以包含多个商品
- 每个订单明细对应一个SKU

### 4. 订单-退款关系（1:N）
- 一个订单可以有多个退款单
- 每个退款单可以针对整个订单或单个商品

### 5. 商品-图片关系（1:N）
- 一个商品可以有多张图片
- 图片可以关联到特定颜色

### 6. 商品-评价关系（1:N）
- 一个商品可以有多条评价
- 评价可以具体到某个SKU

### 7. 用户-优惠券关系（M:N）
- 通过 `user_coupons` 中间表
- 一个用户可以领取多张优惠券
- 一张优惠券可以被多个用户领取

## 数据完整性约束

### 外键约束
- `ON DELETE CASCADE`: 级联删除（如删除用户时删除购物车）
- `ON DELETE RESTRICT`: 限制删除（如删除商品前必须先处理订单）
- `ON DELETE SET NULL`: 设为NULL（如删除类目时商品的类目ID设为NULL）

### 唯一性约束
- `users.openid` - 微信OpenID唯一
- `products.spu_code` - SPU编码唯一
- `product_skus.sku_code` - SKU编码唯一
- `orders.order_no` - 订单号唯一

### 检查约束
- `product_reviews.rating` - 评分必须在1-5之间
- `order_items.quantity` - 数量必须大于0

## 索引策略

### 主键索引
- 所有表的 `id` 字段

### 外键索引
- 所有外键字段自动建立索引

### 业务索引
- `products(category_id, status)` - 商品分类查询
- `orders(user_id, status, created_at)` - 用户订单查询
- `product_skus(product_id, color, size)` - SKU查询
- `user_coupons(user_id, status)` - 用户可用优惠券

## 触发器

### 自动更新时间
- `update_updated_at_column()` - 更新 `updated_at` 字段

### 业务逻辑
- `check_default_address()` - 确保每个用户只有一个默认地址
- `record_order_status_change()` - 自动记录订单状态变更历史

## 数据字典链接

完整的字段说明请参考 `README.md` 文档。

