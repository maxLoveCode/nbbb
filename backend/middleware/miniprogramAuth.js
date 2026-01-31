const jwtUtil = require("../utils/jwt");

/**
 * 小程序端认证中间件
 * 验证微信小程序用户的 JWT Token
 */
const miniprogramAuthMiddleware = (req, res, next) => {
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
    
    // 小程序用户必须有 openid
    if (!decoded.openid) {
      return res.status(401).json({
        code: 401,
        message: "无效的小程序认证信息"
      });
    }
    
    // 将用户信息注入到请求对象中
    req.user = {
      id: decoded.uid,
      uid: decoded.uid,
      openid: decoded.openid,
      clientType: 'miniprogram'
    };

    next();
  } catch (error) {
    console.error("小程序认证失败:", error.message);
    return res.status(401).json({
      code: 401,
      message: "认证失败: " + error.message
    });
  }
};

module.exports = miniprogramAuthMiddleware;






