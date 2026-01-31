const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();

const requestLogger = require("./middleware/requestLogger");

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(requestLogger);

// Helmet配置 - 为admin页面和API使用不同的CSP策略
app.use((req, res, next) => {
  if (req.path.startsWith('/admin')) {
    // Admin页面需要更宽松的CSP策略（内部管理工具）
    // 注意：为了支持Bootstrap等库，需要允许unsafe-eval
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'", 
            "'unsafe-inline'", 
            "'unsafe-hashes'", 
            "'unsafe-eval'",  // Bootstrap等库可能需要eval
            "https://cdn.jsdelivr.net",
            "https://unpkg.com",
            "https://cdnjs.cloudflare.com"
          ],
          scriptSrcAttr: ["'unsafe-inline'"], // 允许内联事件处理器
          styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://unpkg.com", "https://cdnjs.cloudflare.com"],
          styleSrcElem: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://unpkg.com", "https://cdnjs.cloudflare.com"],
          fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://unpkg.com", "https://cdnjs.cloudflare.com", "data:"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://cdn.jsdelivr.net", "https://unpkg.com", "https://cdnjs.cloudflare.com"],
        },
      },
      crossOriginOpenerPolicy: false,
      originAgentCluster: false,
    })(req, res, next);
  } else if (req.path === '/api-docs' || req.path === '/api-doc') {
    // API文档页面需要允许内联样式
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          styleSrcElem: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    })(req, res, next);
  } else {
    // API和其他页面使用严格的CSP策略
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
        },
      },
    })(req, res, next);
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, '..', 'public')));

// Web端静态文件服务
app.use('/web', express.static(path.join(__dirname, '..', 'web')));
// Web端首页路由
app.get('/web', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'web', 'index.html'));
});
app.get('/web/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'web', 'index.html'));
});

// Admin静态文件服务 - 禁用缓存
app.use('/admin', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    express.static(path.join(__dirname, '..', 'admin'))(req, res, next);
});

// 限流配置
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 500, // 每个IP 15分钟内最多500次请求
  message: { code: 429, message: "请求过于频繁，请稍后再试" },
  standardHeaders: true,
  legacyHeaders: false,
  // 跳过本地请求的限流（开发/测试用）
  skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1'
});
app.use(limiter);

// 数据库连接
const { Pool } = require("pg");
const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "ecommerce",
  user: "admin",
  password: "AxiaNBBB123"
});

// 测试数据库连接
pool.query("SELECT NOW()", (err, result) => {
  if (err) {
    console.error("数据库连接失败:", err);
  } else {
    console.log("数据库连接成功:", result.rows[0]);
  }
});

// ============================================
// 新的三端分离路由结构
// ============================================

// 1. 小程序端路由
const miniprogramRouter = require("./routes/miniprogram");
app.use("/api/miniprogram", miniprogramRouter);

// 2. 网页端路由
const webRouter = require("./routes/web");
app.use("/api/web", webRouter);

// 3. 后台管理路由
const adminRouter = require("./routes/admin");
app.use("/api/admin", adminRouter);

// 4. 公共路由
const commonRouter = require("./routes/common");
app.use("/api/common", commonRouter);

// ============================================
// 保留的旧版路由（向后兼容）
// 这些路由将在未来版本中逐步废弃
// ============================================

const productsRouter = require("./routes/products");
const productRouter = require("./routes/product");
const categoriesRouter = require("./routes/categories");
const categoriesTreeRouter = require("./routes/categories-tree");
const productExtrasRouter = require("./routes/product-extras");
const authRouter = require("./routes/auth");
const userRouter = require("./routes/user");
const testAuthRouter = require("./routes/test-auth");
const jushuitanRouter = require("./routes/jushuitan");
const categoryManagementRouter = require("./routes/category-management");
const miniprogramHomeRouter = require("./routes/miniprogram-home");
const cartRouter = require("./routes/cart");
const ordersRouter = require("./routes/orders");
const paymentRouter = require("./routes/payment");
const adminHomepageRouter = require("./routes/admin-homepage");
const categoryPageRouter = require("./routes/category-page");
const shoppingRouter = require("./routes/shopping");
const addressRouter = require("./routes/address");
const adminProductDescriptionsRouter = require("./routes/admin-product-descriptions");
const favoritesRouter = require("./routes/favorites");

// 旧版接口（保持兼容）
app.use("/api/product", productRouter);
app.use("/api/products", productsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/categories-tree", categoriesTreeRouter);
app.use("/api/products", productExtrasRouter);
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/test", testAuthRouter);
app.use("/api/jst", jushuitanRouter);
app.use("/api/category-management", categoryManagementRouter);
app.use("/api/miniprogram/home", miniprogramHomeRouter); // 小程序首页（旧）
app.use("/api/cart", cartRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/addresses", addressRouter);
app.use("/api/admin/homepage", adminHomepageRouter); // 后台首页管理（旧）
app.use("/api/admin/product-descriptions", adminProductDescriptionsRouter);
app.use("/api/category-page", categoryPageRouter);
app.use("/api/shopping", shoppingRouter);
app.use("/api/favorites", favoritesRouter);

// 基础路由
// 根路径返回web端首页
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'web', 'index.html'));
});

// API信息路由（移动到 /api/info）
app.get("/api/info", (req, res) => {
  res.json({
    message: "NBBB E-commerce API",
    version: "2.0.0",
    architecture: "三端分离架构",
    endpoints: {
      miniprogram: "/api/miniprogram/*",
      web: "/api/web/*",
      admin: "/api/admin/*",
      common: "/api/common/*"
    },
    legacy: {
      note: "旧版接口 /api/* 仍然可用（向后兼容）",
      deprecation: "建议迁移到新的三端分离接口"
    },
    documentation: "/api-docs",
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString()
  });
});

// API 文档路由
app.get("/api-docs", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "api-docs.html"));
});

// 兼容单数形式的重定向（必须在404处理之前）
app.get("/api-doc", (req, res) => {
  res.redirect(301, "/api-docs");
});

// Markdown 文档下载路由
app.get("/COMPLETE_API_DOCUMENTATION.md", (req, res) => {
  const filePath = path.join(__dirname, "..", "COMPLETE_API_DOCUMENTATION.md");
  res.setHeader("Content-Type", "text/markdown; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=COMPLETE_API_DOCUMENTATION.md");
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error("下载Markdown文档失败:", err);
      res.status(404).json({
        error: "Not Found",
        message: "Markdown文档不存在"
      });
    }
  });
});

// 404 处理 - 必须在所有路由之后
app.use((req, res, next) => {
  res.status(404).json({
    error: "Not Found",
    message: `The page you are looking for is not found.`,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error("服务器错误:", err);
  res.status(err.status || 500).json({
    error: "Internal Server Error",
    message: err.message || "服务器内部错误",
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  let serverIp = 'localhost';
  
  // 获取第一个非回环的IPv4地址
  for (const interfaceName in networkInterfaces) {
    const addresses = networkInterfaces[interfaceName];
    for (const addr of addresses) {
      if (addr.family === 'IPv4' && !addr.internal) {
        serverIp = addr.address;
        break;
      }
    }
    if (serverIp !== 'localhost') break;
  }
  
  console.log("服务器运行在端口 " + PORT);
  console.log("本地访问: http://localhost:" + PORT);
  console.log("IP访问: http://" + serverIp + ":" + PORT);
  console.log("API文档: http://" + serverIp + ":" + PORT + "/api-docs");
});
