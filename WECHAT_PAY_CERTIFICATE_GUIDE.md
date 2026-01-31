# 微信支付证书配置指南

## 📋 概述

当前系统使用的是**微信支付API v2**（MD5签名方式），**不需要证书**，只需要API密钥。

如果需要升级到**微信支付API v3**（推荐），则需要配置证书和**APIv3密钥**。

---

## 🔑 快速参考：APIv3密钥设置

**什么是APIv3密钥？**
- APIv3密钥是32位字符串，用于API v3加密敏感数据
- 与API密钥（用于API v2）不同，APIv3密钥专门用于API v3

**如何设置？**
1. 登录 [微信商户平台](https://pay.weixin.qq.com)
2. 进入：**账户中心** → **API安全** → **APIv3密钥**
3. 点击"设置APIv3密钥"
4. 输入32位密钥（建议使用随机生成）
5. 在`.env`文件中配置：`WX_API_V3_KEY=your_api_v3_key_32_chars`

**生成随机密钥：**
```bash
openssl rand -hex 16
```

**详细步骤请查看下方"设置APIv3密钥"章节。**

---

## 🔧 当前实现：API v2（无需证书）

### 配置要求

当前实现只需要以下配置，**不需要证书**：

```bash
# .env 文件配置
WX_APPID=your_miniprogram_appid          # 小程序AppID
WX_MCH_ID=your_merchant_id               # 商户号
WX_API_KEY=your_api_key_32_chars         # API密钥（32位字符串）
WX_PAY_NOTIFY_URL=https://your-domain.com/api/payment/notify  # 支付回调地址
BASE_URL=https://your-domain.com         # 服务器基础URL
```

### 获取API密钥

1. 登录 [微信商户平台](https://pay.weixin.qq.com)
2. 进入：**账户中心** → **API安全** → **API密钥**
3. 设置32位API密钥（如果已设置，可以查看或重置）

### 配置步骤

1. **设置API密钥**
   - 在商户平台设置32位API密钥
   - 妥善保管，不要泄露

2. **配置环境变量**
   ```bash
   # 编辑 .env 文件
   nano /nbbb/.env
   
   # 添加以下配置
   WX_APPID=wx1234567890abcdef
   WX_MCH_ID=1234567890
   WX_API_KEY=abcdef1234567890abcdef1234567890
   WX_PAY_NOTIFY_URL=https://not-boringboreboi.com/api/payment/notify
   BASE_URL=https://not-boringboreboi.com
   ```

3. **配置支付回调地址**
   - 登录微信商户平台
   - 进入：**产品中心** → **开发配置** → **支付配置**
   - 设置支付回调URL：`https://not-boringboreboi.com/api/payment/notify`
   - 注意：必须是HTTPS，且外网可访问

4. **重启服务**
   ```bash
   pkill -f "node.*server.js"
   node backend/server.js
   ```

---

## 🚀 升级到API v3（需要证书）

### API v3的优势

- ✅ 更安全的签名算法（RSA-SHA256）
- ✅ 支持更多新功能
- ✅ 更好的错误处理
- ✅ 微信官方推荐

### 证书获取步骤

#### 1. 下载证书工具

1. 登录 [微信商户平台](https://pay.weixin.qq.com)
2. 进入：**账户中心** → **API安全** → **API证书**
3. 点击"申请API证书"
4. 下载并安装证书生成工具（Windows/Mac/Linux）

#### 2. 生成证书

1. **运行证书工具**
   - 打开下载的证书工具
   - 选择"生成证书请求串"

2. **提交证书请求串**
   - 复制生成的证书请求串
   - 在商户平台提交证书请求串
   - 获取证书串

3. **生成证书文件**
   - 将证书串粘贴回证书工具
   - 生成证书文件（`.p12`格式）
   - 设置证书密码（记住此密码）

#### 3. 转换证书格式

微信支付API v3需要`.pem`格式的证书：

```bash
# 将 .p12 转换为 .pem（需要证书密码）
openssl pkcs12 -in apiclient_cert.p12 -out apiclient_cert.pem -nodes -clcerts
openssl pkcs12 -in apiclient_cert.p12 -out apiclient_key.pem -nodes -nocerts

# 或者使用密码（如果设置了密码）
openssl pkcs12 -in apiclient_cert.p12 -out apiclient_cert.pem -clcerts -passin pass:证书密码
openssl pkcs12 -in apiclient_cert.p12 -out apiclient_key.pem -nocerts -passin pass:证书密码
```

#### 4. 设置APIv3密钥

**APIv3密钥**是用于API v3的加密密钥，主要用于：
- 🔐 加密回调通知中的敏感数据（如用户手机号、身份证号等）
- 🔓 解密微信返回的敏感信息
- 🔒 保护数据传输安全

**设置步骤：**

1. **登录微信商户平台**
   - 访问：https://pay.weixin.qq.com
   - 使用商户号登录

2. **进入API安全设置**
   - 点击：**账户中心** → **API安全** → **APIv3密钥**
   - 如果未设置，会显示"设置APIv3密钥"按钮

3. **设置密钥**
   - 点击"设置APIv3密钥"或"修改APIv3密钥"
   - **输入32位密钥**（必须是32位字符串，只能包含字母和数字）
   - 例如：`a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
   - 点击"确认"保存

4. **重要提示**
   - ⚠️ **密钥设置后无法查看**，只能重置
   - ⚠️ 请妥善保管密钥，建议记录在安全的地方
   - ⚠️ 如果忘记密钥，需要重新设置（会影响正在使用该密钥的接口）
   - ✅ 密钥必须是32位，建议使用随机生成的字符串

5. **生成随机密钥（推荐）**
   
   可以使用以下方法生成32位随机密钥：
   
   ```bash
   # 方法1：使用openssl生成（推荐）
   openssl rand -hex 16
   # 输出示例：a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
   
   # 方法2：使用Node.js生成
   node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
   
   # 方法3：使用Python生成
   python3 -c "import secrets; print(secrets.token_hex(16))"
   ```

6. **配置到环境变量**
   
   设置好APIv3密钥后，需要在`.env`文件中配置：
   
   ```bash
   # 编辑 .env 文件
   nano /nbbb/.env
   
   # 添加APIv3密钥配置
   WX_API_V3_KEY=your_api_v3_key_32_chars  # 替换为你在商户平台设置的32位密钥
   ```

#### 5. 下载平台证书

API v3还需要微信平台的公钥证书：

1. 登录商户平台
2. 进入：**账户中心** → **API安全** → **API证书**
3. 下载"微信支付平台证书"（用于验证微信回调）

---

## 📁 证书文件结构

```
/nbbb/
├── backend/
│   └── certs/                    # 证书目录（需要创建）
│       ├── apiclient_cert.pem    # 商户证书（从.p12转换）
│       ├── apiclient_key.pem     # 商户私钥（从.p12转换）
│       └── wechatpay_cert.pem    # 微信平台证书（可选，用于验证回调）
└── .env                          # 环境变量配置
```

### 创建证书目录

```bash
mkdir -p /nbbb/backend/certs
chmod 700 /nbbb/backend/certs  # 设置权限，保护证书
```

---

## 🔐 环境变量配置（API v3）

如果升级到API v3，需要在`.env`中添加证书路径：

```bash
# 微信支付配置（API v2 - 当前）
WX_APPID=your_miniprogram_appid
WX_MCH_ID=your_merchant_id
WX_API_KEY=your_api_key_32_chars

# 微信支付配置（API v3 - 升级后）
WX_PAY_API_V3=true                                    # 启用API v3
WX_API_V3_KEY=your_api_v3_key_32_chars              # APIv3密钥（32位字符串，用于加密敏感数据）
WX_PAY_CERT_PATH=/nbbb/backend/certs/apiclient_cert.pem  # 商户证书路径
WX_PAY_KEY_PATH=/nbbb/backend/certs/apiclient_key.pem    # 商户私钥路径
WX_PAY_SERIAL_NO=your_cert_serial_no                 # 证书序列号（从证书中获取）
WX_PAY_PLATFORM_CERT_PATH=/nbbb/backend/certs/wechatpay_cert.pem  # 平台证书路径（可选）
```

---

## 🛠️ 代码实现（API v3示例）

如果需要升级到API v3，可以参考以下实现：

### 1. 安装依赖

```bash
npm install node-forge  # 用于RSA签名
```

### 2. API v3签名示例

```javascript
const forge = require('node-forge');
const fs = require('fs');

class WechatPayV3 {
  constructor() {
    this.appId = process.env.WX_APPID;
    this.mchId = process.env.WX_MCH_ID;
    this.certPath = process.env.WX_PAY_CERT_PATH;
    this.keyPath = process.env.WX_PAY_KEY_PATH;
    this.serialNo = process.env.WX_PAY_SERIAL_NO;
    
    // 加载证书
    this.privateKey = fs.readFileSync(this.keyPath, 'utf8');
  }

  /**
   * 生成API v3签名
   */
  generateSignature(method, url, timestamp, nonce, body) {
    const signStr = `${method}\n${url}\n${timestamp}\n${nonce}\n${body}\n`;
    
    // 使用RSA-SHA256签名
    const privateKey = forge.pki.privateKeyFromPem(this.privateKey);
    const md = forge.md.sha256.create();
    md.update(signStr, 'utf8');
    const signature = forge.util.encode64(privateKey.sign(md));
    
    return signature;
  }

  /**
   * 构建Authorization头
   */
  buildAuthorization(method, url, body) {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = this.generateNonceStr();
    const signature = this.generateSignature(method, url, timestamp, nonce, body);
    
    return `WECHATPAY2-SHA256-RSA2048 mchid="${this.mchId}",serial_no="${this.serialNo}",nonce_str="${nonce}",timestamp="${timestamp}",signature="${signature}"`;
  }
}
```

---

## ⚠️ 安全注意事项

### 1. 证书文件安全

```bash
# 设置证书文件权限（仅所有者可读）
chmod 600 /nbbb/backend/certs/*.pem

# 不要将证书提交到Git仓库
echo "/nbbb/backend/certs/*.pem" >> .gitignore
```

### 2. 环境变量安全

- ✅ 使用`.env`文件存储敏感信息
- ✅ 不要将`.env`提交到Git仓库
- ✅ 生产环境使用环境变量或密钥管理服务

### 3. API密钥安全

- ✅ API密钥（API v2）必须32位
- ✅ APIv3密钥（API v3）必须32位
- ✅ 定期更换API密钥
- ✅ 不要在代码中硬编码密钥
- ✅ 密钥设置后无法查看，请妥善保管
- ✅ 建议使用随机生成的密钥，不要使用简单密码

---

## 📊 当前状态检查

### 检查当前配置

```bash
# 检查环境变量
grep -E "WX_|MCH|API_KEY" /nbbb/.env

# 检查证书目录（如果使用API v3）
ls -la /nbbb/backend/certs/
```

### 测试支付配置

```bash
# 检查服务是否正常启动
curl http://localhost:3000/api/payment/status/1

# 查看日志
tail -f /path/to/logs/payment.log
```

---

## 🔄 迁移建议

### 从API v2迁移到API v3

1. **保持API v2运行**（当前实现）
2. **并行实现API v3**（新功能）
3. **逐步迁移**（测试通过后切换）
4. **保留API v2**（作为备用）

### 兼容性处理

可以在代码中同时支持API v2和API v3：

```javascript
if (process.env.WX_PAY_API_V3 === 'true') {
  // 使用API v3
  return await this.unifiedOrderV3(params);
} else {
  // 使用API v2（当前实现）
  return await this.unifiedOrder(params);
}
```

---

## 📞 技术支持

- **微信支付官方文档**：https://pay.weixin.qq.com/wiki/doc/apiv3/index.shtml
- **API v2文档**：https://pay.weixin.qq.com/wiki/doc/api/jsapi.php?chapter=9_1
- **API v3文档**：https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_5_1.shtml
- **证书工具下载**：https://pay.weixin.qq.com/wiki/doc/apiv3/wechatpay/wechatpay3_1.shtml

---

## ✅ 总结

### 当前实现（API v2）
- ✅ **不需要证书**，只需要API密钥
- ✅ 配置简单，易于使用
- ✅ 已实现并测试通过

### 升级到API v3（可选）
- ⚠️ **需要证书**（.pem格式）
- ⚠️ 需要修改代码实现
- ✅ 更安全，功能更丰富

**建议**：如果当前API v2满足需求，可以继续使用。如需新功能或更高安全性，再考虑升级到API v3。

