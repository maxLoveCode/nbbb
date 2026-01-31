const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/auth");

// 微信登录（无需认证）
router.post("/wechat/login", authController.wechatLogin.bind(authController));

// 获取微信手机号（需要认证）
router.post("/wechat/phone", authMiddleware, authController.getWechatPhone.bind(authController));

// 获取当前用户信息（需要认证）
router.get("/me", authMiddleware, authController.getCurrentUser.bind(authController));

// 登出（可选，需要认证）
router.post("/logout", authMiddleware, authController.logout.bind(authController));

module.exports = router;
