const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const authMiddleware = require("../middleware/auth");

// 支付回调接口不需要认证
// API v2使用XML格式，API v3使用JSON格式
router.post("/notify", (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  
  // 如果是JSON格式（API v3）
  if (contentType.includes('application/json')) {
    // Express会自动解析JSON，直接传递
    next();
  } else {
    // XML格式（API v2），需要以文本形式接收
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      req.body = data;
      next();
    });
  }
}, paymentController.handleNotify.bind(paymentController));

// 其他支付接口需要认证
router.post("/create", authMiddleware, paymentController.createPayment.bind(paymentController));
router.post("/v3/create", authMiddleware, paymentController.createPaymentV3.bind(paymentController));
router.get("/status/:order_id", authMiddleware, paymentController.getPaymentStatus.bind(paymentController));
router.put("/order/:order_id", authMiddleware, paymentController.updateOrderPayment.bind(paymentController));

module.exports = router;

