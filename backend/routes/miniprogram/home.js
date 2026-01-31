const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

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
    // 并行获取所有首页配置数据
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

// 获取首页Banners
router.get('/banners', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM homepage_banners 
      WHERE is_active = true 
      ORDER BY sort_order ASC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('获取banners失败:', error);
    res.status(500).json({
      success: false,
      message: '获取banners失败'
    });
  }
});

// 获取横向轮播
router.get('/lower-swiper', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM homepage_lower_swiper 
      WHERE is_active = true 
      ORDER BY sort_order ASC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('获取lower-swiper失败:', error);
    res.status(500).json({
      success: false,
      message: '获取轮播失败'
    });
  }
});

// 获取三图展示
router.get('/three-images', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM homepage_three_images 
      WHERE is_active = true 
      ORDER BY sort_order ASC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('获取three-images失败:', error);
    res.status(500).json({
      success: false,
      message: '获取三图展示失败'
    });
  }
});

module.exports = router;
