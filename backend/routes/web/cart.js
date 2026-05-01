const express = require("express");
const router = express.Router();

const cartController = require("../../controllers/cartController");
const webAuth = require("../../middleware/webAuth");

router.use(webAuth);

router.get("/", cartController.getCart.bind(cartController));

router.post("/", (req, res, next) => {
  const { productCode, skuId, quantity } = req.body || {};
  req.body = {
    ...req.body,
    product_code: req.body?.product_code || productCode,
    sku_id: req.body?.sku_id || skuId,
    quantity: quantity || req.body?.quantity || 1
  };
  return cartController.addToCart(req, res, next);
});

router.put("/:id", cartController.updateCartItem.bind(cartController));
router.delete("/:id", cartController.deleteCartItem.bind(cartController));
router.delete("/", cartController.clearCart.bind(cartController));

module.exports = router;
