const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
const jushuitanClient = require("../services/jushuitanClient");
const { convertImageUrl } = require("../utils/imageUrlConverter");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "ecommerce",
  user: "admin",
  password: "AxiaNBBB123"
});

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

        // 批量查询商品详情（优化：一次API调用查询所有商品）
        if (codesToQuery.length > 0) {
          try {
            // 1. 批量查询商品信息（一次API调用）
            const productResult = await jushuitanClient.call(
              "jushuitan.item.query",
              {
                i_ids: codesToQuery,
                page_index: 1,
                page_size: codesToQuery.length + 10
              },
              {},
              "https://openapi.jushuitan.com/open/mall/item/query"
            );

            // 解析商品响应
            let items = null;
            if (productResult.code === 0) {
              if (productResult.data && productResult.data.datas) {
                items = productResult.data.datas;
              } else if (productResult.data && productResult.data.data && productResult.data.data.datas) {
                items = productResult.data.data.datas;
              } else if (productResult.data && productResult.data.items) {
                items = productResult.data.items;
              } else if (productResult.items) {
                items = productResult.items;
              } else if (productResult.datas) {
                items = productResult.datas;
              }
            }

            // 构建商品Map（商品编码 -> 商品信息）
            const productMap = new Map();
            if (items && items.length > 0) {
              for (const item of items) {
                // 处理特殊情况：如果item只有skus数组
                if (item.skus && item.skus.length > 0 && !item.i_id) {
                  const firstSku = item.skus[0];
                  item.i_id = firstSku.i_id;
                  item.name = firstSku.name || item.name;
                  item.brand = firstSku.brand || item.brand;
                  item.pic = firstSku.pic || item.pic;
                }
                if (item.i_id) {
                  productMap.set(item.i_id, item);
                }
              }
            }

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
                const price = item.s_price ? Math.round(item.s_price * 100) : 0;
                const originalPrice = item.market_price 
                  ? Math.round(item.market_price * 100) 
                  : (item.c_price ? Math.round(item.c_price * 100) : null);

                allProducts.push({
                  product_code: productCode,
                  name: item.name || productCode,
                  image: item.pic ? convertImageUrl(item.pic, { forceHttps: true }) : null,
                  price: price,
                  original_price: originalPrice,
                  stock: inventoryMap.get(productCode) || 0,
                  i_id: item.i_id || null
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

