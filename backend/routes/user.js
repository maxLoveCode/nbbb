const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/auth");

// 更新用户资料（需要认证）
router.post("/profile", authMiddleware, userController.updateProfile.bind(userController));

module.exports = router;
