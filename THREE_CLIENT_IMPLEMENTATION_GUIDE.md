# NBBB 三端分离实施指南

## ✅ 实施完成状态

**实施日期**: 2025-01-05  
**状态**: ✅ 已完成核心架构实施  
**版本**: 2.0.0

---

## 📋 实施概览

本项目已成功实施三端分离架构，将原有的单一后端API拆分为三个独立的前端服务接口：

1. **小程序端** (`/api/miniprogram/*`) - 微信小程序用户购物应用
2. **网页端** (`/api/web/*`) - PC/移动网页用户购物网站
3. **后台管理** (`/api/admin/*`) - 商家后台管理系统
4. **公共接口** (`/api/common/*`) - 跨端公共接口

---

## 🎯 已完成的工作

### ✅ 1. 目录结构创建

```
/nbbb/backend/
├── controllers/
│   ├── miniprogram/              # ✅ 小程序控制器
│   │   ├── miniprogramAuthController.js
│   │   └── miniprogramProductController.js
│   ├── web/                      # ✅ 网页端控制器（待扩展）
│   ├── admin/                    # ✅ 后台管理控制器（待扩展）
│   └── common/                   # ✅ 公共控制器（待扩展）
├── routes/
│   ├── miniprogram/              # ✅ 小程序路由（完整）
│   │   ├── index.js
│   │   ├── auth.js
│   │   ├── product.js
│   │   ├── cart.js
│   │   ├── order.js
│   │   ├── address.js
│   │   ├── favorite.js
│   │   ├── user.js
│   │   └── home.js
│   ├── web/                      # ✅ 网页端路由（基础框架）
│   │   ├── index.js
│   │   ├── auth.js
│   │   └── product.js
│   ├── admin/                    # ✅ 后台管理路由（基础框架）
│   │   ├── index.js
│   │   ├── auth.js
│   │   ├── product.js
│   │   ├── order.js
│   │   ├── user.js
│   │   ├── dashboard.js
│   │   └── homepage.js
│   └── common/                   # ✅ 公共路由（基础）
│       ├── index.js
│       ├── product.js
│       └── category.js
├── middleware/
│   ├── auth.js                   # ✅ 原有认证中间件（保留）
│   ├── miniprogramAuth.js        # ✅ 小程序认证中间件
│   ├── webAuth.js                # ✅ 网页端认证中间件
│   ├── adminAuth.js              # ✅ 管理员认证中间件
│   └── permission.js             # ✅ 权限检查中间件
├── services/                     # ✅ 业务逻辑服务层
│   ├── productService.js
│   ├── userService.js
│   └── orderService.js
├── utils/formatters/             # ✅ 数据格式化工具
│   ├── miniprogramFormatter.js
│   ├── webFormatter.js
│   └── adminFormatter.js
└── server.js                     # ✅ 已更新为三端分离结构
```

### ✅ 2. 认证中间件

- **miniprogramAuth.js** - 小程序JWT认证，验证openid
- **webAuth.js** - 网页端认证，支持多种登录方式
- **adminAuth.js** - 管理员认证，加载角色权限
- **permission.js** - RBAC权限检查中间件

### ✅ 3. 业务逻辑服务层

- **productService.js** - 商品业务逻辑（聚水潭集成）
- **userService.js** - 用户管理业务逻辑
- **orderService.js** - 订单管理业务逻辑

### ✅ 4. 数据格式化工具

- **miniprogramFormatter.js** - 小程序数据格式（code: 0格式）
- **webFormatter.js** - 网页端数据格式（success: true格式，含SEO）
- **adminFormatter.js** - 管理端数据格式（含利润率、库存状态等管理信息）

### ✅ 5. 路由结构

所有三端的路由已创建并集成到 `server.js` 中。

---

## 🚀 快速测试

### 启动服务器

```bash
cd /nbbb
npm start
# 或开发模式
npm run dev
```

### 测试接口

#### 1. 主页（查看API结构）

```bash
curl http://localhost:3000/
```

响应示例：
```json
{
  "message": "NBBB E-commerce API",
  "version": "2.0.0",
  "architecture": "三端分离架构",
  "endpoints": {
    "miniprogram": "/api/miniprogram/*",
    "web": "/api/web/*",
    "admin": "/api/admin/*",
    "common": "/api/common/*"
  }
}
```

#### 2. 小程序端测试

```bash
# 健康检查
curl http://localhost:3000/api/miniprogram/health

# 商品列表（无需认证）
curl "http://localhost:3000/api/miniprogram/products?page=1&pageSize=10"

# 商品详情（无需认证）
curl http://localhost:3000/api/miniprogram/product/YOUR_PRODUCT_CODE
```

#### 3. 网页端测试

