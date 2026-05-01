const express = require('express');
const router = express.Router();
const optionalAuth = require('../../middleware/optionalAuth');
const productService = require('../../services/productService');
const webFormatter = require('../../utils/formatters/webFormatter');

router.use(optionalAuth);

// 获取商品列表
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
      category,
      userId: req.user?.id || null
    });

    res.json(webFormatter.formatResponse({
      products: webFormatter.formatProductList(result.products),
      pagination: result.pagination
    }));
  } catch (error) {
    res.status(500).json(webFormatter.formatError("获取商品列表失败: " + error.message, 500));
  }
});

// 获取商品详情
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const product = await productService.getProductByCode(code, {
      userId: req.user?.id || null
    });

    if (!product) {
      return res.status(404).json(webFormatter.formatError("商品不存在", 404));
    }

    res.json(webFormatter.formatResponse(webFormatter.formatProduct(product)));
  } catch (error) {
    res.status(500).json(webFormatter.formatError("获取商品详情失败: " + error.message, 500));
  }
});

module.exports = router;






