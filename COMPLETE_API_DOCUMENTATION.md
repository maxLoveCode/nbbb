# NBBB 完整 API 接口文档

## 📋 接口概览

本文档包含 NBBB 电商系统的所有 API 接口。

**基础信息**：
- 服务器地址：`https://not-boringboreboi.com`
- API 前缀：`/api`
- 认证方式：Bearer Token（大部分接口需要）

---

## 🔐 认证说明

大部分接口需要在请求头中携带认证信息：

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**无需认证的接口**：
- `POST /api/auth/wechat/login` - 微信登录
- `POST /api/test/test/login` - 测试登录
- `POST /api/payment/notify` - 支付回调（由微信服务器调用）

---

## 📊 接口列表

### 1. 认证接口 (`/api/auth`)

#### 1.1 微信登录
- **路径**: `POST /api/auth/wechat/login`
- **认证**: 无需认证
- **参数**: `{ "code": "微信登录code" }`
- **说明**: 微信小程序登录，返回 JWT Token

#### 1.2 获取微信手机号
- **路径**: `POST /api/auth/wechat/phone`
- **认证**: 需要 Bearer Token
- **参数**: `{ "code": "手机号授权code" }`

#### 1.3 获取当前用户信息
- **路径**: `GET /api/auth/me`
- **认证**: 需要 Bearer Token
- **说明**: 获取当前登录用户信息

#### 1.4 登出
- **路径**: `POST /api/auth/logout`
- **认证**: 需要 Bearer Token

---

### 2. 用户接口 (`/api/user`)

#### 2.1 更新用户资料
- **路径**: `POST /api/user/profile`
- **认证**: 需要 Bearer Token
- **参数**: `{ "nickname": "昵称", "avatarUrl": "头像URL" }`

---

### 3. 商品接口（基于聚水潭编码）

#### 3.1 获取商品列表
- **路径**: `GET /api/products`
- **认证**: 无需认证
- **查询参数**:
  - `page`: 页码（默认1）
  - `pageSize`: 每页数量（默认10，最大100）
  - `keyword`: 搜索关键词
  - `categoryId`: 分类ID
  - `minPrice`: 最低价格
  - `maxPrice`: 最高价格
  - `sort`: 排序方式（new/price_asc/price_desc/hot）

#### 3.2 获取商品详情（按商品编码，唯一推荐）
- **路径**: `GET /api/product/:productCode`
- **认证**: 无需认证
- **说明**:
  - 通过聚水潭接口按商品编码拉取最新商品信息，并进行本地格式化（价格单位统一为分、图片 URL 转为 HTTPS、颜色/尺码结构化等）
  - 接口会尝试从本地映射表 `product_extras.local_description` 读取“本地描述”，与聚水潭返回的 `description` 进行拼接：
    - 如果二者都存在：`description = <聚水潭描述> + "\n\n" + <本地描述>`
    - 只存在其中一个，则直接返回该描述

#### 3.3 创建商品
- **路径**: `POST /api/products`
- **认证**: 需要 Bearer Token（通常需要管理员权限）

#### 3.4 更新商品
- **路径**: `PUT /api/products/:id`
- **认证**: 需要 Bearer Token

#### 3.5 删除商品
- **路径**: `DELETE /api/products/:id`
- **认证**: 需要 Bearer Token

#### 3.6 获取商品图片
- **路径**: `GET /api/products/:id/images`
- **认证**: 无需认证

#### 3.7 获取商品推荐
- **路径**: `GET /api/products/:id/recommendations`
- **认证**: 无需认证
- **说明**: 获取同分类的其他商品（排除自身）

---

### 4. 分类接口 (`/api/categories`)

#### 4.1 获取所有分类
- **路径**: `GET /api/categories`
- **认证**: 无需认证

#### 4.2 获取分类下的商品
- **路径**: `GET /api/categories/:id/products`
- **认证**: 无需认证

#### 4.3 创建分类
- **路径**: `POST /api/categories`
- **认证**: 需要 Bearer Token

---

### 5. 分类树接口 (`/api/categories-tree`)

