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

module.exports = router;






