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

// 获取所有分类（基于 listed_products 实际使用的分类）
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        category as name,
        COUNT(*) as product_count,
        MIN(id) as id
      FROM listed_products
      WHERE is_active = true
      GROUP BY category
      ORDER BY category
    `);
    
    // 格式化返回数据，兼容原有格式
    const categories = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      product_count: parseInt(row.product_count),
      is_active: true
    }));
    
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error("获取分类列表错误:", error);
    res.status(500).json({ success: false, message: "服务器错误" });
  }
});

// 获取分类下的产品
router.get("/:id/products", async (req, res) => {
  try {
    const { id } = req.params;
    // 旧实现依赖本地 products 表作为商品主表，已废弃。
    // 现在接口仅返回空列表，并提示前端改用基于 category-management + /api/product/:productCode 的新接口。
    res.status(410).json({
      success: false,
      message: "此分类下商品列表接口已废弃，请使用分类页接口 /api/category-page 或基于商品编码的 /api/product/:productCode。",
      data: []
    });
  } catch (error) {
    console.error("获取分类产品错误:", error);
    res.status(500).json({ success: false, message: "服务器错误" });
  }
});

// 创建分类
router.post("/", async (req, res) => {
  try {
    const { name, description, parent_id } = req.body;
    const result = await pool.query(`
      INSERT INTO categories (name, description, parent_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [name, description, parent_id]);
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("创建分类错误:", error);
    res.status(500).json({ success: false, message: "服务器错误" });
  }
});

module.exports = router;
