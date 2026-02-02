# 浏览历史 API 使用说明

## 接口地址

| 方法 | 路径 | 说明 |
|-----|------|------|
| POST | `/api/browse-history` | 记录浏览历史 |
| GET | `/api/browse-history` | 获取浏览历史列表 |
| DELETE | `/api/browse-history/:productCode` | 删除单条记录 |
| DELETE | `/api/browse-history` | 清空全部记录 |

---

## 何时插入浏览记录？

### ✅ 推荐：进入商品详情页时

**触发时机：** 用户点击商品卡片，进入商品详情页（`/pages/goods/details/index`）时

**示例代码：**

```javascript
// pages/goods/details/index.js
Page({
  onLoad(options) {
    const { spuId, productCode } = options;
    
    // 1. 加载商品详情
    this.loadProductDetail(spuId || productCode);
    
    // 2. 记录浏览历史（异步，不阻塞页面）
    this.recordBrowseHistory(spuId || productCode);
  },
  
  // 记录浏览历史
  async recordBrowseHistory(productCode) {
    if (!productCode) return;
    
    try {
      await wx.request({
        url: `${API_BASE}/api/browse-history`,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${token}`
        },
        data: {
          product_code: productCode
        }
      });
    } catch (error) {
      // 静默失败，不影响用户体验
      console.log('记录浏览历史失败', error);
    }
  }
});
```

---

## 请求参数

### POST `/api/browse-history`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body（以下字段任选其一）:**
```json
{
  "product_code": "NBB-25AW001B"
}
```
或
```json
{
  "productCode": "NBB-25AW001B"
}
```
或
```json
{
  "spuId": "NBB-25AW001B"
}
```

**响应:**
```json
{
  "success": true,
  "message": "已记录"
}
```

---

### GET `/api/browse-history`

**Query 参数:**
| 参数 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| page | number | 1 | 页码 |
| pageSize | number | 20 | 每页数量 |

**响应:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "product_code": "NBB-25AW001B",
        "viewed_at": "2026-02-02T07:02:27.242Z"
      }
    ],
    "total": 10
  }
}
```

---

## 注意事项

1. **需要登录：** 所有接口都需要用户已登录（携带有效 token）
2. **静默处理：** 记录浏览历史应该静默执行，失败不应提示用户
3. **去重逻辑：** 后端会自动处理重复浏览，同一商品只保留最新时间
4. **性能优化：** POST 请求是轻量级的，不会影响页面加载速度

---

## 前端调用示例（完整）

```javascript
// services/browseHistory.js
import { request } from '../utils/request';

// 记录浏览历史
export const recordBrowse = (productCode) => {
  if (!productCode) return Promise.resolve();
  
  return request({
    url: '/api/browse-history',
    method: 'POST',
    data: { product_code: productCode }
  }).catch(() => {
    // 静默失败
  });
};

// 获取浏览历史
export const getBrowseHistory = (page = 1, pageSize = 20) => {
  return request({
    url: '/api/browse-history',
    method: 'GET',
    data: { page, pageSize }
  });
};

// 删除单条浏览记录
export const deleteBrowse = (productCode) => {
  return request({
    url: `/api/browse-history/${productCode}`,
    method: 'DELETE'
  });
};

// 清空浏览历史
export const clearBrowseHistory = () => {
  return request({
    url: '/api/browse-history',
    method: 'DELETE'
  });
};
```

---

## 在商品详情页使用

```javascript
// pages/goods/details/index.js
import { recordBrowse } from '../../../services/browseHistory';

Page({
  onLoad(options) {
    const productCode = options.spuId || options.productCode || options.code;
    
    // 记录浏览历史（不等待结果）
    recordBrowse(productCode);
    
    // 继续加载商品详情...
  }
});
```
