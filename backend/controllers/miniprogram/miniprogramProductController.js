const productService = require("../../services/productService");
const formatter = require("../../utils/formatters/miniprogramFormatter");
const logger = require("../../utils/logger");

/**
 * 小程序商品控制器
 */
class MiniprogramProductController {
  /**
   * 获取商品列表
   * GET /api/miniprogram/products
   */
  async getProductList(req, res) {
    try {
      const {
        page = 1,
        pageSize = 20,
        keyword = "",
        category = ""
      } = req.query;

      logger.info('PRODUCT', '获取商品列表', {
        page,
        pageSize,
        keyword,
        category,
        clientType: 'miniprogram'
      });

      const result = await productService.getProductList({
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        keyword,
        category,
        userId: req.user?.id || null
      });

      res.json(formatter.formatResponse({
        products: formatter.formatProductList(result.products),
        pagination: result.pagination
      }));
    } catch (error) {
      logger.error('PRODUCT', '获取商品列表失败', {
        error: error.message,
        clientType: 'miniprogram'
      });

      res.status(500).json(
        formatter.formatError("获取商品列表失败: " + error.message, 500)
      );
    }
  }

  /**
   * 获取商品详情
   * GET /api/miniprogram/product/:code
   */
  async getProductDetail(req, res) {
    try {
      const { code } = req.params;

      logger.info('PRODUCT', '获取商品详情', {
        productCode: code,
        clientType: 'miniprogram'
      });

      const product = await productService.getProductByCode(code, {
        userId: req.user?.id || null
      });

      if (!product) {
        return res.status(404).json(
          formatter.formatError("商品不存在", 404)
        );
      }

      res.json(formatter.formatResponse(
        formatter.formatProduct(product)
      ));
    } catch (error) {
      logger.error('PRODUCT', '获取商品详情失败', {
        productCode: req.params.code,
        error: error.message,
        clientType: 'miniprogram'
      });

      res.status(500).json(
        formatter.formatError("获取商品详情失败: " + error.message, 500)
      );
    }
  }

  /**
   * 检查商品库存
   * GET /api/miniprogram/product/:code/stock
   */
  async checkStock(req, res) {
    try {
      const { code } = req.params;
      const { skuId } = req.query;

      const stockInfo = await productService.checkStock(code, skuId);

      res.json(formatter.formatResponse(stockInfo));
    } catch (error) {
      logger.error('PRODUCT', '检查库存失败', {
        productCode: req.params.code,
        error: error.message,
        clientType: 'miniprogram'
      });

      res.status(500).json(
        formatter.formatError("检查库存失败: " + error.message, 500)
      );
    }
  }
}

module.exports = new MiniprogramProductController();






