const express = require('express');
const router = express.Router();
const orderService = require('../services/orderService');
const auth = require('../middleware/auth');
const { Pool } = require('pg');

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
      address_id, 
      address,                  // 标准格式
      receiverInfo,             // 小程序格式
      userAddressReq,           // 小程序格式
      buyer_message,
      remark                    // 小程序格式
    } = req.body;
    
    // 商品列表：优先使用 items，其次 goodsRequestList
    const orderItems = items || goodsRequestList;
    
    console.log('[ORDER] 创建订单请求:', { 
      userId, 
      items_count: orderItems?.length, 
      address_id, 
      has_address: !!(address || receiverInfo || userAddressReq),
      body_keys: Object.keys(req.body)
    });
    
    // 参数验证
    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        code: 'Error',
        message: '订单商品不能为空'
      });
    }
    
    // 获取收货地址：支持多种格式
    let receiverAddress = address || receiverInfo || userAddressReq;
    
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
    
    // 计算订单金额 - 兼容多种价格字段名
    let totalAmount = 0;
    for (const item of orderItems) {
      // 价格：settlePrice(小程序) > price > 0，单位可能是分或元
      let price = item.settlePrice || item.price || item.salePrice || 0;
      // 如果价格是字符串，转为数字
      if (typeof price === 'string') {
        price = parseFloat(price);
      }
      // 数量：quantity > num > 1
      const qty = item.quantity || item.num || 1;
      totalAmount += price * qty;
    }
    
    // 判断金额单位：如果总金额小于100，可能已经是元
    const payAmount = totalAmount > 1000 ? totalAmount / 100 : totalAmount;
    const freight = 0; // 运费，暂时为0
    
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
        user_id, order_no, shop_buyer_id, shop_status,
        receiver_state, receiver_city, receiver_district, receiver_address,
        receiver_name, receiver_phone, receiver_mobile,
        pay_amount, freight, total_amount, buyer_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      userId,
      orderNo,
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
      buyer_message || remark || null
    ]);
    
    const order = orderResult.rows[0];
    
    // 创建订单明细
    for (let i = 0; i < orderItems.length; i++) {
      const item = orderItems[i];
      const outerOiId = `${orderNo}-${i + 1}`;
      
      // 价格：兼容多种格式
      let itemPrice = item.settlePrice || item.price || item.salePrice || 0;
      if (typeof itemPrice === 'string') itemPrice = parseFloat(itemPrice);
      // 如果价格大于1000，认为是分，转元
      if (itemPrice > 1000) itemPrice = itemPrice / 100;
      
      const qty = item.quantity || item.num || 1;
      const itemAmount = itemPrice * qty;
      
      // 商品编码：兼容多种格式
      const productCode = item.product_code || item.spuId || item.goodsCode || item.i_id || '';
      const skuId = item.sku_id || item.skuId || productCode;
      const itemName = item.name || item.goodsName || item.title || productCode;
      const itemPic = item.image || item.pic || item.thumb || null;
      const itemSpec = item.properties || item.spec || item.skuSpecLst?.map(s => s.specValue).join(' ') || null;
      
      await client.query(`
        INSERT INTO order_items (
          order_id, product_code, sku_id, name, properties_value, pic,
          price, base_price, amount, qty, outer_oi_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
        outerOiId
      ]);
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
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, pageSize = 10, status } = req.query;
    
    const result = await orderService.getUserOrders(userId, {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      status: status || null
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({
      success: false,
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

module.exports = router;
