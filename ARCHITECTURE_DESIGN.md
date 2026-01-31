# NBBB 三端分离架构设计文档

## 📋 概述

本文档描述如何将 NBBB 电商系统分为三个独立的前端系统，共享同一个后端 API 服务：

1. **小程序端** (MiniProgram) - 微信小程序用户购物应用
2. **网页端** (Web) - PC/移动网页用户购物网站
3. **后台管理站点** (Admin) - 商家后台管理系统

## 🎯 设计原则

1. **统一后端服务** - 三个前端共享同一个 Express 后端
2. **路由前缀区分** - 通过 URL 路径前缀区分不同的客户端
3. **权限分离** - 通过中间件实现不同角色的权限控制
4. **数据共享** - 共享相同的数据库和业务逻辑
5. **接口复用** - 通用接口可以被多个前端复用

## 🏗️ 架构设计

### 路由前缀规范

```
/api/miniprogram/*    - 小程序专用接口
/api/web/*            - 网页端专用接口  
/api/admin/*          - 后台管理接口
/api/common/*         - 公共接口（多个前端可共用）
```

### 三端接口划分

#### 1. 小程序端 (`/api/miniprogram/*`)

**特点**：
- 使用微信登录（openid）
- 适配小程序环境
- 优化的数据格式和响应

**接口列表**：

```
认证相关：
  POST   /api/miniprogram/auth/login          - 微信小程序登录
  POST   /api/miniprogram/auth/phone          - 获取微信手机号
  GET    /api/miniprogram/auth/me             - 获取当前用户信息
  POST   /api/miniprogram/auth/logout         - 登出

首页：
  GET    /api/miniprogram/home                - 小程序首页数据

商品：
  GET    /api/miniprogram/products            - 商品列表（小程序优化）
  GET    /api/miniprogram/product/:code       - 商品详情（按编码）
  GET    /api/miniprogram/categories          - 分类列表

购物：
  GET    /api/miniprogram/cart                - 购物车列表
  POST   /api/miniprogram/cart                - 添加商品到购物车
  PUT    /api/miniprogram/cart/:id            - 更新购物车商品
  DELETE /api/miniprogram/cart/:id            - 删除购物车商品

订单：
  POST   /api/miniprogram/orders              - 创建订单
  GET    /api/miniprogram/orders              - 订单列表
  GET    /api/miniprogram/orders/:id          - 订单详情
  PUT    /api/miniprogram/orders/:id          - 更新订单（取消等）

支付：
  POST   /api/miniprogram/payment/create      - 创建支付
  POST   /api/miniprogram/payment/notify      - 支付回调（微信服务器调用）

地址：
  GET    /api/miniprogram/addresses           - 地址列表
  POST   /api/miniprogram/addresses           - 新增地址
  PUT    /api/miniprogram/addresses/:id       - 更新地址
  DELETE /api/miniprogram/addresses/:id       - 删除地址

收藏：
  GET    /api/miniprogram/favorites           - 收藏列表
  POST   /api/miniprogram/favorites           - 添加收藏
  DELETE /api/miniprogram/favorites/:id       - 取消收藏

用户：
  GET    /api/miniprogram/user/profile        - 获取用户资料
  PUT    /api/miniprogram/user/profile        - 更新用户资料
```

#### 2. 网页端 (`/api/web/*`)

**特点**：
- 支持多种登录方式（微信扫码、手机号、邮箱等）
- PC 和移动端适配
- 更丰富的 SEO 支持

**接口列表**：

