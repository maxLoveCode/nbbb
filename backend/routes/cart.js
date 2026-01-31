const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const authMiddleware = require("../middleware/auth");

// 所有购物车接口都需要认证
router.post("/add", authMiddleware, cartController.addToCart.bind(cartController));
router.get("/", authMiddleware, cartController.getCart.bind(cartController));
router.put("/:id", authMiddleware, cartController.updateCartItem.bind(cartController));
router.delete("/:id", authMiddleware, cartController.deleteCartItem.bind(cartController));
router.delete("/", authMiddleware, cartController.clearCart.bind(cartController));

module.exports = router;

