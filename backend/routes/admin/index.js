const express = require('express');
const router = express.Router();

// 导入子路由
const authRouter = require('./auth');
const productRouter = require('./product');
const orderRouter = require('./order');
const userRouter = require('./user');
const dashboardRouter = require('./dashboard');
const homepageRouter = require('./homepage');
const uploadRouter = require('./upload');

// 注册子路由
router.use('/auth', authRouter);
router.use('/products', productRouter);
router.use('/orders', orderRouter);
router.use('/users', userRouter);
router.use('/dashboard', dashboardRouter);
router.use('/homepage', homepageRouter);
router.use('/upload', uploadRouter);

// 健康检查
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '后台管理 API 正常运行',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;