#### 5.1 获取分类树结构
- **路径**: `GET /api/categories-tree`
- **认证**: 无需认证
- **说明**: 返回树形结构的分类数据

---

### 6. 分类管理接口 (`/api/category-management`)

#### 6.1 获取分类树结构
- **路径**: `GET /api/category-management/tree`
- **认证**: 需要 Bearer Token
- **说明**: 获取完整的分类树，包含商品编码

#### 6.2 获取一级分类列表
- **路径**: `GET /api/category-management/level1`
- **认证**: 需要 Bearer Token

#### 6.3 获取二级分类列表
- **路径**: `GET /api/category-management/level2/:parentId`
- **认证**: 需要 Bearer Token

#### 6.4 创建一级分类
- **路径**: `POST /api/category-management/level1`
- **认证**: 需要 Bearer Token

#### 6.5 创建二级分类
- **路径**: `POST /api/category-management/level2`
- **认证**: 需要 Bearer Token

#### 6.6 更新分类
- **路径**: `PUT /api/category-management/:id`
- **认证**: 需要 Bearer Token

#### 6.7 删除分类
- **路径**: `DELETE /api/category-management/:id`
- **认证**: 需要 Bearer Token

#### 6.8 更新分类商品编码
- **路径**: `PUT /api/category-management/:id/product-codes`
- **认证**: 需要 Bearer Token

#### 6.9 根据商品编码查询分类
- **路径**: `GET /api/category-management/by-product/:productCode`
- **认证**: 需要 Bearer Token

---

### 7. 分类页接口 (`/api/category-page`)

#### 7.1 获取分类页列表
- **路径**: `GET /api/category-page`
- **认证**: 无需认证
- **说明**: 获取所有启用的分类页配置

#### 7.2 获取分类页商品
- **路径**: `GET /api/category-page/:id/products`
- **认证**: 无需认证
- **说明**: 获取指定分类页的商品列表

---

### 8. 首页接口 (`/api/miniprogram/home`)

#### 8.1 获取小程序首页数据
- **路径**: `GET /api/miniprogram/home`
- **认证**: 无需认证
- **说明**: 返回首页完整数据（轮播、分类、Banner等）

#### 8.2 获取分类详情
- **路径**: `GET /api/miniprogram/home/category/:id`
- **认证**: 无需认证
- **说明**: 获取分类详情，包含子分类和商品

#### 8.3 获取热门商品
- **路径**: `GET /api/miniprogram/home/hot-products`
- **认证**: 无需认证
- **查询参数**: `limit` (默认10，最大100)

---

### 9. 购物车接口 (`/api/cart`)

#### 9.1 添加商品到购物车
- **路径**: `POST /api/cart/add`
- **认证**: 需要 Bearer Token
- **参数**: 
  ```json
  {
    "product_code": "NBB-AWTR004",    // 必填：商品编码（来自聚水潭）
    "sku_id": "NBB-AWTR004-1-L",     // 可选：SKU编码（如果商品有规格）
    "quantity": 1                     // 可选：数量（1-3之间，默认1）
  }
  ```
- **说明**: 
  - 每件一行：同一商品/SKU 最多 3 行（3 件），不再累加数量
  - 如果请求数量超过上限，超出的部分会被忽略并返回“部分添加成功”
  - 返回新增的行列表、当前总件数以及是否到达上限

#### 9.2 获取购物车
- **路径**: `GET /api/cart`
- **认证**: 需要 Bearer Token
- **说明**: 
  - 每行代表 1 件，`quantity` 恒为 1，不再做二次拆分
  - 自动检查商品有效性和库存状态，无效商品会被标记为 `valid: false`
  - 汇总统计基于行数：`total_quantity`/`selected_quantity` 等均为件数

#### 9.3 更新购物车商品
- **路径**: `PUT /api/cart/:id`
- **认证**: 需要 Bearer Token
- **参数**: 
  ```json
  { "selected": true } // 仅支持选中状态切换；quantity 恒为 1
  ```
- **说明**: 每行仅代表 1 件，不支持修改数量，只能切换选中状态

