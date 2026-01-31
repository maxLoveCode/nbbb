const express = require('express');
const router = express.Router();

// 导入公共路由
const productRouter = require('./product');
const categoryRouter = require('./category');

// 注册子路由
router.use('/products', productRouter);
router.use('/product', productRouter);
router.use('/categories', categoryRouter);

// 健康检查
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '公共 API 正常运行',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;






