const express = require("express");
const router = express.Router();
const jst = require("../services/jushuitanClient");
const { convertImageUrls } = require("../utils/imageUrlConverter");

// 统一错误处理包装
async function safeCall(res, method, biz, extra, gateway) {
  try {
    const data = await jst.call(method, biz, extra, gateway);
    // 转换图片URL（HTTP -> HTTPS）
    const convertedData = convertImageUrls(data, { forceHttps: true });
    res.json({ success: true, data: convertedData });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[JST] call error", method, err.message);
    res.status(502).json({ success: false, message: err.message });
  }
}

// 订单查询（示例：按时间范围分页）
router.post("/orders/search", async (req, res) => {
  const { so_id, shop_id, date_start, date_end, page_index = 1, page_size = 50 } = req.body || {};
  const biz = {
    page_index,
    page_size,
    so_id,
    shop_id,
    date_start,
    date_end
  };
  await safeCall(res, "jushuitan.order.query", biz, {}, "https://openapi.jushuitan.com/open/orders/query");
});

// 商品查询（示例：按商品编码、条码）
router.post("/products/search", async (req, res) => {
  const { item_code, barcode, page_index = 1, page_size = 50 } = req.body || {};
  const biz = { 
    page_index, 
    page_size, 
    item_code, 
    barcode 
  };
  await safeCall(res, "jushuitan.item.query", biz, {}, "https://openapi.jushuitan.com/open/items/query");
});

// 库存查询（按商品编码、款式编码、时间范围等）
router.post("/inventory/search", async (req, res) => {
  const { 
    wms_co_id,
    page_index = 1, 
    page_size = 30,
    modified_begin,
    modified_end,
    sku_ids,  // 商品编码（多个用逗号分隔）
    i_ids,    // 款式编码（多个用逗号分隔）
    has_lock_qty,
    names,    // 商品名称（多个用逗号分隔）
    ts        // 时间戳，防漏单
  } = req.body || {};
  
  const biz = { 
    page_index, 
    page_size
  };
  
  // 添加可选参数
  if (wms_co_id !== undefined) biz.wms_co_id = wms_co_id;
  if (modified_begin) biz.modified_begin = modified_begin;
  if (modified_end) biz.modified_end = modified_end;
  if (sku_ids) biz.sku_ids = Array.isArray(sku_ids) ? sku_ids.join(',') : sku_ids;
  if (i_ids) biz.i_ids = Array.isArray(i_ids) ? i_ids.join(',') : i_ids;
  if (has_lock_qty !== undefined) biz.has_lock_qty = has_lock_qty;
  if (names) biz.names = Array.isArray(names) ? names.join(',') : names;
  if (ts !== undefined) biz.ts = ts;
  
  await safeCall(res, "jushuitan.inventory.query", biz, {}, "https://openapi.jushuitan.com/open/inventory/query");
});

// 店铺查询（测试接口）
router.post("/shops/search", async (req, res) => {
  const { page_index = 1, page_size = 50 } = req.body || {};
  const biz = { 
    page_index, 
    page_size
  };
  await safeCall(res, "jushuitan.shop.query", biz, {}, "https://openapi.jushuitan.com/open/shops/query");
});

// 类目查询
router.post("/categories/search", async (req, res) => {
  const { page_index = 1, page_size = 50 } = req.body || {};
  const biz = { 
    page_index, 
    page_size
  };
  await safeCall(res, "jushuitan.category.query", biz, {}, "https://openapi.jushuitan.com/open/category/query");
});

// 单个商品查询
router.post("/item/query", async (req, res) => {
  const { 
    modified_begin, 
    modified_end, 
    only_item, 
    i_ids, 
    page_index = 1, 
    page_size = 30, 
    item_flds, 
    itemsku_flds, 
    date_field = "modified" 
  } = req.body || {};
  
  const biz = {
    modified_begin,
    modified_end,
    only_item,
    i_ids,
    page_index,
    page_size,
    item_flds,
    itemsku_flds,
    date_field
  };
  
  // 过滤掉 undefined 和 null 值
  const filteredBiz = Object.fromEntries(
    Object.entries(biz).filter(([_, value]) => value !== undefined && value !== null)
  );
  
  await safeCall(res, "jushuitan.item.query", filteredBiz, {}, "https://openapi.jushuitan.com/open/mall/item/query");
});

// ==================== Token 管理接口 ====================

/**
 * 获取 Token 状态
 * GET /api/jst/token/status
 */
router.get("/token/status", (req, res) => {
  try {
    const status = jst.getTokenStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 手动刷新 Token
 * POST /api/jst/token/refresh
 */
router.post("/token/refresh", async (req, res) => {
  try {
    const result = await jst.refreshToken();
    res.json({
      success: true,
      message: "Token 刷新成功",
      data: {
        expires_at: new Date(result.expires_at).toISOString(),
        updated_at: new Date(result.updated_at).toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Token 刷新失败: " + error.message
    });
  }
});

/**
 * 重新获取初始 Token（用于 Token 完全过期的情况）
 * POST /api/jst/token/init
 */
router.post("/token/init", async (req, res) => {
  try {
    const result = await jst.getInitToken();
    res.json({
      success: true,
      message: "初始 Token 获取成功",
      data: {
        expires_at: new Date(result.expires_at).toISOString(),
        updated_at: new Date(result.updated_at).toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "获取初始 Token 失败: " + error.message
    });
  }
});

module.exports = router;