#### 9.4 删除购物车商品
- **路径**: `DELETE /api/cart/:id`
- **认证**: 需要 Bearer Token
- **说明**: 按行删除（每行 1 件）

#### 9.5 清空购物车
- **路径**: `DELETE /api/cart`
- **认证**: 需要 Bearer Token
- **说明**: 支持 `?selected=true` 仅清除已选行；默认清空全部

---

### 10. 收藏/心愿单接口 (`/api/favorites`)

#### 10.1 添加收藏
- **路径**: `POST /api/favorites`
- **认证**: 需要 Bearer Token
- **请求参数**:
  ```json
  {
    "product_code": "NBB-AWTR004"  // 必填：商品编码（来自聚水潭）
  }
  ```
- **说明**:
  - 同一用户对同一商品仅保留一条记录（幂等操作）
  - 如果商品已在收藏列表中，返回 `is_new=false`，不会重复添加
  - **并发安全**：并发重复请求通过数据库唯一约束自动去重，仍返回成功态（`code: 0`）
  - 商品编码会自动去除首尾空格
- **成功响应示例**（新收藏）:
  ```json
  {
    "code": 0,
    "message": "收藏成功",
    "data": {
      "id": 12,
      "product_code": "NBB-AWTR004",
      "created_at": "2024-01-01T10:00:00.000Z",
      "is_new": true
    }
  }
  ```
- **成功响应示例**（已存在）:
  ```json
  {
    "code": 0,
    "message": "已在收藏列表",
    "data": {
      "id": 12,
      "product_code": "NBB-AWTR004",
      "created_at": "2024-01-01T10:00:00.000Z",
      "is_new": false
    }
  }
  ```
- **错误响应**:
  - `401` - 未认证：`{ "code": 401, "message": "未认证的用户" }`
  - `400` - 商品编码为空：`{ "code": 400, "message": "商品编码不能为空" }`
  - `500` - 服务器错误：`{ "code": 500, "message": "收藏失败，请稍后重试" }`

#### 10.2 获取收藏列表
- **路径**: `GET /api/favorites`
- **认证**: 需要 Bearer Token
- **说明**: 
  - 返回当前用户的所有收藏商品编码列表
  - 按收藏时间倒序排列（最新收藏在前）
  - 如果用户没有收藏，返回空数组
- **成功响应示例**:
  ```json
  {
    "code": 0,
    "message": "ok",
    "data": [
      {
        "id": 12,
        "product_code": "NBB-AWTR004",
        "created_at": "2024-01-01T10:00:00.000Z"
      },
      {
        "id": 11,
        "product_code": "NBB-TS001",
        "created_at": "2024-01-01T09:00:00.000Z"
      }
    ]
  }
  ```
- **空列表响应**:
  ```json
  {
    "code": 0,
    "message": "ok",
    "data": []
  }
  ```
- **错误响应**:
  - `401` - 未认证：`{ "code": 401, "message": "未认证的用户" }`
  - `500` - 服务器错误：`{ "code": 500, "message": "获取收藏列表失败，请稍后重试" }`

#### 10.3 取消收藏
- **路径**: `DELETE /api/favorites/:productCode`
- **认证**: 需要 Bearer Token
- **路径参数**:
  - `productCode`: 商品编码（URL路径参数，会自动去除首尾空格）
- **说明**: 
  - 按商品编码取消收藏
  - 如果收藏不存在，返回 `404`
  - 只能取消当前用户自己的收藏
- **成功响应示例**:
  ```json
  {
    "code": 0,
    "message": "已取消收藏"
  }
  ```
- **错误响应**:
  - `401` - 未认证：`{ "code": 401, "message": "未认证的用户" }`
  - `400` - 商品编码为空：`{ "code": 400, "message": "商品编码不能为空" }`
  - `404` - 收藏不存在：`{ "code": 404, "message": "收藏不存在" }`
  - `500` - 服务器错误：`{ "code": 500, "message": "取消收藏失败，请稍后重试" }`

---

### 11. 订单接口 (`/api/orders`)

