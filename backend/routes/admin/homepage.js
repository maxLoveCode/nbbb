const express = require('express');
const router = express.Router();

// 复用现有的后台首页管理路由
const adminHomepageRouter = require('../admin-homepage');

// 将所有请求转发到现有的首页管理路由
router.use('/', adminHomepageRouter);

module.exports = router;






