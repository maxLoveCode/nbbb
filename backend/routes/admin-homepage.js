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

// ============================================
// Banners 管理
// ============================================

// 获取所有banners
router.get("/banners", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM homepage_banners 
      ORDER BY sort_order ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("获取banners错误:", error);
    res.status(500).json({ success: false, message: "服务器错误", error: error.message });
  }
});

// 获取单个banner
router.get("/banners/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT * FROM homepage_banners WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Banner不存在" });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("获取banner错误:", error);
    res.status(500).json({ success: false, message: "服务器错误", error: error.message });
  }
});

// 创建banner
router.post("/banners", async (req, res) => {
  try {
    const { type, image, video, title, subtitle, brand_name, button_text, button_action, link, sort_order, is_active } = req.body;
    
    // 验证必填字段
    if (!type || (type === 'image' && !image) || (type === 'video' && !video)) {
      return res.status(400).json({ success: false, message: "类型和对应的媒体URL必填" });
    }
    
    const result = await pool.query(`
      INSERT INTO homepage_banners 
      (type, image, video, title, subtitle, brand_name, button_text, button_action, link, sort_order, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [type, image || null, video || null, title || null, subtitle || null, brand_name || 'NOT-BORING BOREBOI', button_text || null, button_action || null, link || null, sort_order || 0, is_active !== undefined ? is_active : true]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("创建banner错误:", error);
    res.status(500).json({ success: false, message: "服务器错误", error: error.message });
  }
});

// 更新banner
router.put("/banners/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { type, image, video, title, subtitle, brand_name, button_text, button_action, link, sort_order, is_active } = req.body;
    
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    if (type !== undefined) { updateFields.push(`type = $${paramCount++}`); values.push(type); }
    if (image !== undefined) { updateFields.push(`image = $${paramCount++}`); values.push(image); }
    if (video !== undefined) { updateFields.push(`video = $${paramCount++}`); values.push(video); }
    if (title !== undefined) { updateFields.push(`title = $${paramCount++}`); values.push(title); }
    if (subtitle !== undefined) { updateFields.push(`subtitle = $${paramCount++}`); values.push(subtitle); }
    if (brand_name !== undefined) { updateFields.push(`brand_name = $${paramCount++}`); values.push(brand_name); }
    if (button_text !== undefined) { updateFields.push(`button_text = $${paramCount++}`); values.push(button_text); }
    if (button_action !== undefined) { updateFields.push(`button_action = $${paramCount++}`); values.push(button_action); }
    if (link !== undefined) { updateFields.push(`link = $${paramCount++}`); values.push(link); }
    if (sort_order !== undefined) { updateFields.push(`sort_order = $${paramCount++}`); values.push(sort_order); }
    if (is_active !== undefined) { updateFields.push(`is_active = $${paramCount++}`); values.push(is_active); }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: "没有提供更新字段" });
    }
    
    values.push(id);
    const result = await pool.query(`
      UPDATE homepage_banners 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Banner不存在" });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("更新banner错误:", error);
    res.status(500).json({ success: false, message: "服务器错误", error: error.message });
  }
});

// 删除banner
router.delete("/banners/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      DELETE FROM homepage_banners WHERE id = $1 RETURNING id
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Banner不存在" });
    }
    
    res.json({ success: true, message: "删除成功" });
  } catch (error) {
    console.error("删除banner错误:", error);
    res.status(500).json({ success: false, message: "服务器错误", error: error.message });
  }
});

// ============================================
// Lower Swiper 管理
// ============================================

// 获取所有lowerSwiper
router.get("/lower-swiper", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM homepage_lower_swiper 
      ORDER BY sort_order ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("获取lowerSwiper错误:", error);
    res.status(500).json({ success: false, message: "服务器错误", error: error.message });
  }
});