**订单系统说明**：
- **订单创建**：从购物车创建订单，自动验证商品有效性
- **订单存储**：订单存储在本地数据库，包含完整的订单信息
- **同步到聚水潭**：订单创建后**自动同步**到聚水潭系统（异步执行，不阻塞响应）
- **ID对应关系**：维护本地订单ID和聚水潭订单ID的对应关系
- **订单状态**：支持订单状态查询和同步状态查询

#### 10.1 创建订单
- **路径**: `POST /api/orders`
- **认证**: 需要 Bearer Token
- **参数**:
  ```json
  {
    "cart_item_ids": [1, 2, 3],      // 必填：购物车项ID数组
    "shop_id": 12345,                 // 必填：聚水潭店铺编号
    "receiver_info": {
      "receiver_name": "张三",         // 必填：收货人姓名
      "receiver_address": "北京市朝阳区xxx街道xxx号",  // 必填：收货地址
      "receiver_phone": "010-12345678",  // 可选：联系电话（与receiver_mobile至少填一项）
      "receiver_mobile": "13800138000",  // 可选：手机号（与receiver_phone至少填一项）
      "receiver_state": "北京",        // 可选：省份
      "receiver_city": "北京市",       // 可选：城市
      "receiver_district": "朝阳区",   // 可选：区县
      "receiver_email": "example@email.com",  // 可选：邮箱
      "receiver_zip": "100000",       // 可选：邮编
      "freight": 10                    // 可选：运费（默认0）
    },
    "buyer_message": "请尽快发货"     // 可选：买家留言
  }
  ```
- **说明**:
  - 从购物车中选择商品创建订单，自动验证商品有效性
  - 创建成功后从购物车中删除对应商品
  - **订单创建后会自动同步到聚水潭**（异步执行，不阻塞响应）
  - 同步状态可通过 `sync_status` 字段查询（pending/success/failed）

#### 10.2 获取订单列表
- **路径**: `GET /api/orders`
- **认证**: 需要 Bearer Token
- **查询参数**:
  - `page`: 页码（默认1）
  - `pageSize`: 每页数量（默认20）
  - `shop_status`: 订单状态筛选
  - `sync_status`: 同步状态筛选

#### 10.3 获取订单详情
- **路径**: `GET /api/orders/:id`
- **认证**: 需要 Bearer Token
- **说明**: 返回订单信息、订单明细和支付信息

#### 10.4 更新订单
- **路径**: `PUT /api/orders/:id`
- **认证**: 需要 Bearer Token
- **参数**:
  ```json
  {
    "receiver_info": {
      "receiver_name": "张三",           // 可选：收件人姓名
      "receiver_mobile": "13800138000", // 可选：手机号
      "receiver_state": "北京市",        // 可选：省份
      "receiver_city": "北京市",         // 可选：城市
      "receiver_district": "海淀区",     // 可选：区县
      "receiver_address": "中关村大街1号", // 可选：详细地址
      "receiver_zip": "100000"          // 可选：邮编
    },
    "buyer_message": "请尽快发货",      // 可选：买家留言
    "remark": "卖家备注",               // 可选：卖家备注
    "shop_status": "WAIT_SELLER_SEND_GOODS" // 可选：订单状态
  }
  ```
- **说明**:
  - 更新订单信息（发货前可更新收货地址）
  - 收货地址信息只能在订单未发货时更新
  - 买家留言、卖家备注、订单状态可以随时更新
  - 如果订单已同步到聚水潭，更新后会自动重新同步（异步执行）
- **权限**: 只能更新当前用户自己的订单

#### 10.5 同步订单到聚水潭
- **路径**: `POST /api/orders/:id/sync`
- **认证**: 需要 Bearer Token
- **说明**: 
  - 将本地订单同步到聚水潭系统
  - 如果订单已同步，直接返回已同步信息
  - 同步成功后会更新订单的聚水潭ID（`jst_o_id`、`jst_so_id`）和同步状态
  - 同步失败会记录错误信息到 `sync_error` 字段
- **注意**: 
  - 订单创建时会自动同步
  - 支付成功后也会自动同步（异步执行，不阻塞支付回调）
  - 此接口主要用于手动重试同步失败的订单

