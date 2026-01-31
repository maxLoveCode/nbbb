# NBBB 电商系统 - 微信小程序登录后端

## 📋 项目概述

基于 Node.js + Express + PostgreSQL 的电商系统后端，支持微信小程序登录、用户管理、产品管理等功能。

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- PostgreSQL >= 12.0
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 环境配置

1. 复制环境配置模板：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，填入正确的配置：
```bash
# 微信小程序配置
WX_APPID=your_wechat_appid_here
WX_SECRET=your_wechat_secret_here

# JWT 配置
JWT_SECRET=your_jwt_secret_key_here
TOKEN_EXPIRES_IN=30d

# 数据库配置
DB_PASSWORD=your_database_password
```

### 数据库初始化

```bash
# 执行数据库迁移
PGPASSWORD=your_password psql -h localhost -U admin -d ecommerce -f backend/migrations/001_create_users_and_sessions.sql
PGPASSWORD=your_password psql -h localhost -U admin -d ecommerce -f backend/migrations/002_update_users_for_wechat.sql
```

### 启动服务

```bash
# 开发环境
npm run dev

# 生产环境
npm start
```

## 📚 API 文档

### 认证接口

#### 微信登录
```bash
POST /api/auth/wechat/login
Content-Type: application/json

{
  "code": "wx_login_code_from_frontend"
}
```

响应：
```json
{
  "code": 0,
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": 1,
      "openid": "wx_openid",
      "nickname": "微信用户",
      "avatarUrl": "https://...",
      "mobile": null
    }
  }
}
```

#### 获取手机号
```bash
POST /api/auth/wechat/phone
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "code": "phone_code_from_getPhoneNumber"
}
```

#### 获取当前用户信息
```bash
GET /api/auth/me
Authorization: Bearer <jwt_token>
```

#### 更新用户资料
```bash
POST /api/user/profile
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "nickname": "新昵称",
  "avatarUrl": "https://new-avatar-url.com"
}
```

#### 登出
```bash
POST /api/auth/logout
Authorization: Bearer <jwt_token>
```

### 产品接口

#### 获取产品列表
```bash
GET /api/products?page=1&pageSize=10&keyword=iphone&sort=price_desc
```

#### 获取产品详情
```bash
GET /api/products/:id
```

#### 获取产品图片
```bash
GET /api/products/:id/images
```

#### 获取产品推荐
```bash
GET /api/products/:id/recommendations
```

### 分类接口

#### 获取分类列表
```bash
GET /api/categories
```

#### 获取分类树
```bash
GET /api/categories/tree
```

#### 获取分类下产品
```bash
GET /api/categories/:id/products
```

### 首页接口

#### 获取首页数据
```bash
GET /api/home
```

## 🗄️ 数据库结构

### 用户表 (users)
- `id` - 主键
- `openid` - 微信 openid（唯一）
- `unionid` - 微信 unionid
- `nickname` - 用户昵称
- `avatar_url` - 头像 URL
- `mobile` - 手机号
- `username` - 用户名
- `email` - 邮箱
- `password_hash` - 密码哈希
- `is_active` - 是否激活
- `created_at` - 创建时间
- `updated_at` - 更新时间

### 会话表 (user_sessions)
- `id` - 主键
- `user_id` - 用户ID
- `session_key` - 微信 session_key
- `expires_at` - 过期时间
- `created_at` - 创建时间

## 🔧 开发指南

### 项目结构
```
/nbbb/
├── backend/
│   ├── controllers/          # 控制器
│   │   ├── authController.js
│   │   └── userController.js
│   ├── middleware/           # 中间件
│   │   └── auth.js
│   ├── routes/              # 路由
│   │   ├── auth.js
│   │   ├── user.js
│   │   ├── products.js
│   │   └── categories.js
│   ├── utils/               # 工具类
│   │   ├── wechat.js
│   │   └── jwt.js
│   ├── migrations/          # 数据库迁移
│   │   ├── 001_create_users_and_sessions.sql
│   │   └── 002_update_users_for_wechat.sql
│   └── server.js            # 主服务器文件
├── .env                     # 环境配置
├── .env.example            # 环境配置模板
├── package.json            # 项目配置
└── README.md              # 项目说明
```

### 添加新接口

1. 在 `controllers/` 中创建控制器
2. 在 `routes/` 中创建路由
3. 在 `server.js` 中注册路由
4. 更新 API 文档

### 错误处理

所有接口统一返回格式：
```json
{
  "code": 0,        // 0 表示成功，非0表示失败
  "message": "...", // 错误信息
  "data": {...}     // 响应数据
}
```

## 🔒 安全说明

1. **JWT Secret**: 生产环境请使用强随机密钥
2. **数据库密码**: 使用强密码
3. **微信密钥**: 妥善保管 AppSecret
4. **HTTPS**: 生产环境建议使用 HTTPS
5. **限流**: 已配置基础限流保护

## 🧪 测试

### 手动测试

```bash
# 测试健康检查
curl http://localhost:3000/health

# 测试微信登录（需要真实 code）
curl -X POST http://localhost:3000/api/auth/wechat/login \
  -H "Content-Type: application/json" \
  -d {code:test_code}
```

### 集成测试

运行测试脚本：
```bash
npm test
```

## 🚀 部署

### 生产环境部署

1. 配置环境变量
2. 安装依赖：`npm ci --production`
3. 执行数据库迁移
4. 启动服务：`npm start`

### Docker 部署（可选）

```bash
# 构建镜像
docker build -t nbbb-ecommerce .

# 运行容器
docker run -p 3000:3000 --env-file .env nbbb-ecommerce
```

## 📝 更新日志

### v1.0.0 (2025-08-20)
- ✅ 微信小程序登录功能
- ✅ JWT 认证中间件
- ✅ 用户资料管理
- ✅ 手机号获取功能
- ✅ 产品管理 API
- ✅ 分类管理 API
- ✅ 首页数据 API

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

MIT License

## 📞 技术支持

如有问题，请联系开发团队或提交 Issue。
