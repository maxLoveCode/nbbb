const { Pool } = require("pg");
const logger = require("../utils/logger");
const cartValidator = require("../utils/cartValidator");
const jushuitanClient = require("../services/jushuitanClient");
const { convertImageUrls } = require("../utils/imageUrlConverter");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "ecommerce",
  user: "admin",
  password: "AxiaNBBB123"
});

/**
 * 购物车控制器
 * 特殊规则：
 * 1. 物品无法叠加：每个商品/SKU只能有一条记录
 * 2. 数量上限：每件衣服最多3件
 */
class CartController {
  /**
   * 添加商品到购物车
   * POST /api/cart/add
   * 规则：每件单独存一行，最多3行（3件）
   */
  async addToCart(req, res) {
    try {
      const userId = req.user.id;
      const { product_code, sku_id, quantity = 1 } = req.body;
      const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";

      logger.info('CART', '添加商品到购物车', {
        userId,
        product_code,
        sku_id,
        quantity,
        ip
      });

      // 参数验证
      if (!product_code) {
        return res.status(400).json({
          code: 400,
          message: "商品编码不能为空"
        });
      }

      if (quantity < 1 || quantity > 3) {
        return res.status(400).json({
          code: 400,
          message: "数量必须在1-3件之间",
          data: {
            max_quantity: 3,
            requested_quantity: quantity
          }
        });
      }

      // 查询已存在的行（每行代表一件）
      const existingQuery = await pool.query(
        `SELECT id, product_code, sku_id, selected 
         FROM shopping_cart 
         WHERE user_id = $1 AND product_code = $2 AND COALESCE(sku_id, '') = COALESCE($3, '')`,
        [userId, product_code, sku_id || null]
      );

      const existingCount = existingQuery.rows.length;
      const maxAllowed = 3;
      const remaining = Math.max(0, maxAllowed - existingCount);

      if (remaining <= 0) {
        logger.warn('CART', '商品已达购买上限', {
          userId,
          product_code,
          requested_additional: quantity,
          ip
        });

        return res.status(400).json({
          code: 400,
          message: "该商品已达到购买上限（最多3件）",
          data: {
            current_quantity: existingCount,
            max_quantity: maxAllowed
          }
        });
      }

      const insertCount = Math.min(quantity, remaining);
      const insertedItems = [];

      // 按件插入多行，quantity 恒为 1
      for (let i = 0; i < insertCount; i++) {
        const result = await pool.query(
          `INSERT INTO shopping_cart (user_id, product_code, sku_id, quantity)
           VALUES ($1, $2, $3, 1)
           RETURNING id, product_code, sku_id, quantity, selected, created_at, updated_at`,
          [userId, product_code, sku_id || null]
        );
        insertedItems.push(result.rows[0]);
      }

      const totalQuantity = existingCount + insertCount;
      const isMax = totalQuantity >= maxAllowed;

      logger.info('CART', '新增商品到购物车（按件）', {
        userId,
        product_code,
        sku_id,
        requested_quantity: quantity,
        inserted: insertCount,
        total_quantity: totalQuantity,
        is_max: isMax,
        ip
      });

      return res.json({
        code: 0,
        message: isMax && insertCount < quantity ? "已达到购买上限，部分添加成功" : "添加成功",
        data: {
          items: insertedItems,
          total_quantity: totalQuantity,
          is_max: isMax,
          max_quantity: maxAllowed,
          inserted: insertCount
        }
      });
    } catch (error) {
      const userId = req.user?.id || 'unknown';
      const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";
      
      logger.error('CART', '添加商品到购物车失败', {
        userId,
        error: error.message,
        stack: error.stack?.substring(0, 200),
        ip
      });

      return res.status(500).json({
        code: 500,
        message: error.message || "添加失败"
      });
    }
  }

  /**
   * 获取购物车列表
   * GET /api/cart
   * 每件一行，quantity 恒为1，不再二次展开
   */
  async getCart(req, res) {
    try {
      const userId = req.user.id;
      const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";

      logger.info('CART', '获取购物车列表', { userId, ip });

      const cartRows = await pool.query(
        `SELECT id, product_code, sku_id, quantity, selected, created_at, updated_at
         FROM shopping_cart
         WHERE user_id = $1
         ORDER BY updated_at DESC`,
        [userId]
      );

      // 批量检查商品有效性和库存
      logger.info('CART', '开始检查商品有效性', {
        userId,
        item_count: cartRows.rows.length,
        ip
      });

      const validityChecks = await cartValidator.batchCheckValidity(cartRows.rows);

      const invalidItems = validityChecks.filter(check => !check.validity.valid);
      const validItems = validityChecks.filter(check => check.validity.valid);

      if (invalidItems.length > 0) {
        logger.warn('CART', '发现无效商品', {
          userId,
          invalid_count: invalidItems.length,
          invalid_items: invalidItems.map(item => ({
            product_code: item.cartItem.product_code,
            sku_id: item.cartItem.sku_id,
            reason: item.validity.reason
          })),
          ip
        });
      }

      // 直接返回每行（每件）数据，quantity 恒为1
      const items = validityChecks.map(({ cartItem, validity }) => ({
        id: cartItem.id,
        cart_item_id: cartItem.id,
        product_code: cartItem.product_code,
        sku_id: cartItem.sku_id,
        quantity: 1,
        selected: cartItem.selected,
        created_at: cartItem.created_at,
        updated_at: cartItem.updated_at,
        is_max: true, // 行级恒为1件，是否达上限交给汇总判断
        original_quantity: 1,
        index: 1,
        product: validity.product || null,
        valid: validity.valid,
        invalid_reason: validity.valid ? undefined : validity.reason
      }));

      // 统计信息（基于行）
      const summary = {
        total_items: cartRows.rows.length,
        total_quantity: cartRows.rows.length, // 每行一件
        total_expanded_items: cartRows.rows.length,
        selected_items: cartRows.rows.filter(item => item.selected).length,
        selected_quantity: cartRows.rows.filter(item => item.selected).length,
        valid_items: validItems.length,
        invalid_items: invalidItems.length
      };

      logger.info('CART', '购物车列表获取成功', {
        userId,
        original_items: cartRows.rows.length,
        valid_items: validItems.length,
        invalid_items: invalidItems.length,
        expanded_items: items.length,
        ip
      });

      // 转换所有商品图片URL（HTTP -> HTTPS）
      const convertedItems = convertImageUrls(items, { forceHttps: true });

      return res.json({
        code: 0,
        data: {
          items: convertedItems,  // 返回拆分后的列表（已转换图片URL）
          summary
        }
      });
    } catch (error) {
      const userId = req.user?.id || 'unknown';
      const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";
      
      logger.error('CART', '获取购物车列表失败', {
        userId,
        error: error.message,
        ip
      });

      return res.status(500).json({
        code: 500,
        message: "获取购物车失败"
      });
    }
  }

