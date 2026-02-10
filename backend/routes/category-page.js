const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const productService = require('../services/productService');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'ecommerce',
  user: 'admin',
  password: 'AxiaNBBB123'
});

/**
 * 获取分类页完整数据
 * GET /api/category-page
 * 
 * 数据来源：
 * 1. category_page_categories - 分类配置
 * 2. category_page_products - 分类商品关联（统一数据源）
 * 3. listed_products - fallback（当分类没有配置商品时）
 */
router.get('/', async (req, res) => {
  try {
    // 1. 获取所有启用的分类配置
    const categoriesResult = await pool.query(`
      SELECT id, name, type, source, image, description, sort_order, data_source
      FROM category_page_categories
      WHERE is_active = true
      ORDER BY sort_order ASC
    `);

    const categories = categoriesResult.rows;

    // 2. 获取所有分类的商品编码（统一从 category_page_products 获取）
    const productsResult = await pool.query(`
      SELECT category_id, product_code, sort_order
      FROM category_page_products
      WHERE is_active = true
      ORDER BY category_id, sort_order ASC
    `);

    // 按分类ID分组商品编码
    const productCodesByCategory = {};
    productsResult.rows.forEach(row => {
      if (!productCodesByCategory[row.category_id]) {
        productCodesByCategory[row.category_id] = [];
      }
      productCodesByCategory[row.category_id].push(row.product_code);
    });

    // 3. 构建返回数据
    const result = [];

    for (const category of categories) {
      const categoryData = {
        id: category.id,
        name: category.name,
        type: category.type,
        source: category.source,
        image: category.image,
        description: category.description,
        content: {}
      };

      if (category.type === 'products') {
        // 从 category_page_products 获取商品编码
        let productCodes = productCodesByCategory[category.id] || [];

        if (productCodes.length > 0) {
          try {
            // 批量获取商品（最多10个用于首页展示）
            const products = await productService.batchGetProductsFromJST(productCodes.slice(0, 10));
            
            categoryData.content.products = products.map(p => ({
              id: p.code,
              title: p.name,
              price: p.price,
              original_price: p.cost_price,
              image: p.main_image,
              currency: '¥'
            }));

            categoryData.content.pagination = {
              pageNum: 1,
              pageSize: 10,
              total: productCodes.length,
              totalPages: Math.ceil(productCodes.length / 10)
            };
          } catch (error) {
            console.error(`获取分类 ${category.name} 的商品失败:`, error.message);
            categoryData.content.products = [];
            categoryData.content.pagination = { pageNum: 1, pageSize: 10, total: 0, totalPages: 0 };
          }
        } else {
          // fallback: 从 listed_products 按分类名获取
          try {
            const productResult = await productService.getProductList({
              page: 1,
              pageSize: 10,
              category: category.name
            });

            categoryData.content.products = (productResult.products || []).map(p => ({
              id: p.code,
              title: p.name,
              price: p.price,
              original_price: p.cost_price,
              image: p.main_image,
              currency: '¥'
            }));

            categoryData.content.pagination = {
              pageNum: productResult.pagination?.page || 1,
              pageSize: productResult.pagination?.pageSize || 10,
              total: productResult.pagination?.total || 0,
              totalPages: productResult.pagination?.totalPages || 0
            };
          } catch (error) {
            console.error(`获取分类 ${category.name} 的商品失败:`, error.message);
            categoryData.content.products = [];
            categoryData.content.pagination = { pageNum: 1, pageSize: 10, total: 0, totalPages: 0 };
          }
        }
      } else if (category.type === 'cards') {
        // cards 类型：预留扩展
        categoryData.content.cards = [];
      }

      result.push(categoryData);
    }

    res.json({
      success: true,
      code: 0,
      data: {
        categories: result
      }
    });
  } catch (error) {
    console.error('获取分类页数据失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取分类页数据失败: ' + error.message
    });
  }
});

/**
 * 获取指定分类的商品列表（分页）
 * GET /api/category-page/:id/products
 */
