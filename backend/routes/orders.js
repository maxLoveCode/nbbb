const express = require('express');
const router = express.Router();
const orderService = require('../services/orderService');
const auth = require('../middleware/auth');
const { Pool } = require('pg');
const jushuitanClient = require('../services/jushuitanClient');
const productService = require('../services/productService');
const pricingService = require('../services/pricingService');

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "ecommerce",
  user: "admin",
  password: "AxiaNBBB123"
});

/**
 * 生成订单号
 * 格式：YYYYMMDDHHmmss + 4位随机数
 */
function generateOrderNo() {
  const now = new Date();
  const dateStr = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0') +
    now.getSeconds().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return dateStr + random;
}

function parseJstItems(result) {
  if (!result) return [];
  return result.data?.datas
    || result.data?.data?.datas
    || result.data?.items
    || result.items
    || result.datas
    || [];
}

async function resolveOrderItemsPricing(items, userId) {
  const pricingProfile = await pricingService.getPricingProfile(userId);
  const productCodes = [...new Set(
    (items || [])
      .map((item) => item.product_code || item.spuId || item.goodsCode || item.i_id || '')
      .filter(Boolean)
  )];
  const extrasMap = await productService.getProductExtrasMap(productCodes);
  const normalizedItems = [];

  for (const rawItem of items || []) {
    const productCode = rawItem.product_code || rawItem.spuId || rawItem.goodsCode || rawItem.i_id || '';
    const skuId = rawItem.sku_id || rawItem.skuId || null;
    const quantity = Number(rawItem.quantity || rawItem.num || 1) || 1;
    let name = rawItem.name || rawItem.goodsName || rawItem.title || productCode;
    let image = rawItem.image || rawItem.pic || rawItem.thumb || null;
    let spec = rawItem.properties || rawItem.spec || rawItem.skuSpecLst?.map((s) => s.specValue).join(' ') || null;
    let price = 0;

    if (productCode) {
      try {
        const result = await jushuitanClient.call(
          "jushuitan.item.query",
          {
            i_ids: [productCode],
            page_index: 1,
            page_size: 1
          },
          {},
          "https://openapi.jushuitan.com/open/mall/item/query"
        );

        const jstProduct = productService.normalizeJstProduct(parseJstItems(result)[0]);
        if (jstProduct) {
          const pricing = pricingService.applyPricing(
            productService.getMergedPricing(jstProduct, extrasMap[productCode] || null),
            pricingProfile
          );

          name = jstProduct.name || name;
          image = jstProduct.pic || image;
          price = pricing.price ?? 0;

          if (skuId && Array.isArray(jstProduct.skus)) {
            const sku = jstProduct.skus.find((item) => item.sku_id === skuId);
            if (sku) {
              name = sku.name || name;
              image = sku.pic || image;
              spec = sku.properties_value || spec;
            }
          }
        }
      } catch (error) {
        console.error('[ORDER] 重算商品价格失败:', productCode, error.message);
      }
    }

    if (!price) {
      let fallbackPrice = Number(rawItem.settlePrice || rawItem.price || rawItem.salePrice || 0);
      if (!Number.isFinite(fallbackPrice)) fallbackPrice = 0;
      price = fallbackPrice > 1000 ? Math.round(fallbackPrice) : Math.round(fallbackPrice * 100);
    }

    normalizedItems.push({
      product_code: productCode,
      sku_id: skuId,
      name,
      image,
      price,
      quantity,
      spec
    });
  }

  return normalizedItems;
}

