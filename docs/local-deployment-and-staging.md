# Local Deployment and Staging Guide

本文档说明如何在本地部署 NBBB 项目、如何让本地项目连接真实测试数据，以及如何同步 production 数据到 staging。

## 环境角色

- `local`：开发机本地环境。后端默认运行在 `http://localhost:3000`，storefront 默认运行在 `http://localhost:3001`，admin 默认运行在 `http://localhost:5173`。
- `staging`：正式发布前的测试环境，应该使用 production 的数据副本或脱敏数据。
- `production`：真实线上环境。不要从 staging 或 local 写回 production。

数据同步方向只允许：

```text
production -> staging -> local
```

不要做 `staging -> production` 或 `local -> production` 的数据库同步。

## 本地后端部署

安装依赖：

```bash
npm install
cp .env.example .env
```

编辑 `.env`：

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce
DB_USER=admin
DB_PASSWORD=your_database_password

JWT_SECRET=replace_with_local_secret
TOKEN_EXPIRES_IN=30d
```

初始化数据库时，按 `backend/migrations/` 中的 SQL 顺序执行迁移。

启动后端：

```bash
npm run dev
```

检查：

```bash
curl http://localhost:3000/health
```

## 本地 Storefront

```bash
cd storefront
npm install
cp .env.example .env.local
```

`storefront/.env.local`：

```env
API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

启动：

```bash
npm run dev -- -p 3001
```

## 本地 Admin

```bash
cd admin
npm install
cp .env.example .env.local
```

`admin/.env.local`：

```env
VITE_ADMIN_API_DEFAULT_ENV=local
VITE_ADMIN_API_STAGING_URL=https://staging-api.example.com
VITE_ADMIN_API_PROD_URL=https://api.example.com
```

这里填写的是后端 origin，不要带 `/api` 后缀。

启动：

```bash
npm run dev
```

本地访问：

```text
http://localhost:5173/admin/
```

如果希望通过后端服务访问管理后台，先构建 admin：

```bash
cd admin
npm run build
cd ..
npm run dev
```

后端会优先服务 `admin/dist`，如果该目录不存在，则回退到 `admin-cdn`：

```text
http://localhost:3000/admin
```

admin 右上角可以切换 `Local`、`ST`、`Prod`。切换环境会退出当前登录，避免不同环境的 token 混用。

## Admin 环境切换规则

admin 的请求分两类：

- 管理端接口：`/api/admin/*`
- 公共配置接口：`/api/*`

环境切换后的实际请求地址：

| 环境 | 示例 |
| --- | --- |
| Local | `/api/admin/products`，本地开发时由 Vite proxy 转发到 `http://localhost:3000` |
| ST | `https://staging-api.example.com/api/admin/products` |
| Prod | `https://api.example.com/api/admin/products` |

如果 `VITE_ADMIN_API_STAGING_URL` 或 `VITE_ADMIN_API_PROD_URL` 没有配置，对应选项会被禁用。

生产环境构建 admin 时，需要在构建前提供这些变量：

```bash
cd admin
VITE_ADMIN_API_STAGING_URL=https://staging-api.example.com \
VITE_ADMIN_API_PROD_URL=https://api.example.com \
npm run build
```

## Staging 数据同步

项目提供了同步脚本：

```bash
cp .env.sync.example .env.sync
```

编辑 `.env.sync`：

```env
PROD_DB_HOST=prod-db.example.com
PROD_DB_PORT=5432
PROD_DB_NAME=ecommerce
PROD_DB_USER=readonly_user
PROD_DB_PASSWORD=replace_me

STAGING_DB_HOST=staging-db.example.com
STAGING_DB_PORT=5432
STAGING_DB_NAME=ecommerce_staging
STAGING_DB_USER=staging_admin
STAGING_DB_PASSWORD=replace_me
```

先 dry run：

```bash
npm run db:sync:staging
```

确认表列表无误后执行：

```bash
npm run db:sync:staging -- --apply
```

脚本会先备份 staging 选中的表，再清空 staging 对应表并恢复 production 数据。

## 默认同步的表

默认同步偏配置和商品展示的数据：

```text
category_management
listed_products
product_extras
category_page_categories
category_page_products
category_page_cards
homepage_banners
homepage_lower_swiper
homepage_three_images
system_configs
```

默认不同步这些敏感或交易表：

```text
users
user_sessions
orders
order_items
order_payments
addresses
shopping_cart
favorites
```

如果确实要同步用户、订单、地址或支付相关数据，必须先设计脱敏流程。

## 自定义同步表

可以在 `.env.sync` 里覆盖默认表：

```env
SYNC_TABLES="listed_products product_extras homepage_banners homepage_lower_swiper homepage_three_images"
```

也可以指定 dump 输出目录：

```env
SYNC_BACKUP_DIR=/secure/path/db-sync
```

## 安全要求

- production 数据库账号优先使用只读账号。
- staging 数据库和 production 数据库必须使用不同账号、不同密码。
- staging 允许被覆盖，production 不允许被脚本写入。
- 含手机号、openid、地址、订单、支付的数据不得直接进入 staging，除非已脱敏。
- 本地开发优先连接 staging，不要直接连接 production。
