const axios = require("axios");
const logger = require("./logger");
require("dotenv").config();

/**
 * 微信小程序工具类
 */
class WechatUtil {
  constructor() {
    this.appId = process.env.WX_APPID;
    this.appSecret = process.env.WX_SECRET;
    this.accessToken = null;
    this.accessTokenExpiresAt = null;
    
    // 验证环境变量
    if (!this.appId || !this.appSecret) {
      logger.error('WECHAT', '微信配置缺失', {
        hasAppId: !!this.appId,
        hasAppSecret: !!this.appSecret
      });
      throw new Error('微信配置缺失：请设置 WX_APPID 和 WX_SECRET 环境变量');
    }
  }

  /**
   * 通过 code 获取 openid 和 session_key
   * @param {string} code - 微信登录 code
   * @returns {Promise<Object>} 包含 openid, session_key, unionid 的对象
   */
  async getOpenIdByCode(code) {
    const startTime = Date.now();
    try {
      const url = `https://api.weixin.qq.com/sns/jscode2session`;
      const params = {
        appid: this.appId,
        secret: this.appSecret,
        js_code: code,
        grant_type: "authorization_code"
      };

      // 验证配置
      if (!this.appId || !this.appSecret) {
        logger.error('WECHAT', '微信配置缺失，无法调用接口', {
          hasAppId: !!this.appId,
          hasAppSecret: !!this.appSecret
        });
        throw new Error('微信配置缺失：请设置 WX_APPID 和 WX_SECRET 环境变量');
      }

      logger.debug('WECHAT', '调用微信jscode2session接口', {
        hasCode: !!code,
        codeLength: code?.length || 0,
        hasAppId: !!this.appId
      });

      const response = await axios.get(url, { params });
      const data = response.data;
      const duration = Date.now() - startTime;

      if (data.errcode) {
        logger.error('WECHAT', '微信jscode2session接口返回错误', {
          errcode: data.errcode,
          errmsg: data.errmsg,
          duration: `${duration}ms`
        });
        throw new Error(`微信接口错误: ${data.errcode} - ${data.errmsg}`);
      }

      logger.info('WECHAT', '获取openid成功', {
        openid: data.openid ? `${data.openid.substring(0, 8)}...` : null,
        hasUnionid: !!data.unionid,
        duration: `${duration}ms`
      });

      return {
        openid: data.openid,
        session_key: data.session_key,
        unionid: data.unionid || null
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('WECHAT', '获取openid失败', {
        error: error.message,
        duration: `${duration}ms`,
        isAxiosError: error.isAxiosError,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      throw error;
    }
  }

  /**
   * 获取微信小程序全局 access_token
   * @returns {Promise<string>} access_token
   */
  async getAccessToken() {
    // 如果 access_token 还有效，直接返回
    if (this.accessToken && this.accessTokenExpiresAt && new Date() < this.accessTokenExpiresAt) {
      logger.debug('WECHAT', '使用缓存的access_token', {
        expiresAt: this.accessTokenExpiresAt.toISOString()
      });
      return this.accessToken;
    }

    const startTime = Date.now();
    try {
      const url = `https://api.weixin.qq.com/cgi-bin/token`;
      const params = {
        grant_type: "client_credential",
        appid: this.appId,
        secret: this.appSecret
      };

      logger.info('WECHAT', '获取新的access_token', {
        reason: this.accessToken ? '已过期' : '首次获取'
      });

      const response = await axios.get(url, { params });
      const data = response.data;
      const duration = Date.now() - startTime;

      if (data.errcode) {
        logger.error('WECHAT', '获取access_token失败', {
          errcode: data.errcode,
          errmsg: data.errmsg,
          duration: `${duration}ms`
        });
        throw new Error(`获取 access_token 失败: ${data.errcode} - ${data.errmsg}`);
      }

      this.accessToken = data.access_token;
      this.accessTokenExpiresAt = new Date(Date.now() + (data.expires_in - 300) * 1000); // 提前5分钟过期

      logger.info('WECHAT', 'access_token获取成功', {
        expiresAt: this.accessTokenExpiresAt.toISOString(),
        duration: `${duration}ms`
      });

      return this.accessToken;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('WECHAT', '获取access_token异常', {
        error: error.message,
        duration: `${duration}ms`,
        isAxiosError: error.isAxiosError,
        status: error.response?.status
      });
      throw error;
    }
  }

  /**
   * 通过手机号授权码获取手机号
   * @param {string} code - 手机号授权码
   * @returns {Promise<string>} 手机号
   */
  async getPhoneNumber(code) {
    const startTime = Date.now();
    try {
      logger.debug('WECHAT', '开始获取手机号', {
        hasCode: !!code
      });

      const accessToken = await this.getAccessToken();
      const url = `https://api.weixin.qq.com/wxa/business/getuserphonenumber`;
      const params = { access_token: accessToken };
      const data = {
        code: code
      };

      const response = await axios.post(url, data, { params });
      const result = response.data;
      const duration = Date.now() - startTime;

      if (result.errcode !== 0) {
        logger.error('WECHAT', '获取手机号失败', {
          errcode: result.errcode,
          errmsg: result.errmsg,
          duration: `${duration}ms`
        });
        throw new Error(`获取手机号失败: ${result.errcode} - ${result.errmsg}`);
      }

      const phoneNumber = result.phone_info.phoneNumber;
      logger.info('WECHAT', '获取手机号成功', {
        phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 3)}****${phoneNumber.substring(7)}` : null,
        duration: `${duration}ms`
      });

      return phoneNumber;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('WECHAT', '获取手机号异常', {
        error: error.message,
        duration: `${duration}ms`,
        isAxiosError: error.isAxiosError,
        status: error.response?.status
      });
      throw error;
    }
  }
}

module.exports = new WechatUtil();