```
认证相关：
  POST   /api/web/auth/login                  - 用户登录（多种方式）
  POST   /api/web/auth/register               - 用户注册
  POST   /api/web/auth/logout                 - 登出
  GET    /api/web/auth/me                     - 获取当前用户信息
  POST   /api/web/auth/wechat/qr              - 获取微信扫码登录二维码

首页：
  GET    /api/web/home                        - 网页首页数据（SEO优化）

商品：
  GET    /api/web/products                    - 商品列表（网页优化）
  GET    /api/web/product/:code               - 商品详情
  GET    /api/web/categories                  - 分类列表（树形结构）
  GET    /api/web/category/:id/products       - 分类商品列表

购物：
  GET    /api/web/cart                        - 购物车列表
  POST   /api/web/cart                        - 添加商品到购物车
  PUT    /api/web/cart/:id                    - 更新购物车商品
  DELETE /api/web/cart/:id                    - 删除购物车商品

订单：
  POST   /api/web/orders                      - 创建订单
  GET    /api/web/orders                      - 订单列表
  GET    /api/web/orders/:id                  - 订单详情
  PUT    /api/web/orders/:id/cancel           - 取消订单

支付：
  POST   /api/web/payment/create              - 创建支付
  POST   /api/web/payment/notify              - 支付回调

地址：
  GET    /api/web/addresses                   - 地址列表
  POST   /api/web/addresses                   - 新增地址
  PUT    /api/web/addresses/:id               - 更新地址
  DELETE /api/web/addresses/:id               - 删除地址

收藏：
  GET    /api/web/favorites                   - 收藏列表
  POST   /api/web/favorites                   - 添加收藏
  DELETE /api/web/favorites/:id               - 取消收藏

用户：
  GET    /api/web/user/profile                - 获取用户资料
  PUT    /api/web/user/profile                - 更新用户资料
  PUT    /api/web/user/password               - 修改密码
  POST   /api/web/user/avatar                 - 上传头像
```

#### 3. 后台管理站点 (`/api/admin/*`)

**特点**：
- 管理员账号登录
- 完整的权限控制（RBAC）
- 数据统计和分析
- 批量操作支持

**接口列表**：

```
认证相关：
  POST   /api/admin/auth/login                - 管理员登录
  POST   /api/admin/auth/logout               - 登出
  GET    /api/admin/auth/me                   - 获取当前管理员信息
  PUT    /api/admin/auth/password             - 修改密码

仪表盘：
  GET    /api/admin/dashboard                 - 数据概览
  GET    /api/admin/dashboard/stats           - 统计数据

商品管理：
  GET    /api/admin/products                  - 商品列表（管理视图）
  GET    /api/admin/products/:id              - 商品详情
  POST   /api/admin/products                  - 创建商品
  PUT    /api/admin/products/:id              - 更新商品
  DELETE /api/admin/products/:id              - 删除商品
  POST   /api/admin/products/batch            - 批量操作商品
  GET    /api/admin/products/sync             - 同步聚水潭商品

分类管理：
  GET    /api/admin/categories                - 分类列表
  POST   /api/admin/categories                - 创建分类
  PUT    /api/admin/categories/:id            - 更新分类
  DELETE /api/admin/categories/:id            - 删除分类
  POST   /api/admin/categories/sort           - 调整分类排序

订单管理：
  GET    /api/admin/orders                    - 订单列表（管理视图）
  GET    /api/admin/orders/:id                - 订单详情
  PUT    /api/admin/orders/:id/status         - 更新订单状态
  PUT    /api/admin/orders/:id/ship           - 发货
  PUT    /api/admin/orders/:id/refund         - 退款
  POST   /api/admin/orders/export             - 导出订单

用户管理：
  GET    /api/admin/users                     - 用户列表
  GET    /api/admin/users/:id                 - 用户详情
  PUT    /api/admin/users/:id/status          - 更新用户状态
  GET    /api/admin/users/:id/orders          - 用户订单列表

首页管理：
  GET    /api/admin/homepage/banners          - Banner列表
  POST   /api/admin/homepage/banners          - 创建Banner
  PUT    /api/admin/homepage/banners/:id      - 更新Banner
  DELETE /api/admin/homepage/banners/:id      - 删除Banner
  GET    /api/admin/homepage/sections         - 首页模块列表
  POST   /api/admin/homepage/sections         - 创建首页模块
  PUT    /api/admin/homepage/sections/:id     - 更新首页模块

管理员管理（需要超级管理员权限）：
  GET    /api/admin/managers                  - 管理员列表
  POST   /api/admin/managers                  - 创建管理员
  PUT    /api/admin/managers/:id              - 更新管理员
  DELETE /api/admin/managers/:id              - 删除管理员
  GET    /api/admin/roles                     - 角色列表
  POST   /api/admin/roles                     - 创建角色
  PUT    /api/admin/roles/:id                 - 更新角色
```

#### 4. 公共接口 (`/api/common/*`)

