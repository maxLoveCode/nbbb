const express = require('express');
const router = express.Router();

// 导入子路由
const authRouter = require('./auth');
const homeRouter = require('./home');
const catalogRouter = require('./catalog');
const cartRouter = require('./cart');
const ordersRouter = require('./orders');
const paymentRouter = require('./payment');
const favoritesRouter = require('./favorites');
const addressesRouter = require('./addresses');
const productRouter = require('./product');

// 注册子路由
router.use('/auth', authRouter);
router.use('/home', homeRouter);
router.use('/', catalogRouter);
router.use('/cart', cartRouter);
router.use('/orders', ordersRouter);
router.use('/payment', paymentRouter);
router.use('/favorites', favoritesRouter);
router.use('/addresses', addressesRouter);
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






