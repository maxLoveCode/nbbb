const express = require('express');
const router = express.Router();
const userController = require('../../controllers/userController');
const miniprogramAuth = require('../../middleware/miniprogramAuth');

// 所有用户接口都需要认证
router.use(miniprogramAuth);

// 获取用户资料（暂时返回501）
router.get('/profile', (req, res) => {
  res.status(501).json({ code: 501, message: '功能开发中' });
});

// 更新用户资料
router.put('/profile', userController.updateProfile.bind(userController));

module.exports = router;

