const jushuitanClient = require("../services/jushuitanClient");
const productService = require("../services/productService");
const pricingService = require("../services/pricingService");
const logger = require("./logger");
const { convertImageUrl } = require("./imageUrlConverter");

/**
 * 购物车商品验证工具
 * 用于检查商品的有效性和库存
 * 
 * 优化：使用批量查询，减少聚水潭API调用次数
 */
class CartValidator {
  /**
   * 批量查询商品信息（一次API调用查询多个商品）
   * @param {Array<string>} productCodes - 商品编码数组
   * @returns {Promise<Map>} 商品编码 -> 商品信息 的Map
   */
  async batchQueryProducts(productCodes, options = {}) {
    const productMap = new Map();
    const pricingProfile = options.pricingProfile || await pricingService.getPricingProfile(options.userId);
    
    if (!productCodes || productCodes.length === 0) {
      return productMap;
    }

    try {
      // 一次API请求查询所有商品
      const response = await jushuitanClient.call(
        "jushuitan.item.query",
        {
          i_ids: productCodes,
          page_index: 1,
          page_size: productCodes.length + 10 // 多留一些余量
        },
        {},
        "https://openapi.jushuitan.com/open/mall/item/query"
      );

      // 解析响应结构（支持多种响应格式）
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

      const normalizedItems = (items || []).map(item => productService.normalizeJstProduct(item));
      const extrasMap = await productService.getProductExtrasMap(
        normalizedItems.map(product => product.i_id).filter(Boolean)
      );

      // 构建商品Map，并应用本地改价
      if (normalizedItems.length > 0) {
        for (const product of normalizedItems) {
          if (product.i_id) {
            const extras = extrasMap[product.i_id];
            const priced = pricingService.applyPricing(
              productService.getMergedPricing(product, extras),
              pricingProfile
            );
            const merged = {
              ...product,
              s_price: priced.price != null ? priced.price / 100 : product.s_price,
              market_price: priced.original_price != null ? priced.original_price / 100 : product.market_price,
              price_note: priced.price_note
            };
            productMap.set(product.i_id, merged);
          }
        }
      }

      logger.info('CART_VALIDATOR', '批量查询商品完成', {
        requested: productCodes.length,
        found: productMap.size,
        product_codes: productCodes
      });

    } catch (error) {
      logger.error('CART_VALIDATOR', '批量查询商品失败', {
        product_codes: productCodes,
        error: error.message
      });
    }

    return productMap;
  }

  /**
   * 根据商品信息验证购物车项的有效性
   * @param {Object} product - 商品信息（从聚水潭获取）
   * @param {string} productCode - 商品编码
   * @param {string} skuId - SKU编码
   * @returns {Object} 有效性检查结果
   */
  validateCartItem(product, productCode, skuId) {
    // 商品不存在
    if (!product) {
      return {
        valid: false,
        reason: "商品不存在",
        product: null
      };
    }

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
  }