// 创建订单
router.post('/', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const openid = req.user.openid || `user_${userId}`;
    
    // 兼容多种参数格式
    const { 
      items,                    // 标准格式
      goodsRequestList,         // 小程序格式
      cart_item_ids,            // 购物车结算格式
      address_id, 
      address,                  // 标准格式
      receiverInfo,             // 小程序格式
      receiver_info,            // 购物车结算格式
      userAddressReq,           // 小程序格式
      buyer_message,
      remark,                   // 小程序格式
      freight: reqFreight,      // 运费
      shop_id                   // 店铺ID
    } = req.body;
    
    console.log('[ORDER] 创建订单请求:', { 
      userId, 
      body_keys: Object.keys(req.body),
      cart_item_ids,
      has_items: !!(items || goodsRequestList)
    });
    
    // 商品列表：支持多种来源
    let orderItems = items || goodsRequestList;
    
    // 如果传的是购物车项ID，从购物车获取商品信息
    if ((!orderItems || orderItems.length === 0) && cart_item_ids && Array.isArray(cart_item_ids) && cart_item_ids.length > 0) {
      console.log('[ORDER] 从购物车获取商品:', cart_item_ids);
      
      const cartResult = await pool.query(
        `SELECT id, product_code, sku_id, quantity, selected
         FROM shopping_cart 
         WHERE id = ANY($1) AND user_id = $2`,
        [cart_item_ids, userId]
      );
      
      if (cartResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          code: 'Error',
          message: '购物车商品不存在或已失效'
        });
      }
      
      // 从聚水潭获取商品详情（包含价格）
      orderItems = [];
      for (const cartItem of cartResult.rows) {
        try {
          // 调用聚水潭商品查询
          const biz = {
            i_ids: [cartItem.product_code],
            page_index: 1,
            page_size: 1
          };
          const result = await jushuitanClient.call(
            "jushuitan.item.query",
            biz,
            {},
            "https://openapi.jushuitan.com/open/mall/item/query"
          );
          
          let productInfo = { name: cartItem.product_code, price: 0, pic: null };
          
          if (result.code === 0 && result.data) {
            const items = result.data.datas || result.data.data?.datas || [];
            if (items.length > 0) {
              const item = items[0];
              productInfo.name = item.name || cartItem.product_code;
              productInfo.price = item.s_price ? Math.round(item.s_price * 100) : 0; // 转为分
              productInfo.pic = item.pic;
              
              // 找到对应的SKU获取更精确的信息
              if (item.skus && item.skus.length > 0) {
                const sku = item.skus.find(s => s.sku_id === cartItem.sku_id);
                if (sku) {
                  productInfo.name = sku.name || productInfo.name;
                  productInfo.price = sku.s_price ? Math.round(sku.s_price * 100) : productInfo.price;
                  productInfo.spec = sku.properties_value;
                }
              }
            }
          }
          
          orderItems.push({
            product_code: cartItem.product_code,
            sku_id: cartItem.sku_id,
            name: productInfo.name,
            image: productInfo.pic,
            price: productInfo.price,
            quantity: cartItem.quantity,
            spec: productInfo.spec || null
          });
        } catch (err) {
          console.error('[ORDER] 获取商品信息失败:', cartItem.product_code, err.message);
          // 即使获取失败，也添加基本信息
          orderItems.push({
            product_code: cartItem.product_code,
            sku_id: cartItem.sku_id,
            name: cartItem.product_code,
            image: null,
            price: 0,
            quantity: cartItem.quantity,
            spec: null
          });
        }
      }
      
      console.log('[ORDER] 购物车商品转换完成:', orderItems.length, '件');
    }
    
    // 参数验证
    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        code: 'Error',
        message: '订单商品不能为空'
      });
    }
    
    // 获取收货地址：支持多种格式
    let receiverAddress = address || receiverInfo || receiver_info || userAddressReq;
    
    if (address_id && !receiverAddress) {
      const addrResult = await pool.query(
        'SELECT * FROM addresses WHERE id = $1 AND user_id = $2',
        [address_id, userId]
      );
      if (addrResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          code: 'Error',
          message: '收货地址不存在'
        });
      }
      receiverAddress = addrResult.rows[0];
    }
    
    if (!receiverAddress) {
      return res.status(400).json({
        success: false,
        code: 'Error',
        message: '请选择收货地址'
      });
    }
    
    await client.query('BEGIN');
    
    // 生成订单号
    const orderNo = generateOrderNo();
    
    orderItems = await resolveOrderItemsPricing(orderItems, userId);

    // 计算订单金额（统一按分计算）
    let totalAmount = 0;
    for (const item of orderItems) {
      const price = Number(item.price) || 0;
      const qty = item.quantity || 1;
      totalAmount += price * qty;
    }

    const payAmount = totalAmount / 100;
    // 运费：使用请求中的运费，默认为0
    const freight = reqFreight || 0;
    
    // 解析收货地址 - 兼容多种字段名
    const addrState = receiverAddress.receiver_state || receiverAddress.provinceName || receiverAddress.province || '';
    const addrCity = receiverAddress.receiver_city || receiverAddress.cityName || receiverAddress.city || '';
    const addrDistrict = receiverAddress.receiver_district || receiverAddress.districtName || receiverAddress.district || '';
    const addrDetail = receiverAddress.receiver_address || receiverAddress.detailAddress || receiverAddress.detail || receiverAddress.address || '';
    const addrName = receiverAddress.receiver_name || receiverAddress.name || '';
    const addrPhone = receiverAddress.receiver_mobile || receiverAddress.receiver_phone || receiverAddress.phone || receiverAddress.phoneNumber || '';
    
    // 创建订单
    const orderResult = await client.query(`
      INSERT INTO orders (
        user_id, order_number, order_no, shop_buyer_id, shop_status,
        receiver_state, receiver_city, receiver_district, receiver_address,
        receiver_name, receiver_phone, receiver_mobile,
        pay_amount, freight, total_amount, buyer_message, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      userId,
      orderNo,  // order_number (必填)
      orderNo,  // order_no
      openid,
      'WAIT_BUYER_PAY',
      addrState,
      addrCity,
      addrDistrict,
      addrDetail,
      addrName,
      addrPhone,
      addrPhone,
      payAmount,
      freight,
      payAmount + freight,
      buyer_message || remark || null,
      'pending'  // status
    ]);
    
    const order = orderResult.rows[0];
    
    // 创建订单明细
    for (let i = 0; i < orderItems.length; i++) {
      const item = orderItems[i];
      const outerOiId = `${orderNo}-${i + 1}`;
      
      const itemPrice = (Number(item.price) || 0) / 100;
      const qty = item.quantity || 1;
      const itemAmount = itemPrice * qty;
      
      // 商品编码：兼容多种格式
      const productCode = item.product_code || '';
      const skuId = item.sku_id || productCode;
      const itemName = item.name || productCode;
      const itemPic = item.image || null;
      const itemSpec = item.spec || null;
      
      await client.query(`
        INSERT INTO order_items (
          order_id, product_code, sku_id, name, properties_value, pic,
          price, base_price, amount, qty, outer_oi_id,
          quantity, unit_price, total_price
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        order.id,
        productCode,
        skuId,
        itemName,
        itemSpec,
        itemPic,
        itemPrice,
        itemPrice,
        itemAmount,
        qty,
        outerOiId,
        qty,           // quantity (必填)
        itemPrice,     // unit_price (必填)
        itemAmount     // total_price (必填)
      ]);
    }
    
    // 如果是从购物车结算，删除已下单的购物车项
    if (cart_item_ids && cart_item_ids.length > 0) {
      await client.query(
        'DELETE FROM shopping_cart WHERE id = ANY($1) AND user_id = $2',
        [cart_item_ids, userId]
      );
      console.log('[ORDER] 已删除购物车项:', cart_item_ids.length, '件');
    }
    
    await client.query('COMMIT');
    
    console.log('[ORDER] 订单创建成功:', { orderId: order.id, orderNo, totalAmount: payAmount });
    
    // 返回兼容格式
    res.json({
      success: true,
      code: 'Success',
      data: {
        orderId: order.id,
        id: order.id,
        order_no: orderNo,
        tradeNo: orderNo,
        total_amount: payAmount + freight,
        totalPayAmount: payAmount + freight,
        pay_amount: payAmount,
        freight: freight,
        status: 'WAIT_BUYER_PAY',
        channel: 'wechat',
        payInfo: '{}'
      },
      msg: '订单创建成功',
      message: '订单创建成功'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('创建订单失败:', error);
    res.status(500).json({
      success: false,
      code: 'Error',
      message: '创建订单失败: ' + error.message,
      msg: '创建订单失败: ' + error.message
    });
  } finally {
    client.release();
  }
});

