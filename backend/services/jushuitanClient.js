const axios = require("axios");
const crypto = require("crypto");

class JushuitanClient {
  constructor(options = {}) {
    this.partnerId = options.partnerId || process.env.JST_PARTNER_ID || "";
    this.partnerKey = options.partnerKey || process.env.JST_PARTNER_KEY || "";
    this.gateway = options.gateway || process.env.JST_GATEWAY || "https://openapi.jushuitan.com/openWeb.do";
    // 如果gateway不包含路径，自动添加
    if (this.gateway && !this.gateway.includes('/openWeb.do') && !this.gateway.includes('/')) {
      this.gateway = `${this.gateway}/openWeb.do`;
    }
    this.timeoutMs = options.timeoutMs || 15000;
    if (!this.partnerId || !this.partnerKey) {
      // Fail fast to surface misconfiguration
      // eslint-disable-next-line no-console
      console.warn("[JST] Missing JST_PARTNER_ID or JST_PARTNER_KEY. Requests will fail.");
    }
  }

  // Basic MD5 sign helper: sort params (excluding sign), concat as key+value, prepend appSecret, md5 lowercase
  generateSign(params) {
    const appSecret = "ab1f495da5e34053a64db4e2c23432b0"; // 使用原始的 appSecret
    const toSign = Object.keys(params)
      .filter(k => k !== "sign" && params[k] !== undefined && params[k] !== null)
      .sort()
      .map(k => `${k}${typeof params[k] === "object" ? JSON.stringify(params[k]) : String(params[k])}`)
      .join("");
    const raw = `${appSecret}${toSign}`;
    return crypto.createHash("md5").update(raw, "utf8").digest("hex").toLowerCase();
  }

  async call(method, biz = {}, extraParams = {}, customGateway = null) {
    const timestamp = Math.floor(Date.now() / 1000); // UNIX timestamp in seconds
    const baseParams = {
      app_key: this.partnerId,
      access_token: this.partnerKey, // Using partnerKey as access_token for now
      timestamp,
      charset: "utf-8",
      version: "2",
      // Jushuitan expects biz content as JSON string in "biz" field
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

    const resp = await axios(config);
    if (resp.status !== 200) {
      throw new Error(`JST HTTP ${resp.status}`);
    }
    return resp.data;
  }
}

module.exports = new JushuitanClient();
