const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'ecommerce',
  user: 'admin',
  password: 'AxiaNBBB123'
});

const JWT_SECRET = process.env.JWT_SECRET || 'nbbb_ecommerce_secret_key_2024';
const JWT_EXPIRES_IN = process.env.ADMIN_TOKEN_EXPIRES_IN || '7d';

/**
 * 管理员登录
 * POST /api/admin/auth/login
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
  const userAgent = req.headers['user-agent'] || '';

  try {
    // 参数验证
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: '用户名和密码不能为空' }
      });
    }

    // 查询管理员
    const adminResult = await pool.query(
      `SELECT a.*, r.name as role_name, r.name_en as role_name_en, r.permissions, r.is_super
       FROM admins a
       LEFT JOIN admin_roles r ON a.role_id = r.id
       WHERE a.username = $1`,
      [username]
    );

    if (adminResult.rows.length === 0) {
      // 记录登录失败日志
      await pool.query(
        `INSERT INTO admin_login_logs (username, login_ip, user_agent, login_result, fail_reason)
         VALUES ($1, $2, $3, 'failed', '用户不存在')`,
        [username, ip, userAgent]
      );
      return res.status(401).json({
        success: false,
        error: { code: 401, message: '用户名或密码错误' }
      });
    }

    const admin = adminResult.rows[0];

    // 检查账号状态
    if (admin.status === 'disabled') {
      await pool.query(
        `INSERT INTO admin_login_logs (admin_id, username, login_ip, user_agent, login_result, fail_reason)
         VALUES ($1, $2, $3, $4, 'failed', '账号已禁用')`,
        [admin.id, username, ip, userAgent]
      );
      return res.status(403).json({
        success: false,
        error: { code: 403, message: '账号已被禁用，请联系管理员' }
      });
    }

    // 检查账号是否锁定
    if (admin.status === 'locked' && admin.locked_until && new Date(admin.locked_until) > new Date()) {
      const remainingMinutes = Math.ceil((new Date(admin.locked_until) - new Date()) / 60000);
      await pool.query(
        `INSERT INTO admin_login_logs (admin_id, username, login_ip, user_agent, login_result, fail_reason)
         VALUES ($1, $2, $3, $4, 'locked', '账号锁定中')`,
        [admin.id, username, ip, userAgent]
      );
      return res.status(403).json({
        success: false,
        error: { code: 403, message: `账号已锁定，请${remainingMinutes}分钟后重试` }
      });
    }

    // 验证密码
    const isPasswordValid = bcrypt.compareSync(password, admin.password_hash);
    if (!isPasswordValid) {
      // 增加失败次数
      const newFailCount = (admin.failed_login_count || 0) + 1;
      const maxAttempts = 5;
      
      if (newFailCount >= maxAttempts) {
        // 锁定账号30分钟
        const lockUntil = new Date(Date.now() + 30 * 60 * 1000);
        await pool.query(
          `UPDATE admins SET failed_login_count = $1, status = 'locked', locked_until = $2 WHERE id = $3`,
          [newFailCount, lockUntil, admin.id]
        );
        await pool.query(
          `INSERT INTO admin_login_logs (admin_id, username, login_ip, user_agent, login_result, fail_reason)
           VALUES ($1, $2, $3, $4, 'locked', '密码错误次数过多，账号已锁定')`,
          [admin.id, username, ip, userAgent]
        );
        return res.status(403).json({
          success: false,
          error: { code: 403, message: '密码错误次数过多，账号已锁定30分钟' }
        });
      } else {
        await pool.query(
          `UPDATE admins SET failed_login_count = $1 WHERE id = $2`,
          [newFailCount, admin.id]
        );
        await pool.query(
          `INSERT INTO admin_login_logs (admin_id, username, login_ip, user_agent, login_result, fail_reason)
           VALUES ($1, $2, $3, $4, 'failed', '密码错误')`,
          [admin.id, username, ip, userAgent]
        );
        return res.status(401).json({
          success: false,
          error: { 
            code: 401, 
            message: `用户名或密码错误，还剩${maxAttempts - newFailCount}次尝试机会` 
          }
        });
      }
    }

    // 登录成功，重置失败次数和锁定状态
    await pool.query(
      `UPDATE admins SET 
        failed_login_count = 0, 
        status = 'active',
        locked_until = NULL,
        last_login_at = CURRENT_TIMESTAMP,
        last_login_ip = $1,
        login_count = login_count + 1
       WHERE id = $2`,
      [ip, admin.id]
    );

    // 生成JWT Token
    const tokenPayload = {
      adminId: admin.id,
      username: admin.username,
      roleId: admin.role_id,
      roleName: admin.role_name,
      isSuper: admin.is_super,
      permissions: admin.permissions
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // 生成会话ID
    const sessionId = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天

    // 保存会话
    await pool.query(
      `INSERT INTO admin_sessions (admin_id, session_id, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [admin.id, sessionId, expiresAt, ip, userAgent]
    );

    // 记录登录成功日志
    await pool.query(
      `INSERT INTO admin_login_logs (admin_id, username, login_ip, user_agent, login_result, session_id)
       VALUES ($1, $2, $3, $4, 'success', $5)`,
      [admin.id, username, ip, userAgent, sessionId]
    );

    console.log(`[Admin Login] ${username} 登录成功 IP: ${ip}`);

    // 返回登录结果
    res.json({
      success: true,
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          realName: admin.real_name,
          email: admin.email,
          avatar: admin.avatar_url,
          role: {
            id: admin.role_id,
            name: admin.role_name,
            nameEn: admin.role_name_en,
            isSuper: admin.is_super
          },
          lastLoginAt: admin.last_login_at,
          loginCount: admin.login_count + 1
        }
      },
      message: '登录成功'
    });

  } catch (error) {
    console.error('[Admin Login Error]', error);
    res.status(500).json({
      success: false,
      error: { code: 500, message: '服务器错误，请稍后重试' }
    });
  }
});

/**
 * 管理员登出
 * POST /api/admin/auth/logout
 */
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      // 解析token获取会话信息
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // 使会话失效
        await pool.query(
          `UPDATE admin_sessions SET is_active = false, logout_time = CURRENT_TIMESTAMP 
           WHERE admin_id = $1 AND is_active = true`,
          [decoded.adminId]
        );
        // 更新登录日志的登出时间
        await pool.query(
          `UPDATE admin_login_logs SET logout_time = CURRENT_TIMESTAMP 
           WHERE admin_id = $1 AND logout_time IS NULL`,
          [decoded.adminId]
        );
      } catch (e) {
        // Token无效，忽略
      }
    }
    
    res.json({
      success: true,
      message: '登出成功'
    });
  } catch (error) {
    console.error('[Admin Logout Error]', error);
    res.status(500).json({
      success: false,
      error: { code: 500, message: '服务器错误' }
    });
  }
});

