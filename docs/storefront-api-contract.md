# Storefront API Contract

## Goal
- 为服装独立站统一提供 `/api/web/*` 协议层。
- 复用现有商品、分类、首页、购物车、订单、收藏、地址、支付能力。
- 避免前台直接依赖旧版 `/api/*` 历史路径和不一致的返回格式。

## Reused Directly
- `GET /api/web/products`
- `GET /api/web/products/:code`
- `GET /api/web/orders/*` 通过旧订单路由转发
- `GET|POST|PUT|DELETE /api/web/cart`
- `GET|POST|DELETE /api/web/favorites`
- `GET|POST|PUT|DELETE /api/web/addresses`
- `POST|GET|PUT /api/web/payment/*`

## New Web BFF Routes
- `GET /api/web/home`
  - 聚合首页 Banner、横滑模块、三图模块、首页分类和精选商品。
- `GET /api/web/categories`
  - 聚合 `category_page_categories` 与 `listed_products` 计数，输出独立站分类数据。
- `GET /api/web/listing`
  - 支持 `page`、`pageSize`、`keyword`、`category`、`sort`、`minPrice`、`maxPrice`、`inStock`。
- `GET /api/web/search/suggest`
  - 返回搜索联想数据。
- `POST /api/web/auth/register`
  - 邮箱注册，创建 Web 用户与 JWT。
- `POST /api/web/auth/login`
  - 账号密码登录，兼容邮箱 / 用户名 / 手机号。
- `GET /api/web/auth/me`
  - 返回当前 Web 用户信息。
- `POST /api/web/auth/logout`
  - Web 端登出占位，前端负责清理 token。

## Frontend Routing Convention
- 首页：`/`
- 分类聚合：`/collections`
- 分类详情：`/collections/[slug]`
- 商品详情：`/products/[code]`
- 搜索：`/search`
- 品牌故事：`/brand`
- Lookbook：`/lookbook`
- 活动专题：`/campaign/[slug]`
- 账户：`/account`
- 购物车：`/cart`
- 结算：`/checkout`

## Next Steps
- 补充颜色 / 尺码 facet 与筛选聚合。
- 为首页、Lookbook、专题页补更完整的 CMS 结构。
- 将订单、支付返回值进一步格式化为完全一致的 Web 响应结构。
