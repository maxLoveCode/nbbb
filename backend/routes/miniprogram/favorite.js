const express = require('express');
const router = express.Router();
const favoriteController = require('../../controllers/favoriteController');
const miniprogramAuth = require('../../middleware/miniprogramAuth');

// 所有收藏接口都需要认证
router.use(miniprogramAuth);

// 获取收藏列表
router.get('/', favoriteController.list.bind(favoriteController));

// 添加收藏
router.post('/', favoriteController.add.bind(favoriteController));

// 取消收藏
router.delete('/:id', favoriteController.remove.bind(favoriteController));

module.exports = router;