---

### 11. 支付接口 (`/api/payment`)

#### 11.1 创建支付订单（通用接口）
- **路径**: `POST /api/payment/create`
- **认证**: 需要 Bearer Token
- **参数**: `{ "order_id": 1 }`
- **说明**: 自动选择 API v2 或 v3

#### 11.2 创建支付订单（v3专用）
- **路径**: `POST /api/payment/v3/create`
- **认证**: 需要 Bearer Token
- **参数**: `{ "order_id": 1 }`
- **说明**: 强制使用 API v3，返回格式化的支付参数

#### 11.3 查询支付状态
- **路径**: `GET /api/payment/status/:order_id`
- **认证**: 需要 Bearer Token
- **说明**: 查询订单支付状态，如果未支付会主动查询微信支付状态

#### 11.4 更新订单支付信息
- **路径**: `PUT /api/payment/order/:order_id`
- **认证**: 需要 Bearer Token
- **参数**:
  ```json
  {
    "outer_pay_id": "MANUAL_PAY_202512010024313768_1234567890",  // 必填：外部支付单号
    "pay_date": "2025-12-01T10:30:00.000Z",                      // 可选：支付日期（默认当前时间）
    "payment": "线下支付",                                         // 可选：支付方式（默认"其他支付"）
    "seller_account": "默认账户",                                  // 可选：收款账户（默认"默认账户"）
    "buyer_account": "66",                                        // 可选：买家支付账号（默认用户ID）
    "amount": 2699.00,                                            // 可选：支付金额（默认订单金额）
    "update_order_status": true                                   // 可选：是否更新订单状态（默认true）
  }
  ```
- **说明**:
  - 手动更新订单支付信息
  - 适用于线下支付、其他支付方式、手动标记已支付等场景
  - 如果 `update_order_status` 为 `true`（默认），订单状态为 `WAIT_BUYER_PAY` 时会更新为 `WAIT_SELLER_SEND_GOODS`
  - 如果订单已同步到聚水潭，更新支付信息后会自动重新同步（异步执行）
- **权限**: 只能更新当前用户自己的订单

#### 11.5 支付回调
- **路径**: `POST /api/payment/notify`
- **认证**: 无需认证（微信服务器调用）
- **说明**: 
  - 微信支付回调接口，自动识别 v2/v3 格式
  - 支付成功后会：
    1. 更新订单状态为 `WAIT_SELLER_SEND_GOODS`
    2. 记录支付信息到 `order_payments` 表
    3. **自动同步订单到聚水潭**（异步执行，不阻塞回调响应）
  - 同步失败不影响支付流程，只记录日志，可以后续手动重试

---

### 12. 地址接口 (`/api/addresses`)

#### 12.1 获取地址列表
- **路径**: `GET /api/addresses`
- **认证**: 需要 Bearer Token

#### 12.2 获取地址详情
- **路径**: `GET /api/addresses/:id`
- **认证**: 需要 Bearer Token

#### 12.3 创建地址
- **路径**: `POST /api/addresses`
- **认证**: 需要 Bearer Token
- **参数**:
  ```json
  {
    "name": "张三",                    // 必填：收货人姓名
    "phone": "010-12345678",          // 可选：联系电话（phone 或 mobile 至少一个）
    "mobile": "13800138000",          // 可选：手机号（phone 或 mobile 至少一个）
    "province_name": "北京",          // 可选：省份
    "city_name": "北京市",            // 可选：城市
    "district_name": "朝阳区",        // 可选：区县
    "detail_address": "xxx街道xxx号", // 必填：详细地址
    "postal_code": "100000",          // 可选：邮编
    "email": "example@email.com",     // 可选：邮箱
    "is_default": false,              // 可选：是否设为默认地址
    "address_tag": "家"               // 可选：地址标签（家、公司、学校等）
  }
  ```

