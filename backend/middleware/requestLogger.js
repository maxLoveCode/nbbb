const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";
  
  console.log("[" + timestamp + "] " + method + " " + url + " - IP: " + ip + " - UA: " + userAgent);
  
  // 记录请求体（仅对POST/PUT请求）
  if (["POST", "PUT", "PATCH"].includes(method) && req.body && Object.keys(req.body).length > 0) {
    console.log("[" + timestamp + "] Request Body:", JSON.stringify(req.body, null, 2));
  }
  
  // 记录响应（特别是登录接口的响应，用于追踪错误码）
  const originalJson = res.json;
  res.json = function(body) {
    // 记录登录接口的响应，特别是错误响应
    if (url.includes('/auth/wechat/login') || url.includes('/auth/')) {
      const responseTimestamp = new Date().toISOString();
      const responseBody = typeof body === 'string' ? JSON.parse(body) : body;
      console.log("[" + responseTimestamp + "] Response [" + method + " " + url + "]:", JSON.stringify({
        code: responseBody.code,
        message: responseBody.message,
        hasData: !!responseBody.data
      }));
    }
    return originalJson.call(this, body);
  };
  
  next();
};

module.exports = requestLogger;