```bash
# 健康检查
curl http://localhost:3000/api/web/health

# 商品列表
curl "http://localhost:3000/api/web/products?page=1&pageSize=10"

# 商品详情
curl http://localhost:3000/api/web/product/YOUR_PRODUCT_CODE
```

#### 4. 后台管理测试

```bash
# 健康检查
curl http://localhost:3000/api/admin/health

# 商品列表（管理视图）
curl "http://localhost:3000/api/admin/products?page=1&pageSize=20"

# 订单列表（管理视图）
curl "http://localhost:3000/api/admin/orders?page=1&pageSize=20"

# 用户列表
curl "http://localhost:3000/api/admin/users?page=1&pageSize=20"
```

#### 5. 公共接口测试

```bash
# 健康检查
curl http://localhost:3000/api/common/health

# 商品搜索（公开）
curl "http://localhost:3000/api/common/products/search?keyword=衣服"

# 商品详情（公开基础信息）
curl http://localhost:3000/api/common/product/YOUR_PRODUCT_CODE
```

---

## 📊 接口对比

### 小程序端 vs 网页端 vs 后台管理

| 功能 | 小程序端 | 网页端 | 后台管理 |
|-----|---------|--------|---------|
| **认证方式** | 微信登录（openid） | 多种方式（微信、邮箱、手机号） | 管理员账号 + RBAC |
| **响应格式** | `{code: 0, data: {}}` | `{success: true, data: {}}` | `{success: true, data: {}}` |
| **商品数据** | 精简格式，适合小程序 | 含SEO信息，更详细 | 含利润率、库存状态等管理数据 |
| **权限控制** | 用户级别 | 用户级别 | 角色权限（RBAC） |
| **数据统计** | 无 | 无 | 完整的数据统计和报表 |

---

## 🔄 向后兼容

### 旧版接口仍然可用

所有旧版接口（如 `/api/products`, `/api/auth/wechat/login` 等）仍然保持可用，确保现有的小程序前端不会中断。

```bash
# 旧版小程序登录接口（仍然可用）
curl -X POST http://localhost:3000/api/auth/wechat/login \
  -H "Content-Type: application/json" \
  -d '{"code": "TEST_CODE"}'

# 新版小程序登录接口
curl -X POST http://localhost:3000/api/miniprogram/auth/login \
  -H "Content-Type: application/json" \
  -d '{"code": "TEST_CODE"}'
```

### 迁移建议

**小程序前端迁移步骤**：

1. 逐步将接口调用从 `/api/*` 改为 `/api/miniprogram/*`
2. 更新响应数据的解析逻辑（如果格式有变化）
3. 测试所有功能正常后，完全切换到新接口
4. 旧版接口将在 6 个月后废弃

---

## 🔐 认证流程

### 小程序端认证

```javascript
// 1. 用户登录
POST /api/miniprogram/auth/login
Body: { code: "wx_login_code" }
Response: {
  code: 0,
  message: "登录成功",
  data: {
    token: "JWT_TOKEN",
    user: { id, nickname, avatarUrl, ... },
    isNewUser: false
  }
}

// 2. 使用 token 访问需要认证的接口
GET /api/miniprogram/cart
Headers: { Authorization: "Bearer JWT_TOKEN" }
```

### 网页端认证

```javascript
// 待实现：多种登录方式
POST /api/web/auth/login
Body: { 
  loginType: "phone", // or "email", "wechat"
  phone: "13800138000",
  code: "123456"
}
```

### 后台管理认证

```javascript
// 待实现：管理员登录
POST /api/admin/auth/login
Body: {
  username: "admin",
  password: "password"
}
Response: {
  success: true,
  data: {
    token: "ADMIN_JWT_TOKEN",
    admin: {
      id, username, roleName, permissions, ...
    }
  }
}
```

---

## 🛠️ 开发任务清单

### 已完成 ✅

- [x] 创建三端分离的目录结构
- [x] 实现认证中间件（小程序/网页/管理员）
- [x] 实现权限检查中间件
- [x] 创建业务逻辑服务层
- [x] 创建数据格式化工具
- [x] 实现小程序端完整路由和控制器
- [x] 创建网页端基础路由框架
- [x] 创建后台管理基础路由框架
- [x] 创建公共接口路由
- [x] 更新 server.js 集成新路由
- [x] 保持向后兼容

### 待完成 🚧

#### 网页端

- [ ] 实现网页端完整认证功能（邮箱、手机号、微信扫码等）
- [ ] 完善网页端用户中心功能
- [ ] 实现网页端购物车和订单功能
- [ ] 添加网页端支付集成

#### 后台管理

