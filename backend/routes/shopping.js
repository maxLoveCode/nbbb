const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
const jushuitanClient = require("../services/jushuitanClient");
const optionalAuth = require("../middleware/optionalAuth");
const productService = require("../services/productService");
const { convertImageUrl } = require("../utils/imageUrlConverter");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "ecommerce",
  user: "admin",
  password: "AxiaNBBB123"
});

router.use(optionalAuth);

/**
 * 选购页接口
 * GET /api/shopping
 * 
 * 功能：
 * - 返回所有二级分类（横向展示）
 * - 根据选中的分类返回该分类下的商品列表
 * 
 * 请求参数：
 * - category_id: 选中的二级分类ID（可选，不传则返回第一个分类的商品）
 * - pageNum: 页码（可选，默认1）
 * - pageSize: 每页数量（可选，默认20）
 * - sort: 排序方式（可选，price_asc=价格升序, price_desc=价格降序，不传=默认顺序）
 * 
 * 优化：使用批量查询，减少聚水潭API调用次数（从 N*2 次降为 2 次）
 */
router.get("/", async (req, res) => {
  try {
    const { category_id, pageNum = 1, pageSize = 20, sort } = req.query;
    const pageIndex = parseInt(pageNum);
    const limit = parseInt(pageSize);

    // 1. 获取所有二级分类（横向展示）
    const categoriesResult = await pool.query(`
      SELECT 
        c2.id,
        c2.name,
        c2.product_codes,
        c2.sort_order,
        c1.id as parent_id,
        c1.name as parent_name
      FROM category_management c2
      LEFT JOIN category_management c1 ON c2.parent_id = c1.id
      WHERE c2.parent_id IS NOT NULL
      ORDER BY c2.sort_order, c2.name
    `);

    // 处理分类数据
    const categories = categoriesResult.rows.map(cat => {
      let productCodes = [];
      if (cat.product_codes) {
        productCodes = cat.product_codes
          .split(';')
          .map(code => code.trim())
          .filter(code => code !== '');
      }
      return {
        id: cat.id,
        name: cat.name,
        parent_id: cat.parent_id,
        parent_name: cat.parent_name,
        product_count: productCodes.length,
        product_codes: productCodes
      };
    });

    // 2. 确定要显示商品的分类ID
    let selectedCategoryId = category_id ? parseInt(category_id) : null;
    
    // 如果没有指定分类，使用第一个分类
    if (!selectedCategoryId && categories.length > 0) {
      selectedCategoryId = categories[0].id;
    }

    // 3. 获取选中分类的商品
    let products = [];
    let total = 0;
    let selectedCategory = null;

    if (selectedCategoryId) {
      // 找到选中的分类
      selectedCategory = categories.find(cat => cat.id === selectedCategoryId);
      
      if (selectedCategory && selectedCategory.product_codes.length > 0) {
        // 获取商品编码列表
        const productCodes = selectedCategory.product_codes;
        total = productCodes.length;

        // 判断是否需要价格排序
        const needsPriceSort = sort === 'price_asc' || sort === 'price_desc';
        
        // 如果需要价格排序，先查询全部商品；否则先分页再查询
        const codesToQuery = needsPriceSort 
          ? productCodes 
          : productCodes.slice((pageIndex - 1) * limit, pageIndex * limit);

        // 批量查询商品详情（统一走 productService，应用本地改价逻辑）
        if (codesToQuery.length > 0) {
          try {
            const pricedProducts = await productService.batchGetProductsFromJST(codesToQuery, "", {
              userId: req.user?.id || null
            });
            const productMap = new Map(pricedProducts.map(item => [item.code, item]));

            // 2. 批量查询库存（一次API调用）
            const inventoryMap = new Map();
            try {
              const inventoryResult = await jushuitanClient.call(
                "jushuitan.inventory.query",
                {
                  i_ids: codesToQuery.join(','),
                  page_index: 1,
                  page_size: Math.max(100, codesToQuery.length),
                  has_lock_qty: true,
                  ts: Math.floor(Date.now() / 1000)
                },
                {},
                "https://openapi.jushuitan.com/open/inventory/query"
              );

              if (inventoryResult && inventoryResult.code === 0 && 
                  inventoryResult.data && Array.isArray(inventoryResult.data.inventorys)) {
                // 按商品编码分组库存
                for (const inv of inventoryResult.data.inventorys) {
                  const productCode = inv.i_id;
                  if (productCode) {
                    const current = inventoryMap.get(productCode) || 0;
                    inventoryMap.set(productCode, current + (parseInt(inv.qty) || 0));
                  }
                }
              }
            } catch (invError) {
              console.error("批量查询库存失败:", invError.message);
            }

            // 3. 组装商品数据
            const allProducts = [];
            for (const productCode of codesToQuery) {
              const item = productMap.get(productCode);
              if (item) {
                allProducts.push({
                  product_code: productCode,
                  name: item.name || productCode,
                  image: item.main_image ? convertImageUrl(item.main_image, { forceHttps: true }) : null,
                  price: item.price ?? 0,
                  original_price: item.original_price ?? item.jst_price ?? null,
                  stock: inventoryMap.get(productCode) || 0,
                  i_id: item.code || null
                });
              }
            }

            // 4. 排序处理（在分页之前）
            if (sort === 'price_asc') {
              allProducts.sort((a, b) => a.price - b.price);
            } else if (sort === 'price_desc') {
              allProducts.sort((a, b) => b.price - a.price);
            }
            // 不传sort或其他值：保持原有顺序（数组遍历顺序）

            // 5. 分页处理（排序之后）
            if (needsPriceSort) {
              const startIndex = (pageIndex - 1) * limit;
              const endIndex = startIndex + limit;
              products = allProducts.slice(startIndex, endIndex);
            } else {
              products = allProducts;
            }

            console.log(`[Shopping] 批量查询完成: ${codesToQuery.length} 个商品, 找到 ${allProducts.length} 个, 排序: ${sort || 'default'}, 返回: ${products.length} 个`);

          } catch (error) {
            console.error("批量查询商品失败:", error.message);
          }
        }
      }
    }

    // 6. 构建响应数据
    res.json({
      success: true,
      code: 0,
      data: {
        // 二级分类列表（横向展示）
        categories: categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          parent_name: cat.parent_name,
          product_count: cat.product_count,
          is_selected: cat.id === selectedCategoryId
        })),
        // 当前选中的分类
        selected_category: selectedCategory ? {
          id: selectedCategory.id,
          name: selectedCategory.name,
          parent_name: selectedCategory.parent_name
        } : null,
        // 商品列表
        products: products,
        // 分页信息
        pagination: {
          pageNum: pageIndex,
          pageSize: limit,
          total: total,
          totalPages: Math.ceil(total / limit),
          hasMore: pageIndex * limit < total
        }
      },
      message: "success"
    });
  } catch (error) {
    console.error("获取选购页数据错误:", error);
    res.status(500).json({
      success: false,
      code: 500,
      message: "服务器错误",
      error: error.message
    });
  }
});

module.exports = router;