**特点**：
- 可以被多个前端复用
- 通常不需要认证或使用通用认证

**接口列表**：

```
商品查询（公共）：
  GET    /api/common/products/search          - 商品搜索（公开）
  GET    /api/common/product/:code            - 商品详情（公开，基础信息）

分类查询（公共）：
  GET    /api/common/categories               - 分类列表（公开）
  GET    /api/common/categories/tree          - 分类树（公开）

支付回调（公共）：
  POST   /api/common/payment/notify           - 支付回调（由支付平台调用）
```

## 🔐 权限控制设计

### 认证中间件

需要创建三种认证中间件：

1. **小程序认证中间件** (`backend/middleware/miniprogramAuth.js`)
   - 验证微信 JWT Token
   - 提取 openid 和用户信息

2. **网页端认证中间件** (`backend/middleware/webAuth.js`)
   - 验证标准 JWT Token
   - 支持多种登录方式（微信、手机号、邮箱）

3. **管理员认证中间件** (`backend/middleware/adminAuth.js`)
   - 验证管理员 JWT Token
   - 检查管理员状态和权限

### 权限控制中间件

创建权限检查中间件 (`backend/middleware/permission.js`)：
- 基于角色的权限控制（RBAC）
- 检查管理员的操作权限
- 支持细粒度权限控制

## 📁 推荐的目录结构

```
/nbbb/
├── backend/
│   ├── controllers/
│   │   ├── miniprogram/          # 小程序控制器
│   │   │   ├── miniprogramAuthController.js
│   │   │   ├── miniprogramProductController.js
│   │   │   ├── miniprogramOrderController.js
│   │   │   └── ...
│   │   ├── web/                  # 网页端控制器
│   │   │   ├── webAuthController.js
│   │   │   ├── webProductController.js
│   │   │   ├── webOrderController.js
│   │   │   └── ...
│   │   ├── admin/                # 后台管理控制器
│   │   │   ├── adminAuthController.js
│   │   │   ├── adminProductController.js
│   │   │   ├── adminOrderController.js
│   │   │   ├── adminUserController.js
│   │   │   └── ...
│   │   └── common/               # 公共控制器
│   │       ├── commonProductController.js
│   │       └── ...
│   ├── routes/
│   │   ├── miniprogram/          # 小程序路由
│   │   │   ├── index.js
│   │   │   ├── auth.js
│   │   │   ├── products.js
│   │   │   ├── orders.js
│   │   │   └── ...
│   │   ├── web/                  # 网页端路由
│   │   │   ├── index.js
│   │   │   ├── auth.js
│   │   │   ├── products.js
│   │   │   ├── orders.js
│   │   │   └── ...
│   │   ├── admin/                # 后台管理路由
│   │   │   ├── index.js
│   │   │   ├── auth.js
│   │   │   ├── products.js
│   │   │   ├── orders.js
│   │   │   ├── users.js
│   │   │   ├── managers.js
│   │   │   └── ...
│   │   └── common/               # 公共路由
│   │       ├── index.js
│   │       └── products.js
│   ├── middleware/
│   │   ├── auth.js               # 原有认证中间件（保留兼容）
│   │   ├── miniprogramAuth.js    # 小程序认证中间件
│   │   ├── webAuth.js            # 网页端认证中间件
│   │   ├── adminAuth.js          # 管理员认证中间件
│   │   └── permission.js         # 权限检查中间件
│   ├── services/                 # 业务逻辑层（共享）
│   │   ├── productService.js
│   │   ├── orderService.js
│   │   ├── userService.js
│   │   └── ...
│   └── server.js
├── miniprogram/                  # 小程序前端代码（可选，如果需要）
├── web/                          # 网页端前端代码（可选）
├── admin-frontend/               # 后台管理前端代码（已有admin/目录）
└── ...
```

## 🔄 迁移策略

### 阶段 1：路由重组（渐进式迁移）

1. **保持现有接口兼容**
   - 现有接口继续工作
   - 新接口使用新的路由前缀

2. **创建新的路由结构**
   - 在小程序路由中使用 `/api/miniprogram/*`
   - 在后台管理路由中使用 `/api/admin/*`
   - 网页端路由使用 `/api/web/*`

