const express = require('express');
const router = express.Router();
const optionalAuth = require('../../middleware/optionalAuth');
const productService = require('../../services/productService');

// 公共商品接口（无需认证）
router.use(optionalAuth);

// 商品搜索
router.get('/search', async (req, res) => {
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

    res.json({
      code: 0,
      message: 'success',
      data: {
        products: result.products,
        pagination: result.pagination
      }
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: "搜索失败: " + error.message
    });
  }
});

// 获取商品详情（公开基础信息）
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const product = await productService.getProductByCode(code, {
      userId: req.user?.id || null
    });

    if (!product) {
      return res.status(404).json({
        code: 404,
        message: "商品不存在"
      });
    }

    // 只返回基础信息
    const publicProduct = {
      code: product.code,
      name: product.name,
      mainImage: product.main_image,
      price: product.price,
      onsale: product.onsale,
      brand: product.brand,
      category: product.category
    };

    res.json({
      code: 0,
      message: 'success',
      data: publicProduct
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: "获取商品详情失败: " + error.message
    });
  }
});

module.exports = router;






