const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');
const authMiddleware = require('../middleware/auth');

// 所有地址接口都需要认证
router.use(authMiddleware);

// 获取地址列表
router.get('/', addressController.getAddressList);

// 创建新地址
router.post('/', addressController.createAddress);

// 设置默认地址（必须在 /:id 之前，否则会被 /:id 捕获）
router.put('/:id/default', addressController.setDefaultAddress);

// 获取单个地址详情
router.get('/:id', addressController.getAddressDetail);

// 更新地址
router.put('/:id', addressController.updateAddress);

// 删除地址
router.delete('/:id', addressController.deleteAddress);

module.exports = router;