router.get('/:id/products', async (req, res) => {
  try {
    const { id } = req.params;
    const { pageNum = 1, pageSize = 10 } = req.query;

    // 1. 获取分类信息
    const categoryResult = await pool.query(
      'SELECT * FROM category_page_categories WHERE id = $1 AND is_active = true',
      [id]
    );

    if (categoryResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '分类不存在'
      });
    }

    const category = categoryResult.rows[0];

    // 2. 检查分类类型
    if (category.type !== 'products') {
      return res.status(400).json({
        success: false,
        code: 400,
        message: '该分类不支持商品列表'
      });
    }

    // 3. 从 category_page_products 获取商品编码
    const codesResult = await pool.query(
      `SELECT product_code FROM category_page_products 
       WHERE category_id = $1 AND is_active = true 
       ORDER BY sort_order`,
      [id]
    );
    
    let productCodes = codesResult.rows.map(row => row.product_code);

    // 4. 分页处理
    const page = parseInt(pageNum);
    const size = parseInt(pageSize);
    const startIndex = (page - 1) * size;
    const pagedCodes = productCodes.slice(startIndex, startIndex + size);

    let products = [];
    
    if (pagedCodes.length > 0) {
      // 从聚水潭获取商品详情
      const rawProducts = await productService.batchGetProductsFromJST(pagedCodes);
      products = rawProducts.map(p => ({
        id: p.code,
        title: p.name,
        price: p.price,
        original_price: p.cost_price,
        image: p.main_image,
        currency: '¥'
      }));
    } else if (productCodes.length === 0) {
      // fallback: 从 listed_products 获取
      const productResult = await productService.getProductList({
        page,
        pageSize: size,
        category: category.name
      });
      products = (productResult.products || []).map(p => ({
        id: p.code,
        title: p.name,
        price: p.price,
        original_price: p.cost_price,
        image: p.main_image,
        currency: '¥'
      }));
      productCodes = new Array(productResult.pagination?.total || 0);
    }

    res.json({
      success: true,
      code: 0,
      data: {
        list: products,
        pagination: {
          pageNum: page,
          pageSize: size,
          total: productCodes.length,
          totalPages: Math.ceil(productCodes.length / size)
        }
      }
    });
  } catch (error) {
    console.error('获取分类商品列表失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取商品列表失败: ' + error.message
    });
  }
});

/**
 * 获取分类页配置（管理用）
 * GET /api/category-page/config
 */
router.get('/config', async (req, res) => {
  try {
    const { category } = req.query;

    let query = `
      SELECT 
        cpc.*,
        COUNT(cpp.id) as product_count
      FROM category_page_categories cpc
      LEFT JOIN category_page_products cpp ON cpp.category_id = cpc.id AND cpp.is_active = true
      WHERE cpc.is_active = true
    `;
    const params = [];

    if (category) {
      query += ' AND cpc.name = $1';
      params.push(category);
    }

    query += ' GROUP BY cpc.id ORDER BY cpc.sort_order ASC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('获取分类页配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取配置失败: ' + error.message
    });
  }
});

/**
 * 获取分类的商品编码列表（管理用）
 * GET /api/category-page/:id/product-codes
 */
router.get('/:id/product-codes', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT id, product_code, sort_order, is_active, created_at
      FROM category_page_products
      WHERE category_id = $1
      ORDER BY sort_order ASC
    `, [id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('获取分类商品编码失败:', error);
    res.status(500).json({
      success: false,
      message: '获取商品编码失败: ' + error.message
    });
  }
});

/**
 * 添加商品到分类
 * POST /api/category-page/:id/products
 */
router.post('/:id/products', async (req, res) => {
  try {
    const { id } = req.params;
    const { product_codes } = req.body;

    if (!Array.isArray(product_codes) || product_codes.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供商品编码数组'
      });
    }

    // 获取当前最大排序值
    const maxOrderResult = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM category_page_products WHERE category_id = $1',
      [id]
    );
    let sortOrder = maxOrderResult.rows[0].max_order + 1;

    // 批量插入
    const inserted = [];
    for (const code of product_codes) {
      try {
        const result = await pool.query(`
          INSERT INTO category_page_products (category_id, product_code, sort_order)
          VALUES ($1, $2, $3)
          ON CONFLICT (category_id, product_code) DO NOTHING
          RETURNING *
        `, [id, code.trim(), sortOrder++]);
        
        if (result.rows.length > 0) {
          inserted.push(result.rows[0]);
        }
      } catch (err) {
        console.error(`插入商品 ${code} 失败:`, err.message);
      }
    }

    res.json({
      success: true,
      message: `成功添加 ${inserted.length} 个商品`,
      data: inserted
    });
  } catch (error) {
    console.error('添加商品失败:', error);
    res.status(500).json({
      success: false,
      message: '添加商品失败: ' + error.message
    });
  }
});

/**
 * 从分类删除商品
 * DELETE /api/category-page/:id/products/:productCode
 */
router.delete('/:id/products/:productCode', async (req, res) => {
  try {
    const { id, productCode } = req.params;

    const result = await pool.query(
      'DELETE FROM category_page_products WHERE category_id = $1 AND product_code = $2 RETURNING *',
      [id, productCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      });
    }

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除商品失败:', error);
    res.status(500).json({
      success: false,
      message: '删除商品失败: ' + error.message
    });
  }
});

// ==================== 分类 CRUD 接口 ====================

/**
 * 获取所有分类（带商品数量）
 * GET /api/category-page/categories
 */
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        cpc.*,
        COUNT(cpp.id) as product_count
      FROM category_page_categories cpc
      LEFT JOIN category_page_products cpp ON cpp.category_id = cpc.id AND cpp.is_active = true
      WHERE cpc.is_active = true
      GROUP BY cpc.id
      ORDER BY cpc.sort_order ASC
    `);

    res.json({
      success: true,
      categories: result.rows.map(row => ({
        ...row,
        product_count: parseInt(row.product_count) || 0
      }))
    });
  } catch (error) {
    console.error('获取分类列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取分类列表失败: ' + error.message
    });
  }
});