  /**
   * 检查单个商品有效性（从聚水潭查询商品信息）
   * 保留此方法用于兼容性
   * @param {string} productCode - 商品编码
   * @param {string} skuId - SKU编码（可选）
   * @returns {Promise<Object>} 商品有效性信息
   */
  async checkProductValidity(productCode, skuId = null, options = {}) {
    try {
      const productMap = await this.batchQueryProducts([productCode], options);
      const product = productMap.get(productCode);
      return this.validateCartItem(product, productCode, skuId);
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
   * 批量检查商品有效性（优化版：一次API请求）
   * @param {Array} items - 购物车项数组
   * @returns {Promise<Array>} 包含有效性检查结果的数组
   */
  async batchCheckValidity(items, options = {}) {
    if (!items || items.length === 0) {
      return [];
    }

    // 1. 收集所有不同的 product_code（去重）
    const uniqueProductCodes = [...new Set(items.map(item => item.product_code))];
    
    logger.info('CART_VALIDATOR', '开始批量验证', {
      total_items: items.length,
      unique_products: uniqueProductCodes.length,
      product_codes: uniqueProductCodes
    });

    // 2. 一次API请求批量查询所有商品
    const productMap = await this.batchQueryProducts(uniqueProductCodes, options);

    // 3. 本地匹配：为每个购物车项验证有效性
    const checks = items.map(item => {
      const product = productMap.get(item.product_code);
      const validity = this.validateCartItem(product, item.product_code, item.sku_id);
      return {
        cartItem: item,
        validity
      };
    });

    return checks;
  }

  /**
   * 批量查询库存（只查库存，不查商品详情）
   * @param {Array<string>} productCodes - 商品编码数组
   * @returns {Promise<Map>} sku_id -> 库存信息 的Map
   */
  async batchQueryInventory(productCodes) {
    const inventoryMap = new Map();
    
    if (!productCodes || productCodes.length === 0) {
      return inventoryMap;
    }

    try {
      // 用逗号分隔的商品编码查询库存
      const response = await jushuitanClient.call(
        "jushuitan.inventory.query",
        {
          i_ids: productCodes.join(','),
          page_index: 1,
          page_size: 100,
          has_lock_qty: true,
          ts: Math.floor(Date.now() / 1000)
        },
        {},
        "https://openapi.jushuitan.com/open/inventory/query"
      );

      if (response.code === 0 && response.data && Array.isArray(response.data.inventorys)) {
        for (const inv of response.data.inventorys) {
          if (inv.sku_id) {
            inventoryMap.set(inv.sku_id, {
              qty: inv.qty || 0,
              order_lock: inv.order_lock || 0,
              pick_lock: inv.pick_lock || 0,
              available: Math.max(0, (inv.qty || 0) - (inv.order_lock || 0) - (inv.pick_lock || 0))
            });
          }
        }
      }

      logger.info('CART_VALIDATOR', '批量查询库存完成', {
        requested_products: productCodes.length,
        found_skus: inventoryMap.size
      });

    } catch (error) {
      logger.error('CART_VALIDATOR', '批量查询库存失败', {
        product_codes: productCodes,
        error: error.message
      });
    }

    return inventoryMap;
  }

  /**
   * 使用本地快照 + 只查库存验证购物车（优化版）
   * 对于没有快照的商品，自动从聚水潭查询并补充
   * @param {Array} items - 购物车项数组（包含快照字段）
   * @returns {Promise<Array>} 包含有效性检查结果的数组
   */
  async batchCheckWithSnapshot(items, options = {}) {
    if (!items || items.length === 0) {
      return [];
    }
    const pricingProfile = options.pricingProfile || await pricingService.getPricingProfile(options.userId);

    // 1. 收集所有不同的 product_code（去重）
    const uniqueProductCodes = [...new Set(items.map(item => item.product_code))];
    
    // 2. 检查哪些商品缺少快照（product_name 为空）
    const itemsMissingSnapshot = items.filter(item => !item.product_name);
    const productCodesMissingSnapshot = [...new Set(itemsMissingSnapshot.map(item => item.product_code))];
    
    logger.info('CART_VALIDATOR', '开始快照+库存验证', {
      total_items: items.length,
      unique_products: uniqueProductCodes.length,
      missing_snapshot: productCodesMissingSnapshot.length
    });

    // 3. 并行查询：库存 + 缺失快照的商品详情
    const [inventoryMap, productMap] = await Promise.all([
      this.batchQueryInventory(uniqueProductCodes),
      productCodesMissingSnapshot.length > 0 
        ? this.batchQueryProducts(productCodesMissingSnapshot, { pricingProfile })
        : Promise.resolve(new Map())
    ]);

    // 4. 使用本地快照 + 库存数据 + 补充的商品详情构建结果
    const checks = items.map(item => {
      const skuId = item.sku_id || item.product_code;
      const inventory = inventoryMap.get(skuId);
      
      // 检查库存是否充足
      const hasStock = inventory ? inventory.available > 0 : true; // 查不到库存时默认有货
      
      let product;
      
      // 如果有本地快照，使用快照数据
      if (item.product_name) {
        const pricedSnapshot = pricingService.applyYuanPricing({
          price: item.sale_price,
          original_price: item.original_price
        }, pricingProfile);
        product = {
          i_id: item.product_code,
          name: item.product_name,
          pic: item.product_pic,
          s_price: pricedSnapshot.price,
          market_price: pricedSnapshot.original_price,
          price_note: pricedSnapshot.price_note,
          sku: item.sku_id ? {
            sku_id: item.sku_id,
            properties_value: item.properties_value,
            sale_price: pricedSnapshot.price,
            enabled: 1,
            pic: item.sku_pic
          } : null
        };
      } else {
        // 没有快照，从聚水潭查询的数据构建
        const jstProduct = productMap.get(item.product_code);
        if (jstProduct) {
          // 找到对应的 SKU
          const sku = item.sku_id && jstProduct.skus 
            ? jstProduct.skus.find(s => s.sku_id === item.sku_id) 
            : null;
          
          product = {
            i_id: jstProduct.i_id,
            name: jstProduct.name,
            pic: convertImageUrl(jstProduct.pic),
            s_price: jstProduct.s_price,
            sku: sku ? {
              sku_id: sku.sku_id,
              properties_value: sku.properties_value,
              sale_price: sku.sale_price,
              enabled: sku.enabled,
              pic: convertImageUrl(sku.pic)
            } : null
          };
        } else {
          // 聚水潭也查不到，返回空信息
          product = {
            i_id: item.product_code,
            name: null,
            pic: null,
            s_price: null,
            sku: item.sku_id ? {
              sku_id: item.sku_id,
              properties_value: null,
              sale_price: null,
              enabled: 1,
              pic: null
            } : null
          };
        }
      }

      // 添加库存信息
      if (inventory) {
        product.stock = inventory.available;
        product.qty = inventory.qty;
        product.order_lock = inventory.order_lock;
      }

      return {
        cartItem: item,
        validity: {
          valid: hasStock,
          reason: hasStock ? "有效" : "库存不足",
          product,
          stock: inventory?.available || 0
        }
      };
    });

    return checks;
  }
}

module.exports = new CartValidator();

