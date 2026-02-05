const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

/**
 * 聚水潭 API 客户端
 * 支持自动刷新 Token
 */
class JushuitanClient {
  constructor(options = {}) {
    this.appKey = options.partnerId || process.env.JST_PARTNER_ID || "";
    this.appSecret = options.appSecret || process.env.JST_APP_SECRET || "ab1f495da5e34053a64db4e2c23432b0";
    this.gateway = options.gateway || process.env.JST_GATEWAY || "https://openapi.jushuitan.com/openWeb.do";
    this.timeoutMs = options.timeoutMs || 15000;
    
    // Token 存储文件路径
    this.tokenFilePath = path.join(__dirname, "../.jst_token.json");
    
    // Token 缓存
    this.tokenCache = null;
    
    // 刷新锁，防止并发刷新
    this.refreshing = false;
    this.refreshPromise = null;
    
    // 初始化时加载 token
    this._loadToken();
    
    if (!this.appKey) {
      console.warn("[JST] Missing JST_PARTNER_ID. Requests will fail.");
    }
  }

  /**
   * 从文件加载 Token
   */
  _loadToken() {
    try {
      if (fs.existsSync(this.tokenFilePath)) {
        const data = JSON.parse(fs.readFileSync(this.tokenFilePath, "utf8"));
        this.tokenCache = data;
        console.log(`[JST] Token 已加载，过期时间: ${new Date(data.expires_at).toLocaleString()}`);
      } else {
        // 从环境变量初始化
        const accessToken = process.env.JST_PARTNER_KEY;
        const refreshToken = process.env.JST_REFRESH_TOKEN;
        if (accessToken) {
          this.tokenCache = {
            access_token: accessToken,
            refresh_token: refreshToken || "",
            expires_at: Date.now() + 29 * 24 * 60 * 60 * 1000, // 假设还有29天
            updated_at: Date.now()
          };
          this._saveToken();
          console.log("[JST] Token 从环境变量初始化");
        }
      }
    } catch (error) {
      console.error("[JST] 加载 Token 失败:", error.message);
    }
  }

  /**
   * 保存 Token 到文件
   */
  _saveToken() {
    try {
      fs.writeFileSync(this.tokenFilePath, JSON.stringify(this.tokenCache, null, 2));
      console.log("[JST] Token 已保存到文件");
    } catch (error) {
      console.error("[JST] 保存 Token 失败:", error.message);
    }
  }

  /**
   * 生成签名
   */
  generateSign(params) {
    const toSign = Object.keys(params)
      .filter(k => k !== "sign" && params[k] !== undefined && params[k] !== null)
      .sort()
      .map(k => `${k}${typeof params[k] === "object" ? JSON.stringify(params[k]) : String(params[k])}`)
      .join("");
    const raw = `${this.appSecret}${toSign}`;
    return crypto.createHash("md5").update(raw, "utf8").digest("hex").toLowerCase();
  }

