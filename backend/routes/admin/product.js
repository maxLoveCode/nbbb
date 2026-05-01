const express = require('express');
const router = express.Router();
const productService = require('../../services/productService');
const adminFormatter = require('../../utils/formatters/adminFormatter');
const adminAuth = require('../../middleware/adminAuth');
const { checkPermission } = require('../../middleware/permission');

// 所有商品管理接口都需要管理员认证
// router.use(adminAuth);

// 获取商品列表（暂时不需要认证，方便测试）
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      keyword = "",
      category = ""
    } = req.query;

    const result = await productService.getProductList({
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      keyword,
      category
    });

    res.json(adminFormatter.formatListResponse(
      adminFormatter.formatProductList(result.products),
      result.pagination
    ));
  } catch (error) {
    res.status(500).json(adminFormatter.formatError("获取商品列表失败: " + error.message, 500));
  }
});

// 获取商品详情
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const product = await productService.getProductByCode(code);

    if (!product) {
      return res.status(404).json(adminFormatter.formatError("商品不存在", 404));
    }

    res.json(adminFormatter.formatResponse(adminFormatter.formatProduct(product)));
  } catch (error) {
    res.status(500).json(adminFormatter.formatError("获取商品详情失败: " + error.message, 500));
  }
});

// 更新商品本地描述
router.put('/:code/description', async (req, res) => {
  try {
    const { code } = req.params;
    const { description } = req.body;

    await productService.updateLocalDescription(code, description);

    res.json(adminFormatter.formatResponse(null, '更新成功'));
  } catch (error) {
    res.status(500).json(adminFormatter.formatError("更新失败: " + error.message, 500));
  }
});

// 更新商品本地定价
// sale_price / original_price 传分（整数），传 null 表示清除（恢复聚水潭价）
router.put('/:code/pricing', async (req, res) => {
  try {
    const { code } = req.params;
    const { sale_price, original_price, price_note } = req.body;

    // 基本校验
    if (sale_price !== null && sale_price !== undefined) {
      const v = Number(sale_price);
      if (!Number.isInteger(v) || v < 0) {
        return res.status(400).json(adminFormatter.formatError("sale_price 必须为非负整数（分）"));
      }
    }
    if (original_price !== null && original_price !== undefined) {
      const v = Number(original_price);
      if (!Number.isInteger(v) || v < 0) {
        return res.status(400).json(adminFormatter.formatError("original_price 必须为非负整数（分）"));
      }
    }

    const result = await productService.updatePricing(code, {
      sale_price: sale_price != null ? Number(sale_price) : null,
      original_price: original_price != null ? Number(original_price) : null,
      price_note: price_note || null
    });

    res.json(adminFormatter.formatResponse({
      product_code: result.product_code,
      sale_price: result.sale_price,
      original_price: result.original_price,
      price_note: result.price_note,
      updated_at: result.updated_at
    }, '定价已更新'));
  } catch (error) {
    res.status(500).json(adminFormatter.formatError("更新定价失败: " + error.message, 500));
  }
});

module.exports = router;






