const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "ecommerce",
  user: "admin",
  password: "AxiaNBBB123"
});

// 仪表盘统计数据
router.get('/', async (req, res) => {
  try {
    // 并行查询所有统计数据
    const [
      productsResult,
      categoriesResult,
      ordersResult,
      usersResult
    ] = await Promise.all([
      // 总产品数（从listed_products表获取上架商品数）
      pool.query(`
        SELECT COUNT(*) as count 
        FROM listed_products 
        WHERE is_active = true
      `),
      
      // 总分类数（从category_management表获取）
      pool.query(`
        SELECT COUNT(DISTINCT id) as count 
        FROM category_management
      `),
      
      // 总订单数（从orders表获取）
      pool.query(`
        SELECT COUNT(*) as count 
        FROM orders
      `),
      
      // 总用户数（从users表获取）
      pool.query(`
        SELECT COUNT(*) as count 
        FROM users
      `)
    ]);

    const stats = {
      totalProducts: parseInt(productsResult.rows[0]?.count || 0),
      totalCategories: parseInt(categoriesResult.rows[0]?.count || 0),
      totalOrders: parseInt(ordersResult.rows[0]?.count || 0),
      totalUsers: parseInt(usersResult.rows[0]?.count || 0)
    };

    res.json({
      success: true,
      data: stats,
      message: '获取统计数据成功'
    });
  } catch (error) {
    console.error('获取仪表盘统计数据失败:', error);
    res.status(500).json({
      success: false,
      error: { 
        code: 500, 
        message: '获取统计数据失败: ' + error.message 
      }
    });
  }
});

module.exports = router;