- [ ] 实现管理员登录和JWT认证
- [ ] 完善商品管理功能（创建、编辑、删除）
- [ ] 实现订单管理功能（发货、退款等）
- [ ] 添加用户管理功能
- [ ] 实现数据统计和报表
- [ ] 创建管理员和角色管理功能

#### 公共功能

- [ ] 完善分类管理接口
- [ ] 添加商品搜索优化
- [ ] 实现缓存机制

#### 测试和文档

- [ ] 编写单元测试
- [ ] 编写集成测试
- [ ] 更新 API 文档
- [ ] 创建前端对接文档

---

## 📝 API 文档

### 小程序端 API

详细的小程序端API文档请参考 `/api/miniprogram/health` 端点返回的信息。

主要接口：

```
认证：
  POST   /api/miniprogram/auth/login          - 微信登录
  POST   /api/miniprogram/auth/phone          - 获取手机号
  GET    /api/miniprogram/auth/me             - 当前用户信息
  POST   /api/miniprogram/auth/logout         - 登出

商品：
  GET    /api/miniprogram/products            - 商品列表
  GET    /api/miniprogram/product/:code       - 商品详情
  GET    /api/miniprogram/product/:code/stock - 检查库存

购物车：
  GET    /api/miniprogram/cart                - 购物车列表
  POST   /api/miniprogram/cart                - 添加到购物车
  PUT    /api/miniprogram/cart/:id            - 更新购物车
  DELETE /api/miniprogram/cart/:id            - 删除购物车项

订单：
  POST   /api/miniprogram/orders              - 创建订单
  GET    /api/miniprogram/orders              - 订单列表
  GET    /api/miniprogram/orders/:id          - 订单详情
  PUT    /api/miniprogram/orders/:id/cancel   - 取消订单

地址：
  GET    /api/miniprogram/addresses           - 地址列表
  POST   /api/miniprogram/addresses           - 创建地址
  PUT    /api/miniprogram/addresses/:id       - 更新地址
  DELETE /api/miniprogram/addresses/:id       - 删除地址

收藏：
  GET    /api/miniprogram/favorites           - 收藏列表
  POST   /api/miniprogram/favorites           - 添加收藏
  DELETE /api/miniprogram/favorites/:id       - 取消收藏

首页：
  GET    /api/miniprogram/home                - 首页数据
```

### 网页端 API

```
认证：
  POST   /api/web/auth/login                  - 用户登录
  POST   /api/web/auth/register               - 用户注册

商品：
  GET    /api/web/products                    - 商品列表
  GET    /api/web/product/:code               - 商品详情
```

### 后台管理 API

```
认证：
  POST   /api/admin/auth/login                - 管理员登录

商品管理：
  GET    /api/admin/products                  - 商品列表（管理视图）
  GET    /api/admin/products/:code            - 商品详情
  PUT    /api/admin/products/:code/description - 更新本地描述

订单管理：
  GET    /api/admin/orders                    - 订单列表
  GET    /api/admin/orders/:id                - 订单详情
  PUT    /api/admin/orders/:id/status         - 更新订单状态

用户管理：
  GET    /api/admin/users                     - 用户列表
  GET    /api/admin/users/:id                 - 用户详情

首页管理：
  GET    /api/admin/homepage/banners          - Banner管理
  POST   /api/admin/homepage/banners          - 创建Banner
```

---

## 🔍 调试技巧

### 1. 查看请求日志

服务器会记录所有请求日志，包括：
- 请求路径
- 请求方法
- IP 地址
- 响应时间
- 错误信息

查看日志：
```bash
tail -f /nbbb/backend.log
```

### 2. 测试认证

```bash
# 获取 token
TOKEN=$(curl -s -X POST http://localhost:3000/api/miniprogram/auth/login \
  -H "Content-Type: application/json" \
  -d '{"code": "TEST_CODE"}' | jq -r '.data.token')

# 使用 token 访问需要认证的接口
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/miniprogram/cart
```

### 3. 查看路由注册

在 `server.js` 启动后，控制台会显示所有注册的路由。

---

## 📞 技术支持

如有问题，请查看：

1. **架构设计文档**: `/nbbb/ARCHITECTURE_DESIGN.md`
2. **完整API文档**: `/nbbb/COMPLETE_API_DOCUMENTATION.md`
3. **服务器日志**: `/nbbb/backend.log`

---

## 🎉 总结

三端分离架构已成功实施！

**优势**：
- ✅ 清晰的接口边界
- ✅ 灵活的前端技术选型
- ✅ 统一的业务逻辑
- ✅ 独立的权限控制
- ✅ 完全向后兼容

**下一步**：
1. 完善网页端和后台管理的功能实现
2. 添加单元测试和集成测试
3. 更新前端代码使用新接口
4. 监控和优化性能

---

**实施完成日期**: 2025-01-05  
**文档版本**: 1.0.0



