const express = require('express');
const router = express.Router();

// 后台管理员认证路由（暂时返回501）
router.post('/login', (req, res) => {
  res.status(501).json({
    success: false,
    error: { code: 501, message: '管理员登录功能开发中' }
  });
});

router.post('/logout', (req, res) => {
  res.status(501).json({
    success: false,
    error: { code: 501, message: '管理员登出功能开发中' }
  });
});

module.exports = router;






