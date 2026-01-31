/**
 * 权限检查中间件
 * 基于 RBAC (Role-Based Access Control) 的权限控制
 */

/**
 * 检查管理员是否有指定的权限
 * @param {string} resource - 资源名称，如 'products', 'orders'
 * @param {string} action - 操作类型，如 'read', 'write', 'delete'
 */
const checkPermission = (resource, action) => {
  return (req, res, next) => {
    try {
      // 确保管理员已认证
      if (!req.admin) {
        return res.status(401).json({
          code: 401,
          message: "需要管理员认证"
        });
      }

      // 超级管理员拥有所有权限
      if (req.admin.isSuper) {
        return next();
      }

      // 检查权限配置
      const permissions = req.admin.permissions || {};
      
      // 检查通配符权限
      if (permissions['*'] && permissions['*'].includes('*')) {
        return next();
      }

      // 检查资源的通配符权限
      if (permissions[resource] && permissions[resource].includes('*')) {
        return next();
      }

      // 检查具体权限
      if (permissions[resource] && permissions[resource].includes(action)) {
        return next();
      }

      // 权限不足
      return res.status(403).json({
        code: 403,
        message: `权限不足：需要 ${resource}.${action} 权限`
      });
    } catch (error) {
      console.error("权限检查错误:", error.message);
      return res.status(500).json({
        code: 500,
        message: "权限检查失败"
      });
    }
  };
};

/**
 * 检查是否为超级管理员
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({
      code: 401,
      message: "需要管理员认证"
    });
  }

  if (!req.admin.isSuper) {
    return res.status(403).json({
      code: 403,
      message: "需要超级管理员权限"
    });
  }

  next();
};

module.exports = {
  checkPermission,
  requireSuperAdmin
};






