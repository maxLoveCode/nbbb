const { Pool } = require("pg");
const jushuitanClient = require("./jushuitanClient");
const { convertImageUrls, convertImageUrl } = require("../utils/imageUrlConverter");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "ecommerce",
  user: "admin",
  password: "AxiaNBBB123"
});

/**
 * 商品服务
 * 提供商品相关的业务逻辑，供不同端的控制器复用
 */
class ProductService {
  /**
   * 根据商品编码获取商品详情
   * @param {string} productCode - 商品编码
   * @returns {Object} 商品详情
   */
  async getProductByCode(productCode) {
    try {
      // 从聚水潭获取商品信息
      const jstProduct = await jushuitanClient.getProductByCode(productCode);
      
      if (!jstProduct) {
        return null;
      }

      // 获取本地扩展描述（如果存在）
      let localDescription = null;
      try {
        const extrasResult = await pool.query(
          "SELECT local_description FROM product_extras WHERE product_code = $1",
          [productCode]
        );
        if (extrasResult.rows.length > 0 && extrasResult.rows[0].local_description) {
          localDescription = extrasResult.rows[0].local_description;
        }
      } catch (err) {
        console.log("查询本地描述失败:", err.message);
      }

      // 合并描述
      let finalDescription = jstProduct.description || "";
      if (localDescription) {
        finalDescription = finalDescription 
          ? `${finalDescription}\n\n${localDescription}` 
          : localDescription;
      }

      // 格式化商品数据
      const formattedProduct = {
        code: jstProduct.i_id || productCode,
        name: jstProduct.name || "",
        description: finalDescription,
        main_image: convertImageUrl(jstProduct.pic),
        images: jstProduct.images ? convertImageUrls(jstProduct.images) : [],
        price: typeof jstProduct.s_price === "number" 
          ? Math.round(jstProduct.s_price * 100) 
          : null,
        cost_price: typeof jstProduct.cost_price === "number"
          ? Math.round(jstProduct.cost_price * 100)
          : null,
        onsale: jstProduct.onsale,
        brand: jstProduct.brand,
        category: jstProduct.c_name,
        stock: jstProduct.qty || 0,
        sku: jstProduct.sku || [],
        properties: jstProduct.properties || {},
        created: jstProduct.created,
        modified: jstProduct.modified
      };

      return formattedProduct;
    } catch (error) {
      console.error("获取商品详情失败:", error);
      throw error;
    }
  }

  /**
   * 获取商品列表（基于 listed_products 上架清单）
   * @param {Object} options - 查询选项
   * @returns {Object} 商品列表和分页信息
   */
  async getProductList(options = {}) {
    try {
      const {
        page = 1,
        pageSize = 20,
        keyword = "",
        category = ""
      } = options;

      // 1. 从 listed_products 表获取上架商品编码列表
      let query = `
        SELECT product_code, category, display_order, price_hint
        FROM listed_products
        WHERE is_active = true
      `;
      const params = [];

      // 支持按分类筛选
      if (category) {
        query += ` AND category = $${params.length + 1}`;
        params.push(category);
      }

      // 排序
      query += ` ORDER BY display_order ASC, id ASC`;

      const listedResult = await pool.query(query, params);
      const listedProducts = listedResult.rows;

      if (listedProducts.length === 0) {
        return {
          products: [],
          pagination: {
            page,
            pageSize,
            total: 0,
            totalPages: 0
          }
        };
      }

      // 2. 获取商品编码列表
      let productCodes = listedProducts.map(p => p.product_code);
      const total = productCodes.length;

      // 3. 分页处理
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const pagedCodes = productCodes.slice(startIndex, endIndex);

      if (pagedCodes.length === 0) {
        return {
          products: [],
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize)
          }
        };
      }

      // 4. 批量从聚水潭获取商品详情
      const products = await this.batchGetProductsFromJST(pagedCodes, keyword);

      // 5. 合并 listed_products 的信息（分类、排序）
      const listedMap = {};
      listedProducts.forEach(p => {
        listedMap[p.product_code] = {
          category: p.category,
          display_order: p.display_order,
          price_hint: p.price_hint
        };
      });

