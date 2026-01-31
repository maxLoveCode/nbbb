const express = require('express');
const router = express.Router();

// 导入子路由
const authRouter = require('./auth');
const productRouter = require('./product');
const homeRouter = require('./home');
const cartRouter = require('./cart');
const addressRouter = require('./address');
const userRouter = require('./user');
const favoriteRouter = require('./favorite');
const uploadRouter = require('./upload');

// 注册子路由
router.use('/auth', authRouter);
router.use('/product', productRouter);
router.use('/products', productRouter);
router.use('/home', homeRouter);
router.use('/cart', cartRouter);
router.use('/address', addressRouter);
router.use('/addresses', addressRouter);
router.use('/user', userRouter);
router.use('/favorite', favoriteRouter);
router.use('/favorites', favoriteRouter);
router.use('/upload', uploadRouter);

// 健康检查
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '小程序端 API 正常运行',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
