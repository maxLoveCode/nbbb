const { Pool } = require("pg");
const jushuitanClient = require("./jushuitanClient");
const { convertImageUrl } = require("../utils/imageUrlConverter");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "ecommerce",
  user: "admin",
  password: "AxiaNBBB123"
});

class ProductSyncService {
  /**
   * 拼接商品描述
   * 格式：聚水潭描述 + 本地描述（如果都存在，用换行符分隔）
   */
  combineDescription(jushuitanDesc, localDesc) {
    const jstDesc = (jushuitanDesc || "").trim();
    const local = (localDesc || "").trim();
    
    if (jstDesc && local) {
      return `${jstDesc}\n\n${local}`;
    } else if (jstDesc) {
      return jstDesc;
    } else if (local) {
      return local;
    }
    return "";
  }

  /**
   * 从聚水潭同步单个商品到数据库
   * @param {string} productCode - 聚水潭商品编码（i_id）
   * @returns {Promise<Object>} 同步后的商品数据
   */
  async syncProduct(productCode) {
    try {
      // 1. 从聚水潭获取商品数据
      const biz = {
        i_ids: [productCode.trim()],
        page_index: 1,
        page_size: 1
      };

      const result = await jushuitanClient.call(
        "jushuitan.item.query",
        biz,
        {},
        "https://openapi.jushuitan.com/open/mall/item/query"
      );

      if (result.code !== 0 || !result.data || !result.data.datas || result.data.datas.length === 0) {
        throw new Error(`商品 ${productCode} 在聚水潭中不存在或查询失败: ${result.msg || "未知错误"}`);
      }

      const item = result.data.datas[0];
      const convertedItem = { ...item };

      // 转换图片URL
      if (convertedItem.pic) {
        convertedItem.pic = convertImageUrl(convertedItem.pic, { forceHttps: true });
      }

      // 2. 查询数据库中是否已存在该商品
      const existingProduct = await pool.query(
        `SELECT id, product_code, description, local_description, jushuitan_description 
         FROM products 
         WHERE product_code = $1`,
        [productCode]
      );

      const jushuitanDesc = convertedItem.description || "";
      let localDesc = "";
      let combinedDesc = jushuitanDesc;

      if (existingProduct.rows.length > 0) {
        // 如果商品已存在，保留本地描述
        localDesc = existingProduct.rows[0].local_description || "";
        combinedDesc = this.combineDescription(jushuitanDesc, localDesc);
      }

      // 3. 插入或更新商品数据
      const now = new Date();
      let product;

      if (existingProduct.rows.length > 0) {
        // 更新现有商品
        const updateResult = await pool.query(
          `UPDATE products 
           SET name = $1,
               description = $2,
               jushuitan_description = $3,
               price = $4,
               synced_at = $5,
               updated_at = $6
           WHERE product_code = $7
           RETURNING *`,
          [
            convertedItem.name || "",
            combinedDesc,
            jushuitanDesc,
            convertedItem.s_price ? Math.round(convertedItem.s_price * 100) : null,
            now,
            now,
            productCode
          ]
        );
        product = updateResult.rows[0];
      } else {
        // 插入新商品
        const insertResult = await pool.query(
          `INSERT INTO products (
            product_code, name, description, jushuitan_description, local_description,
            price, category_id, sku, stock_quantity, is_active, synced_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *`,
          [
            productCode,
            convertedItem.name || "",
            combinedDesc,
            jushuitanDesc,
            localDesc,
            convertedItem.s_price ? Math.round(convertedItem.s_price * 100) : null,
            convertedItem.c_id || null,
            productCode, // 使用product_code作为sku
            0, // 默认库存为0，实际库存从SKU获取
            true, // 默认激活
            now,
            now,
            now
          ]
        );
        product = insertResult.rows[0];
      }

      return {
        success: true,
        product,
        message: existingProduct.rows.length > 0 ? "商品已更新" : "商品已创建"
      };
    } catch (error) {
      console.error(`同步商品 ${productCode} 失败:`, error);
      throw error;
    }
  }

  /**
   * 批量同步商品
   * @param {string[]} productCodes - 聚水潭商品编码数组
   * @returns {Promise<Object>} 同步结果
   */
  async syncProducts(productCodes) {
    const results = {
      success: [],
      failed: []
    };

    for (const code of productCodes) {
      try {
        const result = await this.syncProduct(code);
        results.success.push({
          product_code: code,
          ...result
        });
      } catch (error) {
        results.failed.push({
          product_code: code,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * 更新商品的本地描述字段
   * @param {string} productCode - 商品编码
   * @param {string} localDescription - 本地描述
   * @returns {Promise<Object>} 更新后的商品
   */
  async updateLocalDescription(productCode, localDescription) {
    try {
      // 获取当前商品信息
      const productResult = await pool.query(
        `SELECT id, jushuitan_description, local_description 
         FROM products 
         WHERE product_code = $1`,
        [productCode]
      );

      if (productResult.rows.length === 0) {
        throw new Error(`商品 ${productCode} 不存在`);
      }

      const product = productResult.rows[0];
      const jushuitanDesc = product.jushuitan_description || "";
      const combinedDesc = this.combineDescription(jushuitanDesc, localDescription);

      // 更新商品
      const updateResult = await pool.query(
        `UPDATE products 
         SET local_description = $1,
             description = $2,
             updated_at = $3
         WHERE product_code = $4
         RETURNING *`,
        [localDescription, combinedDesc, new Date(), productCode]
      );

      return {
        success: true,
        product: updateResult.rows[0]
      };
    } catch (error) {
      console.error(`更新商品 ${productCode} 本地描述失败:`, error);
      throw error;
    }
  }
}

module.exports = new ProductSyncService();