#### 12.4 更新地址
- **路径**: `PUT /api/addresses/:id`
- **认证**: 需要 Bearer Token
- **参数**:
  ```json
  {
    "name": "张三",                    // 必填：收货人姓名
    "phone": "010-12345678",          // 可选：联系电话（phone 或 mobile 至少一个）
    "mobile": "13800138000",          // 可选：手机号（phone 或 mobile 至少一个）
    "province_name": "北京",          // 可选：省份
    "city_name": "北京市",            // 可选：城市
    "district_name": "朝阳区",        // 可选：区县
    "detail_address": "xxx街道xxx号", // 必填：详细地址
    "postal_code": "100000",          // 可选：邮编
    "email": "example@email.com",     // 可选：邮箱
    "is_default": false,              // 可选：是否设为默认地址
    "address_tag": "家"               // 可选：地址标签
  }
  ```

#### 12.5 删除地址
- **路径**: `DELETE /api/addresses/:id`
- **认证**: 需要 Bearer Token

#### 12.6 设置默认地址
- **路径**: `PUT /api/addresses/:id/default`
- **认证**: 需要 Bearer Token

---

### 13. 聚水潭接口 (`/api/jst`)

#### 13.1 订单查询
- **路径**: `POST /api/jst/orders/search`
- **认证**: 需要 Bearer Token
- **参数**: 
  ```json
  {
    "so_id": "订单号",
    "shop_id": 店铺ID,
    "date_start": "开始日期",
    "date_end": "结束日期",
    "page_index": 1,
    "page_size": 50
  }
  ```

#### 13.2 商品查询
- **路径**: `POST /api/jst/products/search`
- **认证**: 需要 Bearer Token
- **参数**: 
  ```json
  {
    "item_code": "商品编码",
    "barcode": "条码",
    "page_index": 1,
    "page_size": 50
  }
  ```

#### 13.3 库存查询
- **路径**: `POST /api/jst/inventory/search`
- **认证**: 需要 Bearer Token
- **参数**: 
  ```json
  {
    "warehouse_id": "仓库ID",
    "item_code": "商品编码",
    "barcode": "条码",
    "page_index": 1,
    "page_size": 50
  }
  ```

#### 13.4 店铺查询
- **路径**: `POST /api/jst/shops/search`
- **认证**: 需要 Bearer Token
- **参数**: 
  ```json
  {
    "page_index": 1,
    "page_size": 50
  }
  ```

#### 13.5 类目查询
- **路径**: `POST /api/jst/categories/search`
- **认证**: 需要 Bearer Token

#### 13.6 单个商品查询
- **路径**: `POST /api/jst/item/query`
- **认证**: 需要 Bearer Token
- **参数**: 
  ```json
  {
    "i_ids": ["NBB-AWJ003"],
    "page_index": 1,
    "page_size": 30
  }
  ```

---

### 14. 管理后台接口 (`/api/admin/homepage`)

#### 14.1 Banners 管理

##### 获取所有banners
- **路径**: `GET /api/admin/homepage/banners`
- **认证**: 需要 Bearer Token

##### 获取单个banner
- **路径**: `GET /api/admin/homepage/banners/:id`
- **认证**: 需要 Bearer Token

##### 创建banner
- **路径**: `POST /api/admin/homepage/banners`
- **认证**: 需要 Bearer Token

##### 更新banner
- **路径**: `PUT /api/admin/homepage/banners/:id`
- **认证**: 需要 Bearer Token

##### 删除banner
- **路径**: `DELETE /api/admin/homepage/banners/:id`
- **认证**: 需要 Bearer Token

#### 14.2 横向轮播管理

##### 获取所有横向轮播
- **路径**: `GET /api/admin/homepage/lower-swiper`
- **认证**: 需要 Bearer Token

##### 创建横向轮播
- **路径**: `POST /api/admin/homepage/lower-swiper`
- **认证**: 需要 Bearer Token

##### 更新横向轮播
- **路径**: `PUT /api/admin/homepage/lower-swiper/:id`
- **认证**: 需要 Bearer Token

##### 删除横向轮播
- **路径**: `DELETE /api/admin/homepage/lower-swiper/:id`
- **认证**: 需要 Bearer Token

#### 14.3 三图展示管理

##### 获取所有三图
- **路径**: `GET /api/admin/homepage/three-images`
- **认证**: 需要 Bearer Token