      const enrichedProducts = products.map(product => ({
        ...product,
        category: listedMap[product.code]?.category || product.category,
        display_order: listedMap[product.code]?.display_order || 999
      }));

      // 6. 按 display_order 排序（保持 listed_products 的顺序）
      enrichedProducts.sort((a, b) => a.display_order - b.display_order);

      return {
        products: enrichedProducts,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      };
    } catch (error) {
      console.error("获取商品列表失败:", error.message);
      throw error;
    }
  }

  /**
   * 批量从聚水潭获取商品详情
   * @param {Array<string>} productCodes - 商品编码列表
   * @param {string} keyword - 关键词筛选（可选）
   * @returns {Array} 商品列表
   */
  async batchGetProductsFromJST(productCodes, keyword = "") {
    try {
      // 调用聚水潭接口批量查询
      const biz = {
        i_ids: productCodes,
        page_index: 1,
        page_size: productCodes.length
      };

      const result = await jushuitanClient.call(
        "jushuitan.item.query",
        biz,
        {},
        "https://openapi.jushuitan.com/open/mall/item/query"
      );

      // 检查响应
      if (result.code !== 0) {
        console.error("聚水潭API调用失败:", result.msg);
        return [];
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
        console.log("聚水潭返回空数据");
        return [];
      }

      // 格式化商品列表
      let products = items.map(product => ({
        code: product.i_id,
        name: product.name,
        main_image: convertImageUrl(product.pic),
        price: typeof product.s_price === "number" 
          ? Math.round(product.s_price * 100) 
          : null,
        onsale: product.onsale === 1 || product.is_listing === 'Y',
        brand: product.brand,
        category: product.c_name || product.category_name,
        stock: product.qty || 0
      }));

      // 如果有关键词，进行本地过滤
      if (keyword) {
        const lowerKeyword = keyword.toLowerCase();
        products = products.filter(p => 
          (p.name && p.name.toLowerCase().includes(lowerKeyword)) ||
          (p.code && p.code.toLowerCase().includes(lowerKeyword))
        );
      }

      return products;
    } catch (error) {
      console.error("批量获取聚水潭商品失败:", error.message);
      return [];
    }
  }

  /**
   * 检查商品和SKU的库存
   * @param {string} productCode - 商品编码
   * @param {string} skuId - SKU ID（可选）
   * @returns {Object} 库存信息
   */
  async checkStock(productCode, skuId = null) {
    try {
      const product = await this.getProductByCode(productCode);
      
      if (!product) {
        return {
          available: false,
          reason: "商品不存在"
        };
      }

      if (!product.onsale) {
        return {
          available: false,
          reason: "商品已下架"
        };
      }

      // 如果指定了SKU，检查SKU库存
      if (skuId && product.sku && product.sku.length > 0) {
        const sku = product.sku.find(s => s.sku_id === skuId);
        if (!sku) {
          return {
            available: false,
            reason: "SKU不存在"
          };
        }

        if (sku.qty <= 0) {
          return {
            available: false,
            reason: "SKU库存不足"
          };
        }

        return {
          available: true,
          stock: sku.qty,
          price: sku.price ? Math.round(sku.price * 100) : product.price
        };
      }

      // 检查总库存
      if (product.stock <= 0) {
        return {
          available: false,
          reason: "库存不足"
        };
      }

      return {
        available: true,
        stock: product.stock,
        price: product.price
      };
    } catch (error) {
      console.error("检查库存失败:", error);
      return {
        available: false,
        reason: "检查库存失败"
      };
    }
  }

  /**
   * 更新商品本地描述
   * @param {string} productCode - 商品编码
   * @param {string} description - 本地描述
   */
  async updateLocalDescription(productCode, description) {
    try {
      const result = await pool.query(
        `INSERT INTO product_extras (product_code, local_description, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (product_code)
         DO UPDATE SET local_description = $2, updated_at = NOW()
         RETURNING *`,
        [productCode, description]
      );

      return result.rows[0];
    } catch (error) {
      console.error("更新本地描述失败:", error);
      throw error;
    }
  }
}

module.exports = new ProductService();



