const express = require('express');
const router = express.Router();

// 网页端认证路由（暂时返回501）
router.post('/login', (req, res) => {
  res.status(501).json({
    success: false,
    error: { code: 501, message: '网页端登录功能开发中' }
  });
});

router.post('/register', (req, res) => {
  res.status(501).json({
    success: false,
    error: { code: 501, message: '网页端注册功能开发中' }
  });
});

module.exports = router;






