const express = require('express');
const router = express.Router();
const cartController = require('../../controllers/cartController');
const miniprogramAuth = require('../../middleware/miniprogramAuth');

// 所有购物车接口都需要认证
router.use(miniprogramAuth);

// 获取购物车列表
router.get('/', cartController.getCart.bind(cartController));

// 添加商品到购物车
router.post('/', cartController.addToCart.bind(cartController));

// 更新购物车商品（暂时返回501）
router.put('/:id', (req, res) => {
  res.status(501).json({ code: 501, message: '功能开发中' });
});

// 删除购物车商品（暂时返回501）
router.delete('/:id', (req, res) => {
  res.status(501).json({ code: 501, message: '功能开发中' });
});

// 批量更新购物车（选中状态等）
router.post('/batch', (req, res) => {
  res.status(501).json({ code: 501, message: '功能开发中' });
});

module.exports = router;

