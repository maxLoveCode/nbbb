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
 */
router.get("/", async (req, res) => {
  try {
    const { category_id, pageNum = 1, pageSize = 20 } = req.query;
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

        // 分页处理
        const startIndex = (pageIndex - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedCodes = productCodes.slice(startIndex, endIndex);

        // 批量查询商品详情
        if (paginatedCodes.length > 0) {
          const productsPromises = paginatedCodes.map(async (productCode) => {
            try {
              // 1. 调用聚水潭商品查询接口
              const biz = {
                i_ids: [productCode],
                page_index: 1,
                page_size: 1
              };

              const result = await jushuitanClient.call(
                "jushuitan.item.query",
                biz,
                {},
                "https://openapi.jushuitan.com/open/mall/item/query"
              );

              if (result.code !== 0) {
                return null;
              }

              // 解析响应数据
              let items = null;
              if (result.data && result.data.datas) {
                items = result.data.datas;
              } else if (result.data && result.data.data && result.data.data.datas) {
                items = result.data.data.datas;
              } else if (result.data && result.data.items) {
                items = result.data.items;
              } else if (result.items) {
                items = result.items;
              } else if (result.datas) {
                items = result.datas;
              }

              if (!items || items.length === 0) {
                return null;
              }

              const item = items[0];
              
              // 处理特殊情况：如果item只有skus数组，需要从第一个sku获取商品信息
              if (item.skus && item.skus.length > 0 && !item.i_id) {
                const firstSku = item.skus[0];
                item.i_id = firstSku.i_id;
                item.name = firstSku.name || item.name;
                item.brand = firstSku.brand || item.brand;
                item.pic = firstSku.pic || item.pic;
              }

              // 2. 查询库存
              let stock = 0;
              let inventoryMap = {};
              try {
                const inventoryBiz = {
                  i_ids: productCode,
                  page_index: 1,
                  page_size: 100,
                  has_lock_qty: true,
                  ts: Math.floor(Date.now() / 1000)
                };

                const inventoryResult = await jushuitanClient.call(
                  "jushuitan.inventory.query",
                  inventoryBiz,
                  {},
                  "https://openapi.jushuitan.com/open/inventory/query"
                );

                if (inventoryResult && inventoryResult.code === 0 && inventoryResult.data && 
                    Array.isArray(inventoryResult.data.inventorys)) {
                  // 构建库存映射
                  inventoryResult.data.inventorys.forEach(inv => {
                    const key = inv.sku_id || inv.i_id;
                    if (key) {
                      inventoryMap[key] = {
                        qty: typeof inv.qty === "number" ? inv.qty : 0
                      };
                    }
                  });
                  
                  // 计算总库存（所有SKU的库存总和）
                  stock = inventoryResult.data.inventorys.reduce((sum, inv) => {
                    return sum + (parseInt(inv.qty) || 0);
                  }, 0);
                }
              } catch (invError) {
                console.error(`查询商品 ${productCode} 库存失败:`, invError.message);
              }

              // 3. 获取价格信息（参考商品详情接口的逻辑）
              // 价格：使用 s_price（销售价），转换为分
              const price = item.s_price ? Math.round(item.s_price * 100) : 0;
              // 原价：使用 market_price 或 c_price，转换为分
              const originalPrice = item.market_price 
                ? Math.round(item.market_price * 100) 
                : (item.c_price ? Math.round(item.c_price * 100) : null);

              return {
                product_code: productCode,
                name: item.name || productCode,
                image: item.pic ? convertImageUrl(item.pic, { forceHttps: true }) : null,
                price: price,
                original_price: originalPrice,
                stock: stock,
                i_id: item.i_id || null
              };
            } catch (error) {
              console.error(`查询商品 ${productCode} 失败:`, error.message);
              return null;
            }
          });

          const productsResults = await Promise.all(productsPromises);
          products = productsResults.filter(p => p !== null);
        }
      }
    }

    // 4. 构建响应数据
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

