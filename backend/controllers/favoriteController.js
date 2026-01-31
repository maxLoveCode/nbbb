const { Pool } = require("pg");
const logger = require("../utils/logger");
const cartValidator = require("../utils/cartValidator");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "ecommerce",
  user: "admin",
  password: "AxiaNBBB123"
});

/**
 * 收藏/心愿单控制器
 * 支持新增、删除、查询用户收藏的商品编码
 */
class FavoriteController {
  /**
   * 添加收藏
   * POST /api/favorites
   * body: { product_code }
   */
  async add(req, res) {
    const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";
    const userId = req.user?.id;
    const productCode = req.body?.product_code?.trim();

    if (!userId) {
      return res.status(401).json({ code: 401, message: "未认证的用户" });
    }

    if (!productCode) {
      return res.status(400).json({ code: 400, message: "商品编码不能为空" });
    }

    try {
      logger.info("FAVORITE", "尝试添加收藏", { userId, productCode, ip });

      const existing = await pool.query(
        "SELECT id, created_at FROM favorites WHERE user_id = $1 AND product_code = $2",
        [userId, productCode]
      );

      if (existing.rows.length > 0) {
        return res.json({
          code: 0,
          message: "已在收藏列表",
          data: { id: existing.rows[0].id, product_code: productCode, created_at: existing.rows[0].created_at, is_new: false }
        });
      }

      const result = await pool.query(
        "INSERT INTO favorites (user_id, product_code) VALUES ($1, $2) RETURNING id, created_at",
        [userId, productCode]
      );

      logger.info("FAVORITE", "收藏添加成功", { userId, productCode, favoriteId: result.rows[0].id, ip });

      return res.json({
        code: 0,
        message: "收藏成功",
        data: { id: result.rows[0].id, product_code: productCode, created_at: result.rows[0].created_at, is_new: true }
      });
    } catch (error) {
      // 唯一约束冲突（防止并发插入）
      if (error.code === "23505") {
        logger.warn("FAVORITE", "收藏重复插入被忽略", { userId, productCode, ip });
        return res.json({
          code: 0,
          message: "已在收藏列表",
          data: { product_code: productCode, is_new: false }
        });
      }

      logger.error("FAVORITE", "添加收藏失败", { userId, productCode, error: error.message, ip });
      return res.status(500).json({ code: 500, message: "收藏失败，请稍后重试" });
    }
  }

  /**
   * 移除收藏
   * DELETE /api/favorites/:productCode
   */
  async remove(req, res) {
    const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";
    const userId = req.user?.id;
    const productCode = req.params?.productCode?.trim();

    if (!userId) {
      return res.status(401).json({ code: 401, message: "未认证的用户" });
    }

    if (!productCode) {
      return res.status(400).json({ code: 400, message: "商品编码不能为空" });
    }

    try {
      const result = await pool.query(
        "DELETE FROM favorites WHERE user_id = $1 AND product_code = $2 RETURNING id",
        [userId, productCode]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ code: 404, message: "收藏不存在" });
      }

      logger.info("FAVORITE", "取消收藏成功", { userId, productCode, ip });
      return res.json({ code: 0, message: "已取消收藏" });
    } catch (error) {
      logger.error("FAVORITE", "取消收藏失败", { userId, productCode, error: error.message, ip });
      return res.status(500).json({ code: 500, message: "取消收藏失败，请稍后重试" });
    }
  }

  /**
   * 获取用户收藏列表
   * GET /api/favorites
   */
  async list(req, res) {
    const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ code: 401, message: "未认证的用户" });
    }

    try {
      const result = await pool.query(
        "SELECT id, product_code, created_at FROM favorites WHERE user_id = $1 ORDER BY created_at DESC",
        [userId]
      );

      const favorites = result.rows || [];

      // 为每个收藏项补充商品基础信息，避免前端再并发调用商品详情接口
      const enriched = [];
      for (const fav of favorites) {
        try {
          const validity = await cartValidator.checkProductValidity(fav.product_code);

          enriched.push({
            id: fav.id,
            product_code: fav.product_code,
            created_at: fav.created_at,
            valid: validity.valid,
            invalid_reason: validity.valid ? undefined : validity.reason,
            // 商品基础信息（可能为 null，例如商品已下架或查询失败）
            product: validity.product
              ? {
                  code: validity.product.i_id || fav.product_code,
                  name: validity.product.name || "",
                  main_image: validity.product.pic || "",
                  price:
                    typeof validity.product.s_price === "number"
                      ? Math.round(validity.product.s_price * 100)
                      : null,
                  onsale: validity.product.onsale,
                  sku: validity.product.sku || null
                }
              : null
          });
        } catch (checkError) {
          logger.error("FAVORITE", "收藏商品信息补充失败", {
            userId,
            productCode: fav.product_code,
            error: checkError.message,
            ip
          });

          enriched.push({
            id: fav.id,
            product_code: fav.product_code,
            created_at: fav.created_at,
            valid: true,
            invalid_reason: "商品信息查询失败",
            product: null
          });
        }
      }

      logger.info("FAVORITE", "获取收藏列表", {
        userId,
        count: favorites.length,
        with_product: enriched.length,
        ip
      });

      return res.json({ code: 0, message: "ok", data: enriched });
    } catch (error) {
      logger.error("FAVORITE", "获取收藏列表失败", { userId, error: error.message, ip });
      return res.status(500).json({ code: 500, message: "获取收藏列表失败，请稍后重试" });
    }
  }
}

module.exports = new FavoriteController();

