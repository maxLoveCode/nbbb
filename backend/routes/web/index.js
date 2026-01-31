const express = require('express');
const router = express.Router();

// 导入子路由
const authRouter = require('./auth');
const productRouter = require('./product');

// 注册子路由
router.use('/auth', authRouter);
router.use('/product', productRouter);
router.use('/products', productRouter);

// 健康检查
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '网页端 API 正常运行',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;






