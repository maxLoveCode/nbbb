const { Pool } = require("pg");
const wechatUtil = require("../utils/wechat");
const jwtUtil = require("../utils/jwt");
const logger = require("../utils/logger");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "ecommerce",
  user: "admin",
  password: "AxiaNBBB123"
});

/**
 * 认证控制器
 */
class AuthController {
  /**
   * 微信小程序登录
   * POST /auth/wechat/login
   */
  async wechatLogin(req, res) {
    const startTime = Date.now();
    const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";
    
    try {
      const { code } = req.body;

      // 记录登录开始
      logger.auth('login_start', {
        ip,
        userAgent: userAgent.substring(0, 100), // 限制长度
        hasCode: !!code
      });

      if (!code) {
        logger.auth('login_failed', {
          reason: '缺少登录 code',
          ip,
          userAgent: userAgent.substring(0, 100)
        });
        return res.status(400).json({
          code: 400,
          message: "缺少登录 code"
        });
      }

      // 1) 通过 code 获取 openid/session_key
      logger.auth('get_openid_start', { ip });
      const { openid, session_key, unionid } = await wechatUtil.getOpenIdByCode(code);
      logger.auth('get_openid_success', {
        openid: openid ? `${openid.substring(0, 8)}...` : null, // 脱敏处理
        hasUnionid: !!unionid,
        ip
      });

      // 2) 查找或创建用户
      let user;
      let isNewUser = false;
      const found = await pool.query("SELECT * FROM users WHERE openid = $1", [openid]);
      if (found.rows.length > 0) {
        user = found.rows[0];
        logger.auth('user_found', {
          userId: user.id,
          openid: `${openid.substring(0, 8)}...`,
          ip
        });
      } else {
        const created = await pool.query(
          `INSERT INTO users (openid, unionid, nickname, avatar_url, username, email, password_hash)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [openid, unionid, "微信用户", "https://via.placeholder.com/100", openid, `${openid}@wechat.com`, "wechat_user"]
        );
        user = created.rows[0];
        isNewUser = true;
        logger.auth('user_created', {
          userId: user.id,
          openid: `${openid.substring(0, 8)}...`,
          ip
        });
      }

      // 3) 保存 session_key（可选）
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await pool.query(
        `INSERT INTO user_sessions (user_id, session_key, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO UPDATE SET
         session_key = EXCLUDED.session_key,
         expires_at = EXCLUDED.expires_at`,
        [user.id, session_key, expiresAt]
      );
      logger.auth('session_saved', {
        userId: user.id,
        expiresAt: expiresAt.toISOString()
      });

      // 4) 生成业务 Token
      const token = jwtUtil.sign({ uid: user.id, openid: user.openid });
      logger.auth('token_generated', {
        userId: user.id,
        tokenLength: token.length
      });

      // 5) 记录登录成功
      const duration = Date.now() - startTime;
      logger.auth('login_success', {
        userId: user.id,
        openid: `${openid.substring(0, 8)}...`,
        isNewUser,
        ip,
        duration: `${duration}ms`,
        member: user.member || 1
      });

      // 6) 返回响应（含 member）
      return res.json({
        code: 0,
        data: {
          token,
          user: {
            id: user.id,
            openid: user.openid,
            nickname: user.nickname,
            avatarUrl: user.avatar_url,
            mobile: user.phone || null,
            member: user.member || 1
          }
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.auth('login_failed', {
        error: error.message,
        stack: error.stack?.substring(0, 200), // 限制堆栈长度
        ip,
        userAgent: userAgent.substring(0, 100),
        duration: `${duration}ms`
      });
      logger.error('AUTH', '微信登录异常', {
        error: error.message,
        ip,
        duration: `${duration}ms`
      });
      return res.status(200).json({ code: 500, message: error.message || "登录失败" });
    }
  }

  /**
   * 获取微信手机号
   * POST /auth/wechat/phone
   */
  async getWechatPhone(req, res) {
    try {
      const { code } = req.body;
      const userId = req.user.id;
      const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";

      logger.auth('phone_get_start', {
        userId,
        ip,
        hasCode: !!code
      });

      if (!code) {
        logger.auth('phone_get_failed', {
          userId,
          reason: '缺少手机号授权 code',
          ip
        });
        return res.status(400).json({ code: 400, message: "缺少手机号授权 code" });
      }

      const phoneNumber = await wechatUtil.getPhoneNumber(code);
      await pool.query("UPDATE users SET phone = $1 WHERE id = $2", [phoneNumber, userId]);

      logger.auth('phone_get_success', {
        userId,
        phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 3)}****${phoneNumber.substring(7)}` : null, // 脱敏
        ip
      });

      return res.json({ code: 0, data: { mobile: phoneNumber } });
    } catch (error) {
      const userId = req.user?.id || 'unknown';
      const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";
      logger.auth('phone_get_failed', {
        userId,
        error: error.message,
        ip
      });
      logger.error('AUTH', '获取手机号异常', {
        userId,
        error: error.message,
        ip
      });
      return res.status(200).json({ code: 500, message: error.message || "获取手机号失败" });
    }
  }

  /**
   * 获取当前用户信息
   * GET /auth/me
   */
  async getCurrentUser(req, res) {
    try {
      const userId = req.user.id;
      const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";
      
      logger.auth('get_user_info', {
        userId,
        ip
      });

      const q = await pool.query(
        `SELECT id, openid, unionid, nickname, avatar_url, phone as mobile, member, is_active, created_at, updated_at
         FROM users WHERE id = $1`,
        [userId]
      );

      if (q.rows.length === 0) {
        logger.warn('AUTH', '用户不存在', { userId, ip });
        return res.status(404).json({ code: 404, message: "用户不存在" });
      }

      const user = q.rows[0];

      return res.json({
        code: 0,
        data: {
          user: {
            id: user.id,
            openid: user.openid,
            nickname: user.nickname,
            avatarUrl: user.avatar_url,
            mobile: user.mobile,
            member: user.member,
            isActive: user.is_active,
            createdAt: user.created_at,
            updatedAt: user.updated_at
          }
        }
      });
    } catch (error) {
      const userId = req.user?.id || 'unknown';
      const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";
      logger.error('AUTH', '获取用户信息异常', {
        userId,
        error: error.message,
        ip
      });
      return res.status(200).json({ code: 500, message: "获取用户信息失败" });
    }
  }

  /**
   * 登出
   * POST /auth/logout
   */
  async logout(req, res) {
    try {
      const userId = req.user.id;
      const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";
      
      logger.auth('logout', {
        userId,
        ip
      });

      return res.json({ code: 0, message: "登出成功" });
    } catch (error) {
      const userId = req.user?.id || 'unknown';
      const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";
      logger.error('AUTH', '登出异常', {
        userId,
        error: error.message,
        ip
      });
      return res.status(200).json({ code: 500, message: "登出失败" });
    }
  }
}

module.exports = new AuthController();


