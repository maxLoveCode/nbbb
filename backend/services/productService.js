const { Pool } = require("pg");
const jushuitanClient = require("./jushuitanClient");
const pricingService = require("./pricingService");
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
  normalizeJstProduct(product) {
    if (!product) return null;
    if (product.i_id) return product;
    if (product.skus && product.skus.length > 0) {
      const firstSku = product.skus[0];
      return {
        ...product,
        i_id: firstSku.i_id || product.i_id,
        name: firstSku.name || product.name,
        brand: firstSku.brand || product.brand,
        pic: firstSku.pic || product.pic
      };
    }
    return product;
  }

  async getProductExtrasMap(productCodes = [], { includeDescription = false } = {}) {
    const codes = [...new Set((productCodes || []).filter(Boolean))];
    if (codes.length === 0) return {};

    const fields = ["product_code", "sale_price", "original_price", "price_note"];
    if (includeDescription) fields.push("local_description");

    try {
      const extrasResult = await pool.query(
        `SELECT ${fields.join(", ")}
         FROM product_extras
         WHERE product_code = ANY($1)`,
        [codes]
      );

      return extrasResult.rows.reduce((acc, row) => {
        acc[row.product_code] = row;
        return acc;
      }, {});
    } catch (err) {
      console.log("查询本地扩展信息失败:", err.message);
      return {};
    }
  }

  getMergedPricing(rawProduct, extras = null) {
    const product = this.normalizeJstProduct(rawProduct);
    const jstPrice = typeof product?.s_price === "number"
      ? Math.round(product.s_price * 100)
      : null;

    return {
      price: extras?.sale_price ?? jstPrice,
      original_price: extras?.original_price ?? null,
      price_note: extras?.price_note ?? null,
      jst_price: jstPrice
    };
  }

  /**
   * 根据商品编码获取商品详情
   * @param {string} productCode - 商品编码
   * @returns {Object} 商品详情
   */
  async getProductByCode(productCode, options = {}) {
    try {
      const pricingProfile = options.pricingProfile || await pricingService.getPricingProfile(options.userId);

      // 从聚水潭获取商品信息
      const jstProduct = this.normalizeJstProduct(
        await jushuitanClient.getProductByCode(productCode)
      );
      
      if (!jstProduct) {
        return null;
      }

      // 获取本地扩展信息（描述 + 定价）
      const extrasMap = await this.getProductExtrasMap([productCode], { includeDescription: true });
      const localExtras = extrasMap[productCode] || null;

      // 合并描述
      const localDescription = localExtras?.local_description || null;
      let finalDescription = jstProduct.description || "";
      if (localDescription) {
        finalDescription = finalDescription
          ? `${finalDescription}\n\n${localDescription}`
          : localDescription;
      }

      // 价格：本地 sale_price 优先，否则用聚水潭 s_price
      const pricing = pricingService.applyPricing(
        this.getMergedPricing(jstProduct, localExtras),
        pricingProfile
      );

      // 格式化商品数据
      const formattedProduct = {
        code: jstProduct.i_id || productCode,
        name: jstProduct.name || "",
        description: finalDescription,
        main_image: convertImageUrl(jstProduct.pic),
        images: jstProduct.images ? convertImageUrls(jstProduct.images) : [],
        price: pricing.price,
        original_price: pricing.original_price,  // 划线价（null 则前端不显示）
        price_note: pricing.price_note,          // 价格备注
        jst_price: pricing.jst_price,            // 聚水潭原始价，供后台展示对比
        public_price: pricing.public_price,
        public_original_price: pricing.public_original_price,
        price_source: pricing.price_source,
        pricing_tier: pricing.pricing_tier,
        discount_rate: pricing.discount_rate,
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
        category = "",
        userId = null
      } = options;
      const pricingProfile = options.pricingProfile || await pricingService.getPricingProfile(userId);

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
      const products = await this.batchGetProductsFromJST(pagedCodes, keyword, { pricingProfile });

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
  async batchGetProductsFromJST(productCodes, keyword = "", options = {}) {
    // 聚水潭限制：i_ids 每次最多 20 个，需要分批请求
    const BATCH_SIZE = 20;
    const pricingProfile = options.pricingProfile || await pricingService.getPricingProfile(options.userId);

    const parseItems = (result) => {
      if (result.code !== 0) {
        console.error("聚水潭API调用失败:", result.msg);
        return null;
      }
      return result.data?.datas
        || result.data?.data?.datas
        || result.data?.items
        || result.items
        || result.datas
        || null;
    };

    try {
      const allItems = [];

      for (let i = 0; i < productCodes.length; i += BATCH_SIZE) {
        const batch = productCodes.slice(i, i + BATCH_SIZE);
        const result = await jushuitanClient.call(
          "jushuitan.item.query",
          { i_ids: batch, page_index: 1, page_size: batch.length },
          {},
          "https://openapi.jushuitan.com/open/mall/item/query"
        );
        const items = parseItems(result);
        if (items && items.length > 0) {
          allItems.push(...items.map(item => this.normalizeJstProduct(item)));
        }
      }

      if (allItems.length === 0) {
        console.log("聚水潭返回空数据");
        return [];
      }

      // 批量查 product_extras 本地定价（一次查完，不逐个查）
      const codes = allItems.map(p => p.i_id).filter(Boolean);
      const extrasMap = await this.getProductExtrasMap(codes);

      // 格式化商品列表，本地 sale_price 优先
      let products = allItems.map(product => {
        const extras = extrasMap[product.i_id];
        const pricing = pricingService.applyPricing(
          this.getMergedPricing(product, extras),
          pricingProfile
        );
        return {
          code: product.i_id,
          name: product.name,
          main_image: convertImageUrl(product.pic),
          price: pricing.price,
          original_price: pricing.original_price,
          price_note: pricing.price_note,
          jst_price: pricing.jst_price,
          public_price: pricing.public_price,
          public_original_price: pricing.public_original_price,
          price_source: pricing.price_source,
          pricing_tier: pricing.pricing_tier,
          discount_rate: pricing.discount_rate,
          onsale: product.onsale === 1 || product.is_listing === 'Y',
          brand: product.brand,
          category: product.c_name || product.category_name,
          stock: product.qty || 0
        };
      });

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

  /**
   * 更新商品本地定价
   * @param {string} productCode
   * @param {Object} pricing - { sale_price, original_price, price_note }
   *   sale_price: 分，null 表示恢复使用聚水潭价
   *   original_price: 分，null 表示不显示划线价
   *   price_note: 字符串备注，null 表示清除
   */
  async updatePricing(productCode, { sale_price, original_price, price_note }) {
    try {
      const result = await pool.query(
        `INSERT INTO product_extras (product_code, sale_price, original_price, price_note, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (product_code)
         DO UPDATE SET
           sale_price     = $2,
           original_price = $3,
           price_note     = $4,
           updated_at     = NOW()
         RETURNING *`,
        [productCode, sale_price ?? null, original_price ?? null, price_note ?? null]
      );
      return result.rows[0];
    } catch (error) {
      console.error("更新本地定价失败:", error);
      throw error;
    }
  }
}

module.exports = new ProductService();



