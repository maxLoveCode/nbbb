const jushuitanClient = require("../services/jushuitanClient");
const logger = require("./logger");
const { convertImageUrl } = require("./imageUrlConverter");

/**
 * 购物车商品验证工具
 * 用于检查商品的有效性和库存
 */
class CartValidator {
  /**
   * 检查商品有效性（从聚水潭查询商品信息）
   * @param {string} productCode - 商品编码
   * @param {string} skuId - SKU编码（可选）
   * @returns {Promise<Object>} 商品有效性信息
   */
  async checkProductValidity(productCode, skuId = null) {
    try {
      // 调用聚水潭接口查询商品信息
      const response = await jushuitanClient.call(
        "jushuitan.item.query",
        {
          i_ids: [productCode],
          page_index: 1,
          page_size: 1
        },
        {},
        "https://openapi.jushuitan.com/open/mall/item/query"
      );

      // 检查响应结构（支持多种响应格式）
      let items = null;
      if (response.data && response.data.datas) {
        items = response.data.datas;
      } else if (response.data && response.data.data && response.data.data.datas) {
        items = response.data.data.datas;
      } else if (response.data && response.data.items) {
        items = response.data.items;
      } else if (response.items) {
        items = response.items;
      } else if (response.datas) {
        items = response.datas;
      }

      if (!items || items.length === 0) {
        return {
          valid: false,
          reason: "商品不存在",
          product: null
        };
      }

      const product = items[0];

      // 检查商品是否启用（如果有onsale字段）
      if (product.onsale !== undefined && product.onsale === 0) {
        return {
          valid: false,
          reason: "商品已下架",
          product: {
            i_id: product.i_id,
            name: product.name,
            onsale: product.onsale
          }
        };
      }

      // 如果有SKU，检查SKU是否有效
      if (skuId && product.skus && product.skus.length > 0) {
        const sku = product.skus.find(s => s.sku_id === skuId);
        if (!sku) {
          return {
            valid: false,
            reason: "SKU不存在",
            product: {
              i_id: product.i_id,
              name: product.name
            }
          };
        }

        // 检查SKU是否启用
        if (sku.enabled !== undefined && sku.enabled === 0) {
          return {
            valid: false,
            reason: "SKU已下架",
            product: {
              i_id: product.i_id,
              name: product.name,
              sku_id: sku.sku_id,
              sku_enabled: sku.enabled
            }
          };
        }

        return {
          valid: true,
          reason: "有效",
          product: {
            i_id: product.i_id,
            name: product.name,
            pic: convertImageUrl(product.pic),
            s_price: product.s_price,
            sku: {
              sku_id: sku.sku_id,
              properties_value: sku.properties_value,
              sale_price: sku.sale_price,
              enabled: sku.enabled,
              pic: convertImageUrl(sku.pic)
            }
          }
        };
      }

      // 没有SKU，只检查商品
      return {
        valid: true,
        reason: "有效",
        product: {
          i_id: product.i_id,
          name: product.name,
          pic: convertImageUrl(product.pic),
          s_price: product.s_price
        }
      };
    } catch (error) {
      logger.error('CART_VALIDATOR', '检查商品有效性失败', {
        product_code: productCode,
        sku_id: skuId,
        error: error.message
      });
      
      // 查询失败时，为了不影响用户体验，返回有效（但标记为需要重新检查）
      return {
        valid: true,
        reason: "检查失败，需要重新验证",
        check_failed: true,
        product: null
      };
    }
  }

  /**
   * 批量检查商品有效性
   * @param {Array} items - 购物车项数组
   * @returns {Promise<Array>} 包含有效性检查结果的数组
   */
  async batchCheckValidity(items) {
    const checks = await Promise.all(
      items.map(item => 
        this.checkProductValidity(item.product_code, item.sku_id)
          .then(validity => ({
            cartItem: item,
            validity
          }))
      )
    );
    return checks;
  }
}

module.exports = new CartValidator();

