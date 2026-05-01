const jwtUtil = require("../utils/jwt");

module.exports = function optionalAuth(req, _res, next) {
  try {
    const token = jwtUtil.extractToken(req);
    if (!token) {
      return next();
    }

    const decoded = jwtUtil.verify(token);
    req.user = {
      id: decoded.uid,
      uid: decoded.uid,
      openid: decoded.openid || null,
      email: decoded.email || null,
      mobile: decoded.mobile || null
    };
  } catch (error) {
    // 可选登录场景下忽略无效 token，回退到公开价
  }

  next();
};
