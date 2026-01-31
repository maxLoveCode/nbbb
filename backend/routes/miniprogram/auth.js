const express = require('express');
const router = express.Router();
const miniprogramAuthController = require('../../controllers/miniprogram/miniprogramAuthController');
const miniprogramAuth = require('../../middleware/miniprogramAuth');

// 小程序登录（无需认证）
router.post('/login', miniprogramAuthController.login.bind(miniprogramAuthController));

// 获取微信手机号（需要认证）
router.post('/phone', miniprogramAuth, miniprogramAuthController.getPhone.bind(miniprogramAuthController));

// 获取当前用户信息（需要认证）
router.get('/me', miniprogramAuth, miniprogramAuthController.getCurrentUser.bind(miniprogramAuthController));

// 登出（需要认证）
router.post('/logout', miniprogramAuth, miniprogramAuthController.logout.bind(miniprogramAuthController));

module.exports = router;






