const express = require('express');
const router = express.Router();
const miniprogramProductController = require('../../controllers/miniprogram/miniprogramProductController');

// 获取商品列表（无需认证）
router.get('/', miniprogramProductController.getProductList.bind(miniprogramProductController));

// 获取商品详情（无需认证）
router.get('/:code', miniprogramProductController.getProductDetail.bind(miniprogramProductController));

// 检查商品库存（无需认证）
router.get('/:code/stock', miniprogramProductController.checkStock.bind(miniprogramProductController));

module.exports = router;






