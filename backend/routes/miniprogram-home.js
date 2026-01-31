const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// 旧版小程序首页路由（向后兼容）
// 新版路由位于 /api/miniprogram/home

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'ecommerce',
  user: 'admin',
  password: 'AxiaNBBB123'
});

// 获取小程序首页配置数据
router.get('/', async (req, res) => {
  try {
    const [bannersResult, lowerSwiperResult, threeImagesResult] = await Promise.all([
      pool.query(`
        SELECT * FROM homepage_banners 
        WHERE is_active = true 
        ORDER BY sort_order ASC
      `),
      pool.query(`
        SELECT * FROM homepage_lower_swiper 
        WHERE is_active = true 
        ORDER BY sort_order ASC
      `),
      pool.query(`
        SELECT * FROM homepage_three_images 
        WHERE is_active = true 
        ORDER BY sort_order ASC
      `)
    ]);

    res.json({
      success: true,
      data: {
        banners: bannersResult.rows,
        lowerSwiper: lowerSwiperResult.rows,
        threeImages: threeImagesResult.rows
      }
    });
  } catch (error) {
    console.error('获取首页配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取首页配置失败: ' + error.message
    });
  }
});

module.exports = router;
