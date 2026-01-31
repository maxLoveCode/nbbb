/**
 * 日志工具类
 * 统一管理日志格式和输出
 */
class Logger {
  /**
   * 格式化日志消息
   * @param {string} level - 日志级别 (info, warn, error, debug)
   * @param {string} category - 日志分类 (auth, api, db, etc.)
   * @param {string} message - 日志消息
   * @param {object} data - 附加数据
   * @returns {string} 格式化后的日志字符串
   */
  static format(level, category, message, data = {}) {
    const timestamp = new Date().toISOString();
    const dataStr = Object.keys(data).length > 0 ? ` | Data: ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${category}] ${message}${dataStr}`;
  }

  /**
   * 记录信息日志
   * @param {string} category - 日志分类
   * @param {string} message - 日志消息
   * @param {object} data - 附加数据
   */
  static info(category, message, data = {}) {
    console.log(this.format('info', category, message, data));
  }

  /**
   * 记录警告日志
   * @param {string} category - 日志分类
   * @param {string} message - 日志消息
   * @param {object} data - 附加数据
   */
  static warn(category, message, data = {}) {
    console.warn(this.format('warn', category, message, data));
  }

  /**
   * 记录错误日志
   * @param {string} category - 日志分类
   * @param {string} message - 日志消息
   * @param {object} data - 附加数据
   */
  static error(category, message, data = {}) {
    console.error(this.format('error', category, message, data));
  }

  /**
   * 记录调试日志
   * @param {string} category - 日志分类
   * @param {string} message - 日志消息
   * @param {object} data - 附加数据
   */
  static debug(category, message, data = {}) {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.format('debug', category, message, data));
    }
  }

  /**
   * 记录登录相关日志
   * @param {string} action - 操作类型 (login_start, login_success, login_failed, etc.)
   * @param {object} data - 登录相关数据
   */
  static auth(action, data = {}) {
    const messages = {
      login_start: '开始登录流程',
      login_success: '登录成功',
      login_failed: '登录失败',
      get_openid_start: '开始获取微信openid',
      get_openid_success: '获取微信openid成功',
      get_openid_failed: '获取微信openid失败',
      user_found: '用户已存在',
      user_created: '创建新用户',
      token_generated: 'Token生成成功',
      session_saved: '会话保存成功',
      phone_get_start: '开始获取手机号',
      phone_get_success: '获取手机号成功',
      phone_get_failed: '获取手机号失败',
      logout: '用户登出',
      get_user_info: '获取用户信息'
    };

    const message = messages[action] || action;
    this.info('AUTH', message, data);
  }

  /**
   * 记录安全相关日志
   * @param {string} action - 操作类型
   * @param {object} data - 安全相关数据
   */
  static security(action, data = {}) {
    this.warn('SECURITY', action, data);
  }
}

module.exports = Logger;