/**
 * 获取当前管理员信息
 * GET /api/admin/auth/me
 */
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 401, message: '未登录' }
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({
        success: false,
        error: { code: 401, message: 'Token无效或已过期' }
      });
    }

    const adminResult = await pool.query(
      `SELECT a.*, r.name as role_name, r.name_en as role_name_en, r.permissions, r.is_super
       FROM admins a
       LEFT JOIN admin_roles r ON a.role_id = r.id
       WHERE a.id = $1 AND a.status = 'active'`,
      [decoded.adminId]
    );

    if (adminResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: { code: 401, message: '账号不存在或已禁用' }
      });
    }

    const admin = adminResult.rows[0];

    res.json({
      success: true,
      data: {
        id: admin.id,
        username: admin.username,
        realName: admin.real_name,
        email: admin.email,
        avatar: admin.avatar_url,
        role: {
          id: admin.role_id,
          name: admin.role_name,
          nameEn: admin.role_name_en,
          isSuper: admin.is_super,
          permissions: admin.permissions
        },
        lastLoginAt: admin.last_login_at,
        loginCount: admin.login_count
      }
    });  } catch (error) {
    console.error('[Admin Me Error]', error);
    res.status(500).json({
      success: false,
      error: { code: 500, message: '服务器错误' }
    });
  }
});module.exports = router;