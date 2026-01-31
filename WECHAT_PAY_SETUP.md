# 微信支付接入指南

## 📋 概述

本文档说明如何配置和使用微信小程序支付功能。

## 🔧 环境配置

### 1. 微信商户平台配置

1. **申请微信支付商户号**
   - 登录微信商户平台：https://pay.weixin.qq.com
   - 完成商户认证和资料审核

2. **获取支付配置信息**
   - 商户号（MCH_ID）
   - API密钥（API_KEY）：在商户平台 → API安全 → API密钥中设置
   - 小程序AppID：在微信公众平台获取

3. **配置支付回调地址**
   - 登录微信商户平台
   - 进入：产品中心 → 开发配置 → 支付配置
   - 设置支付回调URL：`https://your-domain.com/api/payment/notify`
   - 注意：回调URL必须是HTTPS，且需要外网可访问

### 2. 服务器环境变量配置

在 `.env` 文件中添加以下配置：

```bash
# 微信小程序配置（已有）
WX_APPID=your_miniprogram_appid
WX_SECRET=your_miniprogram_secret

# 微信支付配置（新增）
WX_MCH_ID=your_merchant_id          # 商户号
WX_API_KEY=your_api_key             # API密钥（32位字符串）
WX_PAY_NOTIFY_URL=https://your-domain.com/api/payment/notify  # 支付回调地址（可选，默认自动生成）

# 服务器基础URL（用于生成回调地址）
BASE_URL=https://your-domain.com    # 服务器基础URL
```

### 3. 安装依赖

已自动安装 `xml2js` 依赖，用于处理微信支付回调的XML数据。

## 📱 小程序端调用流程

### 1. 创建订单

```javascript
// 1. 用户提交订单
wx.request({
  url: 'https://your-domain.com/api/orders',
  method: 'POST',
  header: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  data: {
    cart_item_ids: [1, 2, 3],
    shop_id: 12345,
    receiver_info: {
      receiver_name: '张三',
      receiver_address: '北京市朝阳区xxx街道xxx号',
      receiver_mobile: '13800138000'
    }
  },
  success: (res) => {
    if (res.data.code === 0) {
      const orderId = res.data.data.order_id;
      // 2. 创建支付订单
      createPayment(orderId);
    }
  }
});
```

### 2. 创建支付订单

```javascript
function createPayment(orderId) {
  wx.request({
    url: 'https://your-domain.com/api/payment/create',
    method: 'POST',
    header: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    data: {
      order_id: orderId
    },
    success: (res) => {
      if (res.data.code === 0) {
        const payment = res.data.data.payment;
        // 3. 调用微信支付
        wx.requestPayment({
          timeStamp: payment.timeStamp,
          nonceStr: payment.nonceStr,
          package: payment.package,
          signType: payment.signType,
          paySign: payment.paySign,
          success: (payRes) => {
            console.log('支付成功', payRes);
            // 4. 查询支付状态（可选）
            checkPaymentStatus(orderId);
          },
          fail: (err) => {
            console.log('支付失败', err);
          }
        });
      }
    }
  });
}
```

### 3. 查询支付状态（可选）

```javascript
function checkPaymentStatus(orderId) {
  wx.request({
    url: `https://your-domain.com/api/payment/status/${orderId}`,
    method: 'GET',
    header: {
      'Authorization': `Bearer ${token}`
    },
    success: (res) => {
      if (res.data.code === 0) {
        const { paid, payment, order_status } = res.data.data;
        if (paid) {
          console.log('订单已支付', payment);
          // 跳转到订单详情页
        } else {
          console.log('订单未支付');
        }
      }
    }
  });
}
```

## 🔄 支付流程说明

1. **用户下单** → 调用 `/api/orders` 创建订单
2. **创建支付** → 调用 `/api/payment/create` 获取支付参数
3. **调用支付** → 小程序调用 `wx.requestPayment` 发起支付
4. **支付回调** → 微信服务器调用 `/api/payment/notify` 更新订单状态
5. **状态查询** → （可选）调用 `/api/payment/status/:order_id` 查询支付状态

## 🔒 安全说明

1. **签名验证**：所有支付回调都会验证微信签名，确保数据安全
2. **订单验证**：支付回调会验证订单是否存在，防止重复支付
3. **状态更新**：支付成功后自动更新订单状态为"等待卖家发货"
4. **支付记录**：自动创建支付记录，保存交易号等信息

## 📊 数据库更新

支付成功后会自动更新以下数据：

1. **orders表**
   - `shop_status` → `WAIT_SELLER_SEND_GOODS`（等待卖家发货）
   - `updated_at` → 当前时间

2. **order_payments表**
   - 创建新的支付记录
   - 保存微信交易号、支付金额、支付时间等信息

## ⚠️ 注意事项

1. **回调地址**：必须在微信商户平台配置正确的回调地址，且必须是HTTPS
2. **API密钥**：API密钥必须妥善保管，不要泄露
3. **金额单位**：支付金额单位为"分"，订单金额单位为"元"，系统会自动转换
4. **订单状态**：只有状态为`WAIT_BUYER_PAY`的订单才能创建支付
5. **重复支付**：系统会检查订单是否已支付，防止重复支付
6. **回调超时**：如果回调失败，可以通过查询接口主动同步支付状态

## 🐛 常见问题

### 1. 支付回调失败

**问题**：支付成功但订单状态未更新

**解决方案**：
- 检查回调地址是否正确配置
- 检查服务器是否能接收微信服务器的请求
- 检查签名验证是否通过
- 使用查询接口主动同步支付状态

### 2. 签名验证失败

**问题**：统一下单或回调时签名验证失败

**解决方案**：
- 检查API密钥是否正确
- 检查签名算法是否正确
- 检查参数是否完整

### 3. 支付金额错误

**问题**：支付金额与订单金额不一致

**解决方案**：
- 检查金额单位转换（元转分）
- 检查订单金额计算是否正确

## 📞 技术支持

如有问题，请联系开发团队或查看微信支付官方文档：
- 微信支付开发文档：https://pay.weixin.qq.com/wiki/doc/apiv3/index.shtml
- 小程序支付文档：https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_5_1.shtml

