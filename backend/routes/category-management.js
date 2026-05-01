const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
const listedProductSyncService = require("../services/listedProductSyncService");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "ecommerce",
  user: "admin",
  password: "AxiaNBBB123"
});

async function syncShoppingProductsToListedProducts(categoryName, productCodes, client) {
  if (!Array.isArray(productCodes) || productCodes.length === 0) return;

  return listedProductSyncService.ensureListedProducts(productCodes, {
    category: categoryName || null,
    notes: categoryName
      ? `auto-synced from shopping category: ${categoryName}`
      : 'auto-synced from shopping category'
  }, client);
}

// 获取分类树结构
router.get("/tree", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c1.id as level1_id,
        c1.name as level1_name,
        c2.id as level2_id,
        c2.name as level2_name,
        c2.product_codes
      FROM category_management c1
      LEFT JOIN category_management c2 ON c1.id = c2.parent_id
      WHERE c1.parent_id IS NULL
      ORDER BY c1.sort_order, c2.sort_order
    `);

    // 构建树形结构
    const tree = {};
    result.rows.forEach(row => {
      if (!tree[row.level1_id]) {
        tree[row.level1_id] = {
          id: row.level1_id,
          name: row.level1_name,
          children: []
        };
      }
      
      if (row.level2_id) {
        tree[row.level1_id].children.push({
          id: row.level2_id,
          name: row.level2_name,
          product_codes: row.product_codes ? row.product_codes.split(';').map(code => code.trim()).filter(code => code !== '') : []
        });
      }
    });

    res.json({ 
      success: true, 
      data: Object.values(tree) 
    });
  } catch (error) {
    console.error("获取分类树错误:", error);
    res.status(500).json({ success: false, message: "服务器错误" });
  }
});

// 获取一级分类列表
router.get("/level1", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, sort_order, created_at
      FROM category_management 
      WHERE parent_id IS NULL 
      ORDER BY sort_order
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("获取一级分类错误:", error);
    res.status(500).json({ success: false, message: "服务器错误" });
  }
});

// 获取二级分类列表
router.get("/level2/:parentId", async (req, res) => {
  try {
    const { parentId } = req.params;
    const result = await pool.query(`
      SELECT id, name, product_codes, sort_order, created_at
      FROM category_management 
      WHERE parent_id = $1 
      ORDER BY sort_order
    `, [parentId]);
    
    // 将 product_codes 转换为数组格式
    const data = result.rows.map(row => {
      let productCodes = [];
      if (row.product_codes) {
        productCodes = row.product_codes
          .split(';')
          .map(code => code.trim())
          .filter(code => code !== '');
      }
      return {
        ...row,
        product_codes: productCodes
      };
    });
    
    res.json({ success: true, data });
  } catch (error) {
    console.error("获取二级分类错误:", error);
    res.status(500).json({ success: false, message: "服务器错误" });
  }
});

// 创建一级分类
router.post("/level1", async (req, res) => {
  try {
    const { name, sort_order = 0 } = req.body;
    const result = await pool.query(`
      INSERT INTO category_management (name, parent_id, sort_order)
      VALUES ($1, NULL, $2)
      RETURNING *
    `, [name, sort_order]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("创建一级分类错误:", error);
    res.status(500).json({ success: false, message: "服务器错误" });
  }
});

// 创建二级分类
router.post("/level2", async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;
  try {
    const { name, parent_id, product_codes = [], sort_order = 0 } = req.body;
    const productCodesStr = Array.isArray(product_codes) 
      ? product_codes.join(';') 
      : product_codes || '';
    await client.query("BEGIN");
    transactionStarted = true;
    const result = await client.query(`
      INSERT INTO category_management (name, parent_id, product_codes, sort_order)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [name, parent_id, productCodesStr, sort_order]);
    const listedSync = await syncShoppingProductsToListedProducts(name, product_codes, client);
    await client.query("COMMIT");
    transactionStarted = false;
    res.status(201).json({
      success: true,
      message: "创建二级分类成功",
      data: result.rows[0],
      listed_sync: listedSync?.summary || null
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }
    console.error("创建二级分类错误:", error);
    res.status(500).json({ success: false, message: "服务器错误" });
  } finally {
    client.release();
  }
});

