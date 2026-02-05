/**
 * 微信支付服务
 * 支持微信支付API v3
 */

const crypto = require('crypto');
const fs = require('fs');
const https = require('https');

class WechatPayService {
  constructor() {
    // 从环境变量读取配置
    this.appId = process.env.WX_APPID || '';
    this.mchId = process.env.WX_MCH_ID || '';
    this.apiKey = process.env.WX_API_KEY || '';
    this.apiV3Key = process.env.WX_API_V3_KEY || '';
    this.serialNo = process.env.WX_PAY_SERIAL_NO || process.env.WX_SERIAL_NO || '';
    this.notifyUrl = process.env.WX_PAY_NOTIFY_URL || process.env.WX_NOTIFY_URL || '';
    this.certPath = process.env.WX_PAY_CERT_PATH || '';
    this.keyPath = process.env.WX_PAY_KEY_PATH || '';
    
    // 是否使用API v3
    this.useApiV3 = process.env.WX_PAY_API_V3 === 'true';

    // 加载私钥
    this.privateKey = null;
    if (this.keyPath && fs.existsSync(this.keyPath)) {
      try {
        this.privateKey = fs.readFileSync(this.keyPath, 'utf8');
        console.log('[WechatPay] 私钥加载成功');
      } catch (err) {
        console.error('[WechatPay] 私钥加载失败:', err.message);
      }
    }

    // 配置检查
    if (!this.appId || !this.mchId) {
      console.warn('[WechatPay] 微信支付配置不完整，请设置环境变量');
    }
    
    if (this.useApiV3 && (!this.apiV3Key || !this.serialNo || !this.privateKey)) {
      console.warn('[WechatPay] 微信支付v3配置不完整:', {
        hasApiV3Key: !!this.apiV3Key,
        hasSerialNo: !!this.serialNo,
        hasPrivateKey: !!this.privateKey
      });
    }
  }

  /**
   * 生成随机字符串
   */
  generateNonceStr(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 生成v3签名
   */
  generateV3Signature(method, url, timestamp, nonceStr, body) {
    const message = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(message);
    return sign.sign(this.privateKey, 'base64');
  }

  /**
   * 生成v3 Authorization头
   */
  generateV3Authorization(method, url, body = '') {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = this.generateNonceStr();
    const signature = this.generateV3Signature(method, url, timestamp, nonceStr, body);
    
    return `WECHATPAY2-SHA256-RSA2048 mchid="${this.mchId}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${this.serialNo}",signature="${signature}"`;
  }

  /**
   * 发送v3请求
   */
  async sendV3Request(method, path, data = null) {
    const body = data ? JSON.stringify(data) : '';
    const authorization = this.generateV3Authorization(method, path, body);
    
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.mch.weixin.qq.com',
        port: 443,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': authorization,
          'User-Agent': 'NBBB-WechatPay/1.0'
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => { responseData += chunk; });
        res.on('end', () => {
          try {
            const result = JSON.parse(responseData);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(result);
            } else {
              reject(new Error(result.message || `微信支付错误: ${res.statusCode}`));
            }
          } catch (e) {
            reject(new Error(`解析响应失败: ${responseData}`));
          }
        });
      });

      req.on('error', (e) => reject(e));
      
      if (body) {
        req.write(body);
      }
      req.end();
    });
  }

  /**
   * 统一下单 v3 (JSAPI)
   */
  async unifiedOrderV3(params) {
    // 检查配置
    if (!this.privateKey) {
      throw new Error('微信支付v3私钥未配置');
    }
    if (!this.serialNo) {
      throw new Error('微信支付v3证书序列号未配置');
    }
    if (!this.apiV3Key) {
      throw new Error('微信支付v3密钥未配置');
    }

    const { openid, outTradeNo, body, totalFee, clientIp, attach } = params;

    const requestData = {
      appid: this.appId,
      mchid: this.mchId,
      description: body || '商品购买',
      out_trade_no: outTradeNo,
      notify_url: this.notifyUrl,
      amount: {
        total: totalFee, // 单位：分
        currency: 'CNY'
      },
      payer: {
        openid: openid
      }
    };

    if (attach) {
      requestData.attach = attach;
    }

    console.log('[WechatPay] v3统一下单请求:', {
      outTradeNo,
      totalFee,
      openid: openid ? `${openid.substring(0, 8)}...` : null
    });

    const result = await this.sendV3Request('POST', '/v3/pay/transactions/jsapi', requestData);

    console.log('[WechatPay] v3统一下单响应:', result);

    // 构建小程序支付参数
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = this.generateNonceStr();
    const packageStr = `prepay_id=${result.prepay_id}`;

    // 生成支付签名
    const signMessage = `${this.appId}\n${timeStamp}\n${nonceStr}\n${packageStr}\n`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signMessage);
    const paySign = sign.sign(this.privateKey, 'base64');

    return {
      prepayId: result.prepay_id,
      timeStamp: timeStamp,
      nonceStr: nonceStr,
      package: packageStr,
      signType: 'RSA',
      paySign: paySign
    };
  }

  /**
   * 统一下单 (v2/v3自动选择)
   */
  async unifiedOrder(params) {
    if (this.useApiV3) {
      return this.unifiedOrderV3(params);
    }
    throw new Error('微信支付v2暂未实现，请使用v3');
  }

  /**
   * 生成支付签名 (给控制器用)
   */
  generatePaySign(payResult) {
    // v3已在unifiedOrderV3中生成签名，直接返回
    return payResult.paySign;
  }

  /**
   * 解密v3回调数据
   */
  decryptV3Notify(ciphertext, associatedData, nonce) {
    const key = Buffer.from(this.apiV3Key, 'utf8');
    const iv = Buffer.from(nonce, 'utf8');
    const aad = Buffer.from(associatedData, 'utf8');
    const data = Buffer.from(ciphertext, 'base64');
    
    // 分离密文和认证标签
    const authTag = data.slice(-16);
    const encrypted = data.slice(0, -16);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    decipher.setAAD(aad);
    
    let decrypted = decipher.update(encrypted, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  /**
   * 处理v3支付回调
   */
  async handleNotify(data, headers) {
    // v3回调是加密的
    if (data.resource) {
      const { ciphertext, associated_data, nonce } = data.resource;
      const decrypted = this.decryptV3Notify(ciphertext, associated_data, nonce);
      
      return {
        transactionId: decrypted.transaction_id,
        outTradeNo: decrypted.out_trade_no,
        openid: decrypted.payer?.openid,
        totalFee: decrypted.amount?.total,
        attach: decrypted.attach,
        timeEnd: decrypted.success_time
      };
    }
    
    throw new Error('无效的回调数据');
  }

  /**
   * 生成回调响应
   */
  generateNotifyResponse(success, message) {
    return success 
      ? { code: 'SUCCESS', message: message || 'OK' }
      : { code: 'FAIL', message: message || 'FAIL' };
  }

  /**
   * 查询订单
   */
  async queryOrder(orderNo) {
    const path = `/v3/pay/transactions/out-trade-no/${orderNo}?mchid=${this.mchId}`;
    return this.sendV3Request('GET', path);
  }

  /**
   * 关闭订单
   */
  async closeOrder(orderNo) {
    const path = `/v3/pay/transactions/out-trade-no/${orderNo}/close`;
    return this.sendV3Request('POST', path, { mchid: this.mchId });
  }
}

module.exports = new WechatPayService();
