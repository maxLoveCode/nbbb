const jwtUtil = require("../utils/jwt");

/**
 * 网页端认证中间件
 * 支持多种登录方式的用户认证
 */
const webAuthMiddleware = (req, res, next) => {
  try {
    // 从请求头中提取 token
    const token = jwtUtil.extractToken(req);
    
    if (!token) {
      return res.status(401).json({
        code: 401,
        message: "缺少认证 token"
      });
    }

    // 验证 token
    const decoded = jwtUtil.verify(token);
    
    // 将用户信息注入到请求对象中
    // 网页端用户可能通过多种方式登录（微信、手机号、邮箱等）
    req.user = {
      id: decoded.uid,
      uid: decoded.uid,
      openid: decoded.openid || null,
      email: decoded.email || null,
      mobile: decoded.mobile || null,
      clientType: 'web'
    };

    next();
  } catch (error) {
    console.error("网页端认证失败:", error.message);
    return res.status(401).json({
      code: 401,
      message: "认证失败: " + error.message
    });
  }
};

module.exports = webAuthMiddleware;






