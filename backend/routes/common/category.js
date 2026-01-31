const express = require('express');
const router = express.Router();

// 复用现有的分类路由
const categoriesRouter = require('../categories');

// 将所有请求转发到现有的分类路由
router.use('/', categoriesRouter);

module.exports = router;






