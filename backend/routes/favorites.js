const express = require("express");
const router = express.Router();
const favoriteController = require("../controllers/favoriteController");
const authMiddleware = require("../middleware/auth");

// 添加收藏
router.post("/", authMiddleware, favoriteController.add.bind(favoriteController));

// 取消收藏
router.delete("/:productCode", authMiddleware, favoriteController.remove.bind(favoriteController));

// 获取收藏列表
router.get("/", authMiddleware, favoriteController.list.bind(favoriteController));

module.exports = router;