/**
 * 创建分类
 * POST /api/category-page/categories
 */
router.post('/categories', async (req, res) => {
  try {
    const { name, type = 'products', sort_order = 0, is_active = true, description, image } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: '分类名称不能为空'
      });
    }

    const result = await pool.query(`
      INSERT INTO category_page_categories (name, type, source, sort_order, is_active, description, image)
      VALUES ($1, $2, 'custom', $3, $4, $5, $6)
      RETURNING *
    `, [name, type, sort_order, is_active, description || null, image || null]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('创建分类失败:', error);
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: '分类名称已存在'
      });
    }
    res.status(500).json({
      success: false,
      message: '创建分类失败: ' + error.message
    });
  }
});

/**
 * 更新分类
 * PUT /api/category-page/categories/:id
 */
router.put('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, sort_order, is_active, description, image } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (type !== undefined) {
      updates.push(`type = $${paramCount++}`);
      values.push(type);
    }
    if (sort_order !== undefined) {
      updates.push(`sort_order = $${paramCount++}`);
      values.push(sort_order);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (image !== undefined) {
      updates.push(`image = $${paramCount++}`);
      values.push(image);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有提供更新字段'
      });
    }

    values.push(id);
    const result = await pool.query(`
      UPDATE category_page_categories 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('更新分类失败:', error);
    res.status(500).json({
      success: false,
      message: '更新分类失败: ' + error.message
    });
  }
});

/**
 * 删除分类
 * DELETE /api/category-page/categories/:id
 */
router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 先删除关联的商品
    await pool.query('DELETE FROM category_page_products WHERE category_id = $1', [id]);

    // 再删除分类
    const result = await pool.query(
      'DELETE FROM category_page_categories WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除分类失败:', error);
    res.status(500).json({
      success: false,
      message: '删除分类失败: ' + error.message
    });
  }
});

/**
 * 获取分类下的商品列表（管理用，带商品详情）
 * GET /api/category-page/categories/:id/products
 */
router.get('/categories/:id/products', async (req, res) => {
  try {
    const { id } = req.params;

    // 获取商品编码
    const codesResult = await pool.query(`
      SELECT id, product_code, sort_order
      FROM category_page_products
      WHERE category_id = $1 AND is_active = true
      ORDER BY sort_order
    `, [id]);

    const productCodes = codesResult.rows;

    // 如果有商品，尝试获取详情
    let products = productCodes.map(row => ({
      id: row.id,
      product_code: row.product_code,
      sort_order: row.sort_order,
      name: row.product_code // 默认用编码作为名称
    }));

    // 尝试从聚水潭获取商品名称（可选，不影响主流程）
    if (productCodes.length > 0) {
      try {
        const codes = productCodes.map(r => r.product_code);
        const jstProducts = await productService.batchGetProductsFromJST(codes);
        const nameMap = {};
        jstProducts.forEach(p => {
          nameMap[p.code] = p.name;
        });
        products = products.map(p => ({
          ...p,
          name: nameMap[p.product_code] || p.product_code
        }));
      } catch (err) {
        console.log('获取商品名称失败，使用编码:', err.message);
      }
    }

    res.json({
      success: true,
      products
    });
  } catch (error) {
    console.error('获取分类商品失败:', error);
    res.status(500).json({
      success: false,
      message: '获取分类商品失败: ' + error.message
    });
  }
});

module.exports = router;