##### 创建三图
- **路径**: `POST /api/admin/homepage/three-images`
- **认证**: 需要 Bearer Token

##### 更新三图
- **路径**: `PUT /api/admin/homepage/three-images/:id`
- **认证**: 需要 Bearer Token

##### 删除三图
- **路径**: `DELETE /api/admin/homepage/three-images/:id`
- **认证**: 需要 Bearer Token

---

### 16. 商品本地描述管理接口 (`/api/admin/product-descriptions`)

> 用于在后台维护商品的本地描述 `local_description`，该字段会在 `GET /api/product/:productCode` 接口中与聚水潭 `description` 拼接后返回给前端。

#### 16.1 获取单个商品的本地描述
- **路径**: `GET /api/admin/product-descriptions/:productCode`
- **认证**: 需要 Bearer Token（建议仅管理员可用）
- **说明**:
  - 如果数据库中存在该 `product_code`，返回已保存的 `local_description`
  - 如果不存在，返回空描述，方便前端首次编辑
- **响应示例**:
  ```json
  {
    "success": true,
    "data": {
      "product_code": "NBB-AWJ003",
      "local_description": "这里是本地维护的商品详情文案..."
    }
  }
  ```

#### 16.2 创建或更新单个商品的本地描述
- **路径**: `POST /api/admin/product-descriptions/:productCode`
- **认证**: 需要 Bearer Token（建议仅管理员可用）
- **请求体**:
  ```json
  {
    "local_description": "这里是要保存的商品详情文案（可为富文本 Markdown / 纯文本）"
  }
  ```
- **说明**:
  - 如果 `products` 表中已存在该 `product_code`，则更新其 `local_description` 和 `updated_at`
  - 如果不存在，则插入一条仅包含 `product_code` 与 `local_description` 的新记录，并设置 `created_at` / `updated_at`
  - 保存成功后，商品详情接口 `GET /api/product/:productCode` 会自动使用最新的本地描述拼接结果

---

### 15. 测试接口 (`/api/test`)

#### 15.1 测试登录
- **路径**: `POST /api/test/test/login`
- **认证**: 无需认证
- **参数**: `{ "code": "test_code" }` 或 `{ "openid": "test_openid" }`
- **说明**: 用于测试环境，模拟微信登录

---

## 📋 接口统计

| 模块 | 接口数量 | 认证要求 |
|------|---------|---------|
| 认证接口 | 4 | 部分需要 |
| 用户接口 | 1 | 需要 |
| 商品接口 | 6 | 部分需要 |
| 分类接口 | 3 | 部分需要 |
| 分类树接口 | 1 | 无需 |
| 分类管理接口 | 9 | 需要 |
| 分类页接口 | 2 | 无需 |
| 首页接口 | 3 | 无需 |
| 购物车接口 | 5 | 需要 |
| 订单接口 | 5 | 需要 |
| 支付接口 | 5 | 部分需要 |
| 地址接口 | 6 | 需要 |
| 聚水潭接口 | 6 | 需要 |
| 管理后台接口 | 12 | 需要 |
| 商品本地描述管理接口 | 2 | 需要 |
| 测试接口 | 1 | 无需 |
| **总计** | **70** | - |

---

## 🔗 快速访问

- **API文档页面**: https://not-boringboreboi.com/api-docs
- **健康检查**: https://not-boringboreboi.com/api/health (需要通过 /api/ 代理)
- **根路径**: https://not-boringboreboi.com/

---

## 📝 注意事项

1. **认证要求**: 大部分接口需要 Bearer Token，请在请求头中携带
2. **分页限制**: 分页接口的 `pageSize` 通常限制在 1-100 之间
3. **错误处理**: 所有接口统一返回格式 `{ code, message, data }`
4. **支付回调**: `/api/payment/notify` 由微信服务器调用，不需要前端调用
5. **CSP策略**: API文档页面允许内联样式，其他页面使用严格策略

---

**文档版本**: v2.2  
**最后更新**: 2025-11-30  
**维护人员**: NBBB 开发团队

