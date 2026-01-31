const wechatUtil = require("../../utils/wechat");
const jwtUtil = require("../../utils/jwt");
const userService = require("../../services/userService");
const formatter = require("../../utils/formatters/miniprogramFormatter");
const logger = require("../../utils/logger");

/**
 * 小程序认证控制器
 */
class MiniprogramAuthController {
  /**
   * 微信小程序登录
   * POST /api/miniprogram/auth/login
   */
  async login(req, res) {
    const startTime = Date.now();
    const ip = req.ip || req.connection.remoteAddress || "unknown";

    try {
      const { code } = req.body;

      if (!code) {
        return res.status(400).json(
          formatter.formatError("缺少登录 code", 400)
        );
      }

      // 1. 通过 code 获取 openid
      logger.auth('miniprogram_login_start', { ip });
      const { openid, session_key, unionid } = await wechatUtil.getOpenIdByCode(code);
      logger.auth('get_openid_success', { openid: `${openid.substring(0, 8)}...`, ip });

      // 2. 查找或创建用户
      let user = await userService.getUserByOpenid(openid);
      let isNewUser = false;

      if (!user) {
        user = await userService.createUser({
          openid,
          unionid,
          nickname: "微信用户",
          avatarUrl: "https://via.placeholder.com/100"
        });
        isNewUser = true;
        logger.auth('user_created', { userId: user.id, ip });
      } else {
        logger.auth('user_found', { userId: user.id, ip });
      }

      // 3. 生成 JWT Token
      const token = jwtUtil.sign({
        uid: user.id,
        openid: user.openid
      });

      // 4. 返回登录结果
      const duration = Date.now() - startTime;
      logger.auth('miniprogram_login_success', {
        userId: user.id,
        isNewUser,
        duration,
        ip
      });

      res.json(formatter.formatResponse({
        token,
        user: formatter.formatUser(user),
        isNewUser
      }, isNewUser ? '注册成功' : '登录成功'));
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('AUTH', '小程序登录失败', {
        error: error.message,
        duration,
        ip
      });

      res.status(500).json(
        formatter.formatError("登录失败: " + error.message, 500)
      );
    }
  }

  /**
   * 获取微信手机号
   * POST /api/miniprogram/auth/phone
   */
  async getPhone(req, res) {
    try {
      const { code } = req.body;
      const userId = req.user.id;

      if (!code) {
        return res.status(400).json(
          formatter.formatError("缺少手机号授权 code", 400)
        );
      }

      // 获取手机号
      const phoneData = await wechatUtil.getPhoneNumber(code);
      const mobile = phoneData.phoneNumber;

      // 更新用户手机号
      const updatedUser = await userService.updateUserProfile(userId, { mobile });

      logger.info('AUTH', '获取手机号成功', {
        userId,
        mobile: `${mobile.substring(0, 3)}****${mobile.substring(7)}`
      });

      res.json(formatter.formatResponse({
        user: formatter.formatUser(updatedUser),
        mobile
      }, '获取手机号成功'));
    } catch (error) {
      logger.error('AUTH', '获取手机号失败', {
        userId: req.user?.id,
        error: error.message
      });

      res.status(500).json(
        formatter.formatError("获取手机号失败: " + error.message, 500)
      );
    }
  }

  /**
   * 获取当前用户信息
   * GET /api/miniprogram/auth/me
   */
  async getCurrentUser(req, res) {
    try {
      const userId = req.user.id;
      const user = await userService.getUserById(userId);

      if (!user) {
        return res.status(404).json(
          formatter.formatError("用户不存在", 404)
        );
      }

      res.json(formatter.formatResponse(
        formatter.formatUser(user)
      ));
    } catch (error) {
      logger.error('AUTH', '获取用户信息失败', {
        userId: req.user?.id,
        error: error.message
      });

      res.status(500).json(
        formatter.formatError("获取用户信息失败: " + error.message, 500)
      );
    }
  }

  /**
   * 登出
   * POST /api/miniprogram/auth/logout
   */
  async logout(req, res) {
    try {
      const userId = req.user.id;

      logger.info('AUTH', '用户登出', { userId });

      res.json(formatter.formatResponse(null, '登出成功'));
    } catch (error) {
      logger.error('AUTH', '登出失败', {
        userId: req.user?.id,
        error: error.message
      });

      res.status(500).json(
        formatter.formatError("登出失败: " + error.message, 500)
      );
    }
  }
}

module.exports = new MiniprogramAuthController();