// 获取当前用户的订单列表
// GET /api/orders?tab=all|unpaid|unshipped|unreceived|completed|cancelled&page=1&pageSize=10
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, pageSize = 10, status, tab } = req.query;
    
    const result = await orderService.getUserOrders(userId, {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      status: status || null,
      tab: tab || null
    });
    
    res.json({
      success: true,
      code: 0,
      data: result
    });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取订单列表失败'
    });
  }
});

// 获取订单详情
router.get('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const order = await orderService.getOrderDetail(parseInt(id), userId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('获取订单详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取订单详情失败'
    });
  }
});

// 取消订单
// POST /api/orders/:id/cancel
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { reason } = req.body;
    
    // 查询订单，验证归属
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '订单不存在'
      });
    }
    
    const order = orderResult.rows[0];
    
    // 只有待支付状态的订单可以取消
    if (order.shop_status !== 'WAIT_BUYER_PAY') {
      return res.status(400).json({
        success: false,
        code: 400,
        message: '只有待支付的订单可以取消'
      });
    }
    
    // 更新订单状态
    const updateResult = await pool.query(`
      UPDATE orders 
      SET status = 'cancelled',
          shop_status = 'TRADE_CLOSED',
          cancel_time = NOW(),
          cancel_reason = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [reason || '用户主动取消', id]);
    
    console.log(`[ORDER] 订单取消成功: ${order.order_number}, 原因: ${reason || '用户主动取消'}`);
    
    res.json({
      success: true,
      code: 0,
      message: '订单取消成功',
      data: {
        id: updateResult.rows[0].id,
        order_number: updateResult.rows[0].order_number,
        status: updateResult.rows[0].status,
        shop_status: updateResult.rows[0].shop_status
      }
    });
  } catch (error) {
    console.error('取消订单失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '取消订单失败: ' + error.message
    });
  }
});

module.exports = router;
