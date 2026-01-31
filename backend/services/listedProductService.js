/**
 * 上架商品服务
 * 
 * 功能：
 * 1. 获取上架商品清单
 * 2. 从聚水潭获取商品详细信息
 * 3. 合并数据返回给前端
 */

const pool = require('../config/database');
const jushuitanClient = require('./jushuitanClient');
const { convertImageUrl } = require('../utils/imageUrlConverter');

class ListedProductService {
  /**
   * 获取上架商品列表
   * @param {Object} options - 查询选项
   * @returns {Object} 商品列表和分页信息
   */
  async getListedProducts(options = {}) {
    try {
      const {
        page = 1,
        pageSize = 20,
        category = null,
        isActive = true
      } = options;

      const offset = (page - 1) * pageSize;

      // 1. 从数据库获取上架商品编码列表
      let query = `
        SELECT product_code, category, display_order, notes
        FROM listed_products
        WHERE is_active = $1
      `;
      const params = [isActive];

      if (category) {
        query += ` AND category = $${params.length + 1}`;
        params.push(category);
      }

      query += ` ORDER BY display_order ASC, created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(pageSize, offset);

      const result = await pool.query(query, params);
      const productCodes = result.rows.map(row => row.product_code);

      if (productCodes.length === 0) {
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

      // 2. 从聚水潭批量获取商品详细信息
      const products = await this.fetchProductsFromJushuitan(productCodes);

      // 3. 获取总数
      let countQuery = `SELECT COUNT(*) FROM listed_products WHERE is_active = $1`;
      const countParams = [isActive];
      if (category) {
        countQuery += ` AND category = $2`;
        countParams.push(category);
      }
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);

      return {
        products,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      };
    } catch (error) {
      console.error('获取上架商品列表失败:', error);
      throw error;
    }
  }

  /**
   * 从聚水潭批量获取商品信息
   * @param {Array} productCodes - 商品编码数组
   * @returns {Array} 商品详情数组
   */
  async fetchProductsFromJushuitan(productCodes) {
    try {
      // 调用聚水潭商品查询接口
      const result = await jushuitanClient.call(
        'jushuitan.item.query',
        {
          i_ids: productCodes,
          page_index: 1,
          page_size: 100 // 最多100个
        },
        {},
        'https://openapi.jushuitan.com/open/mall/item/query'
      );

      if (result.code !== 0) {
        console.error('聚水潭API调用失败:', result.msg);
        return [];
      }

      // 解析响应数据
      let items = null;
      if (result.data && result.data.datas) {
        items = result.data.datas;
      } else if (result.data && result.data.items) {
        items = result.data.items;
      } else if (result.items) {
        items = result.items;
      } else if (result.datas) {
        items = result.datas;
      }

      if (!items || items.length === 0) {
        return [];
      }

      // 格式化商品数据
      return items.map(item => this.formatProduct(item));
    } catch (error) {
      console.error('从聚水潭获取商品信息失败:', error);
      return [];
    }
  }

  /**
   * 格式化商品数据
   */
  formatProduct(item) {
    return {
      code: item.i_id,
      name: item.name,
      brand: item.brand || 'Not-boring Boreboi',
      main_image: convertImageUrl(item.pic),
      images: item.pics ? item.pics.map(url => convertImageUrl(url)) : [],
      price: typeof item.s_price === 'number' ? Math.round(item.s_price * 100) : null,
      original_price: typeof item.market_price === 'number' ? Math.round(item.market_price * 100) : null,
      is_listing: item.is_listing === 'Y',
      onsale: item.onsale === 1,
      category: item.c_name || item.category_name,
      skus: (item.skus || []).map(sku => ({
        sku_id: sku.sku_id,
        color: this.extractColor(sku.properties_value),
        size: this.extractSize(sku.properties_value),
        price: typeof sku.sale_price === 'number' ? Math.round(sku.sale_price * 100) : null,
        stock: sku.stock || 0,
        image: convertImageUrl(sku.pic),
        enabled: sku.enabled === true
      })),
      description: item.remark || '',
      created_at: item.created,
      modified_at: item.modified
    };
  }

  /**
   * 从属性值中提取颜色
   */
  extractColor(propertiesValue) {
    if (!propertiesValue) return null;
    const parts = propertiesValue.split(';');
    for (const part of parts) {
      if (part.includes('色')) {
        return part.trim();
      }
    }
    return parts[0] || null;
  }

  /**
   * 从属性值中提取尺码
   */
  extractSize(propertiesValue) {
    if (!propertiesValue) return null;
    const parts = propertiesValue.split(';');
    for (const part of parts) {
      const trimmed = part.trim();
      if (['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].includes(trimmed)) {
        return trimmed;
      }
    }
    return parts[parts.length - 1] || null;
  }

  /**
   * 获取所有分类
   */
  async getCategories() {
    try {
      const result = await pool.query(`
        SELECT DISTINCT category
        FROM listed_products
        WHERE is_active = true AND category IS NOT NULL
        ORDER BY category
      `);
      
      return result.rows.map(row => row.category);
    } catch (error) {
      console.error('获取分类列表失败:', error);
      throw error;
    }
  }

  /**
   * 更新商品上架状态
   */
  async updateProductStatus(productCode, isActive) {
    try {
      const result = await pool.query(
        `UPDATE listed_products 
         SET is_active = $1, updated_at = CURRENT_TIMESTAMP
         WHERE product_code = $2
         RETURNING *`,
        [isActive, productCode]
      );

      return result.rows[0];
    } catch (error) {
      console.error('更新商品状态失败:', error);
      throw error;
    }
  }
}

module.exports = new ListedProductService();




