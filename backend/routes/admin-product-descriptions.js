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

// 获取单个商品的本地描述
// GET /api/admin/product-descriptions/:productCode
router.get("/:productCode", async (req, res) => {
  try {
    const { productCode } = req.params;

    if (!productCode || productCode.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "商品编码不能为空"
      });
    }

    const result = await pool.query(
      `SELECT product_code, local_description 
       FROM product_extras 
       WHERE product_code = $1`,
      [productCode.trim()]
    );

    if (result.rows.length === 0) {
      // 没有记录时返回空描述，方便前端展示并进行首次保存
      return res.json({
        success: true,
        data: {
          product_code: productCode.trim(),
          local_description: ""
        }
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("获取商品本地描述错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器错误",
      error: error.message
    });
  }
});

// 创建或更新商品的本地描述（UPSERT）
// POST /api/admin/product-descriptions/:productCode
router.post("/:productCode", async (req, res) => {
  try {
    const { productCode } = req.params;
    const { local_description } = req.body;

    if (!productCode || productCode.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "商品编码不能为空"
      });
    }

    const trimmedCode = productCode.trim();
    const desc = (local_description || "").trim();

    // 先检查是否存在记录
    const checkResult = await pool.query(
      `SELECT id FROM product_extras WHERE product_code = $1`,
      [trimmedCode]
    );

    let dbResult;
    if (checkResult.rows.length > 0) {
      dbResult = await pool.query(
        `UPDATE product_extras 
         SET local_description = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE product_code = $2
         RETURNING product_code, local_description`,
        [desc, trimmedCode]
      );
    } else {
      dbResult = await pool.query(
        `INSERT INTO product_extras (product_code, local_description, created_at, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING product_code, local_description`,
        [trimmedCode, desc]
      );
    }

    res.json({
      success: true,
      data: dbResult.rows[0]
    });
  } catch (error) {
    console.error("保存商品本地描述错误:", error);
    res.status(500).json({
      success: false,
      message: "服务器错误",
      error: error.message
    });
  }
});

module.exports = router;


