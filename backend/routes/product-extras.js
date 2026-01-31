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

// /api/products/:id/images
router.get("/products/:id/images", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, image_url, is_primary, sort_order, created_at
       FROM product_images
       WHERE product_id = $1
       ORDER BY is_primary DESC, sort_order ASC, id ASC`,
      [id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("/products/:id/images error:", error);
    res.status(500).json({ success: false, message: "服务器错误" });
  }
});

// /api/products/:id/recommendations （旧版：基于本地 products 表的推荐逻辑，已废弃）
router.get("/products/:id/recommendations", async (req, res) => {
  return res.status(410).json({
    success: false,
    message: "推荐接口已废弃，请在前端基于商品编码和分类配置自行组合推荐列表。"
  });
});

module.exports = router;
