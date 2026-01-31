const express = require('express');
const router = express.Router();
const addressController = require('../../controllers/addressController');
const miniprogramAuth = require('../../middleware/miniprogramAuth');

// 所有地址接口都需要认证
router.use(miniprogramAuth);

// 获取地址列表
router.get('/', addressController.getAddressList.bind(addressController));

// 获取地址详情
router.get('/:id', addressController.getAddressDetail.bind(addressController));

// 创建地址
router.post('/', addressController.createAddress.bind(addressController));

// 更新地址
router.put('/:id', addressController.updateAddress.bind(addressController));

// 删除地址
router.delete('/:id', addressController.deleteAddress.bind(addressController));

// 设置默认地址
router.put('/:id/default', addressController.setDefaultAddress.bind(addressController));

module.exports = router;