// 创建lowerSwiper
router.post("/lower-swiper", async (req, res) => {
  try {
    const { image, title, link, sort_order, is_active } = req.body;
    
    if (!image) {
      return res.status(400).json({ success: false, message: "图片URL必填" });
    }
    
    const result = await pool.query(`
      INSERT INTO homepage_lower_swiper 
      (image, title, link, sort_order, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [image, title || null, link || null, sort_order || 0, is_active !== undefined ? is_active : true]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("创建lowerSwiper错误:", error);
    res.status(500).json({ success: false, message: "服务器错误", error: error.message });
  }
});

// 更新lowerSwiper
router.put("/lower-swiper/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { image, title, link, sort_order, is_active } = req.body;
    
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    if (image !== undefined) { updateFields.push(`image = $${paramCount++}`); values.push(image); }
    if (title !== undefined) { updateFields.push(`title = $${paramCount++}`); values.push(title); }
    if (link !== undefined) { updateFields.push(`link = $${paramCount++}`); values.push(link); }
    if (sort_order !== undefined) { updateFields.push(`sort_order = $${paramCount++}`); values.push(sort_order); }
    if (is_active !== undefined) { updateFields.push(`is_active = $${paramCount++}`); values.push(is_active); }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: "没有提供更新字段" });
    }
    
    values.push(id);
    const result = await pool.query(`
      UPDATE homepage_lower_swiper 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "记录不存在" });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("更新lowerSwiper错误:", error);
    res.status(500).json({ success: false, message: "服务器错误", error: error.message });
  }
});

// 删除lowerSwiper
router.delete("/lower-swiper/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      DELETE FROM homepage_lower_swiper WHERE id = $1 RETURNING id
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "记录不存在" });
    }
    
    res.json({ success: true, message: "删除成功" });
  } catch (error) {
    console.error("删除lowerSwiper错误:", error);
    res.status(500).json({ success: false, message: "服务器错误", error: error.message });
  }
});

// ============================================
// Three Images 管理
// ============================================

// 获取所有threeImages
router.get("/three-images", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM homepage_three_images 
      ORDER BY sort_order ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("获取threeImages错误:", error);
    res.status(500).json({ success: false, message: "服务器错误", error: error.message });
  }
});

// 创建threeImages
router.post("/three-images", async (req, res) => {
  try {
    const { image, link, sort_order, is_active } = req.body;
    
    if (!image) {
      return res.status(400).json({ success: false, message: "图片URL必填" });
    }
    
    const result = await pool.query(`
      INSERT INTO homepage_three_images 
      (image, link, sort_order, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [image, link || null, sort_order || 0, is_active !== undefined ? is_active : true]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("创建threeImages错误:", error);
    res.status(500).json({ success: false, message: "服务器错误", error: error.message });
  }
});

// 更新threeImages
router.put("/three-images/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { image, link, sort_order, is_active } = req.body;
    
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    if (image !== undefined) updateFields.push(`image = $${paramCount++}`, values.push(image));
    if (link !== undefined) updateFields.push(`link = $${paramCount++}`, values.push(link));
    if (sort_order !== undefined) updateFields.push(`sort_order = $${paramCount++}`, values.push(sort_order));
    if (is_active !== undefined) updateFields.push(`is_active = $${paramCount++}`, values.push(is_active));
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: "没有提供更新字段" });
    }
    
    values.push(id);
    const result = await pool.query(`
      UPDATE homepage_three_images 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "记录不存在" });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("更新threeImages错误:", error);
    res.status(500).json({ success: false, message: "服务器错误", error: error.message });
  }
});

// 删除threeImages
router.delete("/three-images/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      DELETE FROM homepage_three_images WHERE id = $1 RETURNING id
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "记录不存在" });
    }
    
    res.json({ success: true, message: "删除成功" });
  } catch (error) {
    console.error("删除threeImages错误:", error);
    res.status(500).json({ success: false, message: "服务器错误", error: error.message });
  }
});

module.exports = router;

