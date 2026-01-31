const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "ecommerce",
  user: "admin",
  password: "AxiaNBBB123"
});

const JWT_SECRET = process.env.JWT_SECRET || "nbbb_secret_key_2024";

/**
 * 管理员认证中间件
 * 验证管理员身份并加载权限信息
 */
const adminAuthMiddleware = async (req, res, next) => {
  try {
    // 从请求头中提取 token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        code: 401,
        message: "缺少管理员认证 token"
      });
    }

    const token = authHeader.substring(7);
    
    // 验证 token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        code: 401,
        message: "无效的认证 token"
      });
    }

    // 管理员 token 必须包含 adminId
    if (!decoded.adminId) {
      return res.status(401).json({
        code: 401,
        message: "无效的管理员认证信息"
      });
    }

    // 从数据库加载管理员信息和权限
    const adminQuery = `
      SELECT a.*, r.name as role_name, r.permissions, r.is_super
      FROM admins a
      JOIN admin_roles r ON a.role_id = r.id
      WHERE a.id = $1 AND a.status = 'active'
    `;
    
    const result = await pool.query(adminQuery, [decoded.adminId]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        code: 401,
        message: "管理员账号不存在或已被禁用"
      });
    }

    const admin = result.rows[0];
    
    // 将管理员信息注入到请求对象中
    req.admin = {
      id: admin.id,
      username: admin.username,
      realName: admin.real_name,
      email: admin.email,
      roleId: admin.role_id,
      roleName: admin.role_name,
      permissions: admin.permissions,
      isSuper: admin.is_super,
      clientType: 'admin'
    };

    next();
  } catch (error) {
    console.error("管理员认证失败:", error.message);
    return res.status(500).json({
      code: 500,
      message: "认证失败: " + error.message
    });
  }
};

module.exports = adminAuthMiddleware;






