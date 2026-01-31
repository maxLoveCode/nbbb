const jwt = require("jsonwebtoken");

/**
 * JWT 工具类
 */
class JwtUtil {
  constructor() {
    this.secret = process.env.JWT_SECRET || "nbbb_ecommerce_secret_key_2024";
    this.expiresIn = process.env.TOKEN_EXPIRES_IN || "30d";
  }

  /**
   * 生成 JWT Token
   * @param {Object} payload - 载荷数据
   * @returns {string} JWT Token
   */
  sign(payload) {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn });
  }

  /**
   * 验证 JWT Token
   * @param {string} token - JWT Token
   * @returns {Object} 解码后的载荷
   */
  verify(token) {
    try {
      return jwt.verify(token, this.secret);
    } catch (error) {
      throw new Error("Token 无效或已过期");
    }
  }

  /**
   * 从请求头中提取 Token
   * @param {Object} req - Express 请求对象
   * @returns {string|null} Token 或 null
   */
  extractToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    return authHeader.substring(7);
  }
}

module.exports = new JwtUtil();
