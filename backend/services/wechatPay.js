/**
 * 微信支付服务
 * 支持微信支付API v2和v3
 */

const crypto = require('crypto');

class WechatPayService {
  constructor() {
    // 从环境变量读取配置
    this.appId = process.env.WX_APPID || '';
    this.mchId = process.env.WX_MCH_ID || '';
    this.apiKey = process.env.WX_API_KEY || '';
    this.apiV3Key = process.env.WX_API_V3_KEY || '';
    this.serialNo = process.env.WX_SERIAL_NO || '';
    this.notifyUrl = process.env.WX_NOTIFY_URL || '';
    
    // 是否使用API v3
    this.useApiV3 = process.env.WX_PAY_API_V3 === 'true';

    // 如果配置不完整，打印警告
    if (!this.appId || !this.mchId) {
      console.warn('[WechatPay] 微信支付配置不完整，请设置环境变量');
    }
  }

  /**
   * 统一下单 (v2/v3自动选择)
   */
  async unifiedOrder(params) {
    if (this.useApiV3) {
      return this.unifiedOrderV3(params);
    }
    return this.unifiedOrderV2(params);
  }

  /**
   * 统一下单 v2
   */
  async unifiedOrderV2(params) {
    // TODO: 实现微信支付v2统一下单
    throw new Error('微信支付v2暂未实现，请配置v3或联系管理员');
  }

  /**
   * 统一下单 v3
   */
  async unifiedOrderV3(params) {
    // TODO: 实现微信支付v3统一下单
    throw new Error('微信支付v3暂未配置，请设置相关环境变量');
  }

  /**
   * 生成支付签名
   */
  generatePaySign(payResult) {
    const signStr = `${this.appId}\n${payResult.timeStamp}\n${payResult.nonceStr}\n${payResult.package}\n`;
    // 根据v2/v3使用不同的签名算法
    if (this.useApiV3) {
      // RSA-SHA256 签名
      return 'RSA_SIGN_PLACEHOLDER';
    } else {
      // MD5 签名
      return crypto.createHash('md5').update(signStr + this.apiKey).digest('hex').toUpperCase();
    }
  }

  /**
   * 处理支付回调
   */
  async handleNotify(data, headers) {
    // TODO: 实现支付回调处理
    throw new Error('支付回调处理未实现');
  }

  /**
   * 生成回调响应
   */
  generateNotifyResponse(success, message) {
    if (this.useApiV3) {
      return success 
        ? { code: 'SUCCESS', message: message || 'OK' }
        : { code: 'FAIL', message: message || 'FAIL' };
    } else {
      return success
        ? '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>'
        : `<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[${message}]]></return_msg></xml>`;
    }
  }

  /**
   * 查询订单
   */
  async queryOrder(orderNo) {
    // TODO: 实现订单查询
    throw new Error('订单查询未实现');
  }
}

module.exports = new WechatPayService();
