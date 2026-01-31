const express = require("express");
const router = express.Router();
const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "ecommerce",
  user: "admin",
  password: "AxiaNBBB123"
});

// 旧版本地商品表接口已废弃，保留路由占位以避免前端 404，但不再对 products 表做任何读写。

// GET /api/products - 返回空列表并提示使用聚水潭编码接口
router.get("/", async (req, res) => {
  return res.status(410).json({
    success: false,
    message: "此接口已废弃，请使用基于聚水潭编码的 /api/product/:productCode 接口获取商品详情。",
    data: [],
    pagination: {
      page: 1,
      pageSize: 0,
      total: 0
    }
  });
});

// 其余 CRUD 接口统一返回 410 Gone，提示不要再使用本地 products 表作为商品主表
router.get("/:id", (req, res) => {
  return res.status(410).json({
    success: false,
    message: "本地商品详情接口已废弃，请改用 /api/product/:productCode。"
  });
});

router.post("/", (req, res) => {
  return res.status(410).json({
    success: false,
    message: "本地创建商品接口已废弃，系统不再维护本地商品主表。"
  });
});

router.put("/:id", (req, res) => {
  return res.status(410).json({
    success: false,
    message: "本地更新商品接口已废弃，系统不再维护本地商品主表。"
  });
});

router.delete("/:id", (req, res) => {
  return res.status(410).json({
    success: false,
    message: "本地删除商品接口已废弃，系统不再维护本地商品主表。"
  });
});

module.exports = router;