// 更新分类
router.put("/:id", async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;
  let listedSync = null;
  try {
    const { id } = req.params;
    const { name, product_codes, sort_order } = req.body;
    
    let updateFields = [];
    let values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }
    
    if (product_codes !== undefined) {
      updateFields.push(`product_codes = $${paramCount}`);
      values.push(Array.isArray(product_codes) ? product_codes.join(';') : product_codes);
      paramCount++;
    }
    
    if (sort_order !== undefined) {
      updateFields.push(`sort_order = $${paramCount}`);
      values.push(sort_order);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: "没有提供更新字段" });
    }

    await client.query("BEGIN");
    transactionStarted = true;
    values.push(id);
    const result = await client.query(`
      UPDATE category_management 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "分类不存在" });
    }

    if (product_codes !== undefined) {
      listedSync = await syncShoppingProductsToListedProducts(
        result.rows[0].name,
        Array.isArray(product_codes) ? product_codes : String(product_codes || "").split(";"),
        client
      );
    }

    await client.query("COMMIT");
    transactionStarted = false;
    res.json({
      success: true,
      message: "分类更新成功",
      data: result.rows[0],
      listed_sync: listedSync?.summary || null
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }
    console.error("更新分类错误:", error);
    res.status(500).json({ success: false, message: "服务器错误" });
  } finally {
    client.release();
  }
});

// 删除分类
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查是否有子分类
    const childrenResult = await pool.query(
      "SELECT COUNT(*) FROM category_management WHERE parent_id = $1", 
      [id]
    );
    
    if (parseInt(childrenResult.rows[0].count) > 0) {
      return res.status(400).json({ 
        success: false, 
        message: "无法删除，该分类下还有子分类" 
      });
    }

    const result = await pool.query(
      "DELETE FROM category_management WHERE id = $1 RETURNING *", 
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "分类不存在" });
    }

    res.json({ success: true, message: "分类删除成功" });
  } catch (error) {
    console.error("删除分类错误:", error);
    res.status(500).json({ success: false, message: "服务器错误" });
  }
});

// 批量更新商品编码
router.put("/:id/product-codes", async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;
  try {
    const { id } = req.params;
    const { product_codes } = req.body;
    
    if (!Array.isArray(product_codes)) {
      return res.status(400).json({ 
        success: false, 
        message: "product_codes 必须是数组" 
      });
    }

    await client.query("BEGIN");
    transactionStarted = true;
    const result = await client.query(`
      UPDATE category_management 
      SET product_codes = $1
      WHERE id = $2
      RETURNING *
    `, [product_codes.join(';'), id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "分类不存在" });
    }

    const listedSync = await syncShoppingProductsToListedProducts(result.rows[0].name, product_codes, client);
    await client.query("COMMIT");
    transactionStarted = false;
    res.json({
      success: true,
      message: "商品编码更新成功",
      data: result.rows[0],
      listed_sync: listedSync?.summary || null
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }
    console.error("更新商品编码错误:", error);
    res.status(500).json({ success: false, message: "服务器错误" });
  } finally {
    client.release();
  }
});

// 根据商品编码查询分类
router.get("/by-product/:productCode", async (req, res) => {
  try {
    const { productCode } = req.params;
    const result = await pool.query(`
      SELECT c1.id as level1_id, c1.name as level1_name,
             c2.id as level2_id, c2.name as level2_name
      FROM category_management c1
      JOIN category_management c2 ON c1.id = c2.parent_id
      WHERE c2.product_codes LIKE $1
    `, [`%${productCode}%`]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("根据商品编码查询分类错误:", error);
    res.status(500).json({ success: false, message: "服务器错误" });
  }
});

module.exports = router;
