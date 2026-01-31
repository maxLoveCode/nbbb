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

router.get("/", async (_req, res) => {
  try {
    // 从 listed_products 获取实际使用的分类
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

    // 返回扁平结构（listed_products 中没有层级关系）
    // 为了兼容树形结构的格式，将所有分类作为根节点
    const categories = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      product_count: parseInt(row.product_count),
      children: [],
      is_active: true
    }));

    res.json({ success: true, data: categories });
  } catch (error) {
    console.error("/api/categories-tree error:", error);
    res.status(500).json({ success: false, message: "服务器错误" });
  }
});

module.exports = router;