  /**
   * 生成随机 6 位字符串
   */
  _generateRandomCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 获取初始 Token（用于首次授权或 Token 完全过期）
   */
  async getInitToken() {
    console.log("[JST] 正在获取初始 Token...");
    
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const code = this._generateRandomCode();
    
    const params = {
      app_key: this.appKey,
      timestamp,
      grant_type: "authorization_code",
      charset: "utf-8",
      code
    };
    params.sign = this.generateSign(params);

    try {
      const resp = await axios.post(
        "https://openapi.jushuitan.com/openWeb/auth/getInitToken",
        new URLSearchParams(params).toString(),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: this.timeoutMs
        }
      );

      if (resp.data.code === 0 && resp.data.data) {
        const { access_token, refresh_token, expires_in } = resp.data.data;
        this.tokenCache = {
          access_token,
          refresh_token,
          expires_at: Date.now() + expires_in * 1000,
          updated_at: Date.now()
        };
        this._saveToken();
        console.log(`[JST] 初始 Token 获取成功，有效期: ${Math.floor(expires_in / 86400)} 天`);
        return this.tokenCache;
      } else {
        throw new Error(`获取初始 Token 失败: ${resp.data.msg || JSON.stringify(resp.data)}`);
      }
    } catch (error) {
      console.error("[JST] 获取初始 Token 失败:", error.message);
      throw error;
    }
  }

  /**
   * 刷新 Token
   */
  async refreshToken() {
    if (!this.tokenCache?.refresh_token) {
      console.log("[JST] 没有 refresh_token，尝试获取初始 Token");
      return this.getInitToken();
    }

    console.log("[JST] 正在刷新 Token...");
    
    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    const params = {
      app_key: this.appKey,
      timestamp,
      grant_type: "refresh_token",
      charset: "utf-8",
      refresh_token: this.tokenCache.refresh_token,
      scope: "all"
    };
    params.sign = this.generateSign(params);

    try {
      const resp = await axios.post(
        "https://openapi.jushuitan.com/openWeb/auth/refreshToken",
        new URLSearchParams(params).toString(),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: this.timeoutMs
        }
      );

      if (resp.data.code === 0 && resp.data.data) {
        const { access_token, refresh_token, expires_in } = resp.data.data;
        this.tokenCache = {
          access_token,
          refresh_token,
          expires_at: Date.now() + expires_in * 1000,
          updated_at: Date.now()
        };
        this._saveToken();
        console.log(`[JST] Token 刷新成功，有效期: ${Math.floor(expires_in / 86400)} 天`);
        return this.tokenCache;
      } else {
        // 刷新失败，可能是 refresh_token 也过期了，尝试重新获取
        console.warn(`[JST] Token 刷新失败: ${resp.data.msg}，尝试重新获取初始 Token`);
        return this.getInitToken();
      }
    } catch (error) {
      console.error("[JST] Token 刷新失败:", error.message);
      // 尝试重新获取初始 Token
      return this.getInitToken();
    }
  }

  /**
   * 确保 Token 有效
   * 如果 Token 即将过期（24小时内），自动刷新
   */
  async ensureValidToken() {
    // 如果正在刷新，等待刷新完成
    if (this.refreshing) {
      return this.refreshPromise;
    }

    const now = Date.now();
    const expiresAt = this.tokenCache?.expires_at || 0;
    const timeToExpiry = expiresAt - now;
    
    // 如果 Token 已过期或即将在 24 小时内过期
    // 聚水潭要求：过期前12小时内调用刷新才有效，15天内刷新无效
    // 我们在过期前 24 小时开始尝试刷新，确保有足够时间
    const REFRESH_THRESHOLD = 24 * 60 * 60 * 1000; // 24小时
    
    if (timeToExpiry < REFRESH_THRESHOLD) {
      this.refreshing = true;
      
      try {
        if (timeToExpiry <= 0) {
          // Token 已完全过期，需要重新获取
          console.log("[JST] Token 已过期，重新获取...");
          this.refreshPromise = this.getInitToken();
        } else {
          // Token 即将过期，刷新
          console.log(`[JST] Token 将在 ${Math.floor(timeToExpiry / 3600000)} 小时后过期，开始刷新...`);
          this.refreshPromise = this.refreshToken();
        }
        
        await this.refreshPromise;
      } finally {
        this.refreshing = false;
        this.refreshPromise = null;
      }
    }

    return this.tokenCache?.access_token;
  }

  /**
   * 调用聚水潭 API
   */
  async call(method, biz = {}, extraParams = {}, customGateway = null) {
    // 确保 Token 有效
    const accessToken = await this.ensureValidToken();
    
    if (!accessToken) {
      throw new Error("[JST] 无法获取有效的 access_token");
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const baseParams = {
      app_key: this.appKey,
      access_token: accessToken,
      timestamp,
      charset: "utf-8",
      version: "2",
      biz: typeof biz === "string" ? biz : JSON.stringify(biz || {})
    };

    const params = { ...baseParams, ...extraParams };
    params.sign = this.generateSign(params);

    const config = {
      url: customGateway || this.gateway,
      method: "post",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: this.timeoutMs,
      data: new URLSearchParams(params).toString()
    };

    const startTime = Date.now();
    try {
      const resp = await axios(config);
      const duration = Date.now() - startTime;
      
      // 记录日志
      const bizObj = typeof biz === "string" ? JSON.parse(biz) : biz;
      const productIds = Array.isArray(bizObj.i_ids) ? bizObj.i_ids.join(",") : (bizObj.i_ids || "N/A");
      const dataCount = resp.data?.data?.datas?.length || resp.data?.data?.inventorys?.length || 0;
      console.log(`[JST] ${customGateway || this.gateway} | ${duration}ms | 商品: ${productIds} | 结果: ${resp.data?.code === 0 ? "成功" : "失败"} | 数据条数: ${dataCount}`);
      
      // 检查是否是 Token 过期错误
      if (resp.data?.code === 100 && resp.data?.msg?.includes("access_token")) {
        console.error("[JST] Token 无效，尝试刷新后重试...");
        // 强制刷新 Token
        this.tokenCache.expires_at = 0;
        await this.ensureValidToken();
        // 递归重试一次
        return this.call(method, biz, extraParams, customGateway);
      }
      
      if (resp.status !== 200) {
        throw new Error(`JST HTTP ${resp.status}`);
      }
      
      return resp.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      const bizObj = typeof biz === "string" ? JSON.parse(biz) : biz;
      const productIds = Array.isArray(bizObj.i_ids) ? bizObj.i_ids.join(",") : (bizObj.i_ids || "N/A");
      console.error(`[JST] 请求失败 | ${duration}ms | 商品: ${productIds} | 错误: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取当前 Token 状态
   */
  getTokenStatus() {
    if (!this.tokenCache) {
      return { valid: false, message: "未初始化" };
    }
    
    const now = Date.now();
    const expiresAt = this.tokenCache.expires_at;
    const timeToExpiry = expiresAt - now;
    
    if (timeToExpiry <= 0) {
      return { valid: false, message: "已过期", expires_at: new Date(expiresAt) };
    }
    
    const daysLeft = Math.floor(timeToExpiry / (24 * 60 * 60 * 1000));
    const hoursLeft = Math.floor((timeToExpiry % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    return {
      valid: true,
      message: `有效，剩余 ${daysLeft} 天 ${hoursLeft} 小时`,
      expires_at: new Date(expiresAt),
      days_left: daysLeft,
      hours_left: hoursLeft
    };
  }
}

// 创建单例
const client = new JushuitanClient();

// 启动时检查 Token 状态
const status = client.getTokenStatus();
console.log(`[JST] Token 状态: ${status.message}`);

module.exports = client;