3. **逐步迁移现有接口**
   - 将现有接口复制到对应的新路由中
   - 调整控制器和中间件
   - 保持向后兼容一段时间

### 阶段 2：认证系统分离

1. **创建新的认证中间件**
   - `miniprogramAuth.js` - 小程序认证
   - `webAuth.js` - 网页端认证
   - `adminAuth.js` - 管理员认证

2. **实现不同的登录逻辑**
   - 小程序：微信登录（openid）
   - 网页端：多种登录方式
   - 后台：管理员账号登录

### 阶段 3：权限系统完善

1. **实现 RBAC 权限系统**
   - 基于 `admin_roles` 表
   - 实现权限检查中间件
   - 细化后台管理权限

2. **数据隔离**
   - 确保不同角色的数据访问权限
   - 管理员只能访问授权范围的数据

## 📊 接口对比表

| 功能模块 | 小程序端 | 网页端 | 后台管理 | 说明 |
|---------|---------|--------|---------|------|
| 用户登录 | 微信登录 | 多种方式 | 管理员登录 | 不同的认证方式 |
| 商品列表 | 小程序优化格式 | 网页优化格式 | 管理视图（含状态） | 数据格式不同 |
| 订单管理 | 用户视角 | 用户视角 | 管理员视角 | 权限不同 |
| 支付方式 | 微信支付 | 多种支付 | 手动处理退款 | 功能不同 |
| 数据统计 | 无 | 无 | 完整统计 | 仅后台需要 |

## 🔍 实现建议

### 1. 共享业务逻辑层

创建 `services/` 目录，将业务逻辑从控制器中提取出来：

```javascript
// backend/services/productService.js
class ProductService {
  async getProductByCode(code) {
    // 通用业务逻辑
  }
  
  async getProductList(filters) {
    // 通用业务逻辑
  }
}

// 在不同控制器中复用
// backend/controllers/miniprogram/miniprogramProductController.js
const productService = require('../../services/productService');

async getProduct(req, res) {
  const product = await productService.getProductByCode(req.params.code);
  // 格式化返回小程序专用格式
  res.json({ code: 0, data: formatForMiniProgram(product) });
}
```

### 2. 数据格式化函数

为不同端创建数据格式化函数：

```javascript
// backend/utils/formatters/miniprogramFormatter.js
function formatProductForMiniProgram(product) {
  // 小程序专用格式
}

// backend/utils/formatters/webFormatter.js
function formatProductForWeb(product) {
  // 网页端专用格式
}

// backend/utils/formatters/adminFormatter.js
function formatProductForAdmin(product) {
  // 后台管理专用格式（包含更多管理信息）
}
```

### 3. 统一的错误处理

```javascript
// backend/utils/errorHandler.js
function handleError(error, req, res) {
  const clientType = req.path.split('/')[2]; // miniprogram/web/admin
  // 根据客户端类型返回不同格式的错误
}
```

## ✅ 实施检查清单

- [ ] 创建新的路由目录结构
- [ ] 实现小程序认证中间件
- [ ] 实现网页端认证中间件
- [ ] 实现管理员认证中间件
- [ ] 实现权限检查中间件
- [ ] 创建业务逻辑服务层
- [ ] 迁移小程序相关接口到 `/api/miniprogram/*`
- [ ] 迁移网页端相关接口到 `/api/web/*`
- [ ] 整理后台管理接口到 `/api/admin/*`
- [ ] 创建公共接口 `/api/common/*`
- [ ] 更新 API 文档
- [ ] 测试所有接口
- [ ] 更新前端调用代码
- [ ] 部署和监控

## 📝 注意事项

1. **向后兼容**：在迁移过程中保持现有接口可用
2. **API 版本控制**：考虑使用版本号（如 `/api/v1/miniprogram/*`）
3. **CORS 配置**：为不同前端配置不同的 CORS 策略
4. **限流策略**：为不同端设置不同的限流规则
5. **日志记录**：记录不同端的访问日志，便于分析
6. **安全性**：确保不同端之间的数据隔离和权限控制

## 🚀 下一步行动

1. 确认架构设计方案
2. 开始实施阶段 1：路由重组
3. 逐步迁移现有接口
4. 完善认证和权限系统
5. 更新文档和测试






