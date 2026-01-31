const jwtUtil = require("../utils/jwt");

/**
 * JWT 认证中间件
 */
const authMiddleware = (req, res, next) => {
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
    // 统一使用 id 字段，同时保留 uid 以保持向后兼容
    req.user = {
      id: decoded.uid,
      uid: decoded.uid,
      openid: decoded.openid
    };

    next();
  } catch (error) {
    console.error("认证失败:", error.message);
    return res.status(401).json({
      code: 401,
      message: "认证失败: " + error.message
    });
  }
};

module.exports = authMiddleware;