  /**
   * 更新购物车商品数量
   * PUT /api/cart/:id
   */
  async updateCartItem(req, res) {
    try {
      const userId = req.user.id;
      const cartId = parseInt(req.params.id);
      const { quantity } = req.body;
      const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";

      logger.info('CART', '更新购物车商品', {
        userId,
        cart_id: cartId,
        quantity,
        ip
      });

      // 新模型下，每行一件，quantity 恒为 1；此接口仅允许切换 selected，或接受 quantity=1 兼容老调用
      if (quantity && quantity !== 1) {
        return res.status(400).json({
          code: 400,
          message: "每行仅代表1件，quantity 只能为1"
        });
      }

      // 检查购物车项是否存在且属于当前用户
      const checkResult = await pool.query(
        `SELECT id, product_code, sku_id, selected FROM shopping_cart 
         WHERE id = $1 AND user_id = $2`,
        [cartId, userId]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          code: 404,
          message: "购物车项不存在"
        });
      }

      // 如果传了 selected，则更新之；否则保持不变
      let updatedRow = checkResult.rows[0];
      if (typeof req.body.selected === 'boolean') {
        const result = await pool.query(
          `UPDATE shopping_cart 
           SET selected = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2 AND user_id = $3
           RETURNING id, product_code, sku_id, quantity, selected`,
          [req.body.selected, cartId, userId]
        );
        updatedRow = result.rows[0];
      }

      logger.info('CART', '购物车商品更新成功', {
        userId,
        cart_id: cartId,
        selected: updatedRow.selected,
        ip
      });

      return res.json({
        code: 0,
        message: "更新成功",
        data: {
          ...updatedRow,
          is_max: true
        }
      });
    } catch (error) {
      const userId = req.user?.id || 'unknown';
      const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";
      
      logger.error('CART', '更新购物车商品失败', {
        userId,
        cart_id: req.params.id,
        error: error.message,
        ip
      });

      return res.status(500).json({
        code: 500,
        message: "更新失败"
      });
    }
  }

  /**
   * 删除购物车商品
   * DELETE /api/cart/:id
   */
  async deleteCartItem(req, res) {
    try {
      const userId = req.user.id;
      const cartId = parseInt(req.params.id);
      const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";

      logger.info('CART', '删除购物车商品', {
        userId,
        cart_id: cartId,
        ip
      });

      const result = await pool.query(
        `DELETE FROM shopping_cart 
         WHERE id = $1 AND user_id = $2
         RETURNING id`,
        [cartId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          code: 404,
          message: "购物车项不存在"
        });
      }

      logger.info('CART', '购物车商品删除成功', {
        userId,
        cart_id: cartId,
        ip
      });

      return res.json({
        code: 0,
        message: "删除成功"
      });
    } catch (error) {
      const userId = req.user?.id || 'unknown';
      const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";
      
      logger.error('CART', '删除购物车商品失败', {
        userId,
        cart_id: req.params.id,
        error: error.message,
        ip
      });

      return res.status(500).json({
        code: 500,
        message: "删除失败"
      });
    }
  }

  /**
   * 清空购物车
   * DELETE /api/cart
   */
  async clearCart(req, res) {
    try {
      const userId = req.user.id;
      const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";

      logger.info('CART', '清空购物车', { userId, ip });

      const onlySelected = req.query.selected === 'true';

      let result;
      if (onlySelected) {
        result = await pool.query(
          `DELETE FROM shopping_cart WHERE user_id = $1 AND selected = TRUE`,
          [userId]
        );
      } else {
        result = await pool.query(
          `DELETE FROM shopping_cart WHERE user_id = $1`,
          [userId]
        );
      }

      logger.info('CART', '购物车清空成功', {
        userId,
        deleted_count: result.rowCount,
        ip
      });

      return res.json({
        code: 0,
        message: "清空成功",
        data: {
          deleted_count: result.rowCount
        }
      });
    } catch (error) {
      const userId = req.user?.id || 'unknown';
      const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";
      
      logger.error('CART', '清空购物车失败', {
        userId,
        error: error.message,
        ip
      });

      return res.status(500).json({
        code: 500,
        message: "清空失败"
      });
    }
  }
}

module.exports = new CartController();

