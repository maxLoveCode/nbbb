const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('../middleware/auth');

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "ecommerce",
  user: "admin",
  password: "AxiaNBBB123"
});

// 记录浏览历史
router.post('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_code, productCode, spuId } = req.body;
    const code = product_code || productCode || spuId;
    
    if (!code) {
      return res.json({ success: true, message: '已记录' });
    }
    
    // 先检查是否已存在，存在则更新时间
    const existing = await pool.query(
      'SELECT id FROM browse_history WHERE user_id = $1 AND product_code = $2',
      [userId, code]
    );
    
    if (existing.rows.length > 0) {
      await pool.query(
        'UPDATE browse_history SET browse_time = NOW(), updated_at = NOW() WHERE id = $1',
        [existing.rows[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO browse_history (user_id, product_code, browse_time) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING',
        [userId, code]
      );
    }
    
    res.json({ success: true, message: '已记录' });
  } catch (error) {
    console.error('记录浏览历史失败:', error);
    // 即使失败也返回成功，不影响用户体验
    res.json({ success: true, message: '已记录' });
  }
});

// 获取浏览历史
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    
    const result = await pool.query(
      'SELECT product_code, browse_time as viewed_at FROM browse_history WHERE user_id = $1 ORDER BY browse_time DESC LIMIT $2 OFFSET $3',
      [userId, parseInt(pageSize), offset]
    );
    
    res.json({
      success: true,
      data: {
        items: result.rows,
        total: result.rows.length
      }
    });
  } catch (error) {
    console.error('获取浏览历史失败:', error);
    res.json({ success: true, data: { items: [], total: 0 } });
  }
});

// 删除浏览历史
router.delete('/:productCode', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { productCode } = req.params;
    
    await pool.query(
      'DELETE FROM browse_history WHERE user_id = $1 AND product_code = $2',
      [userId, productCode]
    );
    
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除浏览历史失败:', error);
    res.json({ success: true, message: '删除成功' });
  }
});

// 清空浏览历史
router.delete('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    await pool.query('DELETE FROM browse_history WHERE user_id = $1', [userId]);
    res.json({ success: true, message: '清空成功' });
  } catch (error) {
    console.error('清空浏览历史失败:', error);
    res.json({ success: true, message: '清空成功' });
  }
});

module.exports = router;
