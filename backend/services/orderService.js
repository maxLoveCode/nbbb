const { Pool } = require("pg");
const jushuitanClient = require("./jushuitanClient");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "ecommerce",
  user: "admin",
  password: "AxiaNBBB123"
});

/**
 * 订单服务
 * 提供订单相关的业务逻辑
 */
class OrderService {
  /**
   * 生成订单号
   * 格式：YYYYMMDDHHmmss + 4位随机数
   */
  generateOrderNo() {
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

  /**
   * Tab 状态映射到 shop_status
   */
  static TAB_STATUS_MAP = {
    all: null,                                          // 全部
    unpaid: ['WAIT_BUYER_PAY'],                         // 待付款
    unshipped: ['WAIT_SELLER_SEND_GOODS'],              // 待发货
    unreceived: ['WAIT_BUYER_CONFIRM_GOODS'],           // 待收货
    completed: ['TRADE_FINISHED', 'TRADE_SUCCESS'],     // 已完成
    cancelled: ['TRADE_CLOSED']                         // 已取消
  };

  /**
   * 获取订单状态文本
   */
  static getStatusText(shopStatus) {
    const statusTextMap = {
      'WAIT_BUYER_PAY': '待付款',
      'WAIT_SELLER_SEND_GOODS': '待发货',
      'WAIT_BUYER_CONFIRM_GOODS': '待收货',
      'TRADE_FINISHED': '已完成',
      'TRADE_SUCCESS': '已完成',
      'TRADE_CLOSED': '已取消'
    };
    return statusTextMap[shopStatus] || shopStatus;
  }

  /**
   * 获取用户订单列表
   * @param {number} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Object} 订单列表和分页信息
   */
  async getUserOrders(userId, options = {}) {
    try {
      const {
        page = 1,
        pageSize = 10,
        status = null,
        tab = null  // 支持 tab 参数：all, unpaid, unshipped, unreceived, completed, cancelled
      } = options;

      const offset = (page - 1) * pageSize;
      const conditions = ["user_id = $1"];
      const values = [userId];
      let paramIndex = 2;

      // 优先使用 tab 参数
      if (tab && tab !== 'all' && OrderService.TAB_STATUS_MAP[tab]) {
        const shopStatuses = OrderService.TAB_STATUS_MAP[tab];
        conditions.push(`shop_status = ANY($${paramIndex})`);
        values.push(shopStatuses);
        paramIndex++;
      } else if (status) {
        // 兼容旧的 status 参数
        conditions.push(`status = $${paramIndex}`);
        values.push(status);
        paramIndex++;
      }

      const whereClause = conditions.join(" AND ");

      // 查询总数
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM orders WHERE ${whereClause}`,
        values
      );
      const total = parseInt(countResult.rows[0].count);

      // 查询列表（包含订单商品）
      const listQuery = `
        SELECT * FROM orders
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      values.push(pageSize, offset);

      const listResult = await pool.query(listQuery, values);

      // 获取每个订单的商品信息
      const orders = [];
      for (const order of listResult.rows) {
        const itemsResult = await pool.query(
          `SELECT product_code, sku_id, name, pic, price, qty, properties_value 
           FROM order_items WHERE order_id = $1`,
          [order.id]
        );
        
        orders.push({
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          shop_status: order.shop_status,
          status_text: OrderService.getStatusText(order.shop_status),
          total_amount: order.total_amount,
          pay_amount: order.pay_amount,
          freight: order.freight,
          created_at: order.created_at,
          items: itemsResult.rows.map(item => ({
            product_code: item.product_code,
            sku_id: item.sku_id,
            name: item.name,
            image: item.pic,
            price: item.price,
            quantity: item.qty,
            spec: item.properties_value
          })),
          item_count: itemsResult.rows.reduce((sum, item) => sum + (item.qty || 1), 0)
        });
      }

      return {
        orders,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      };
    } catch (error) {
      console.error("获取订单列表失败:", error);
      throw error;
    }
  }

  /**
   * 获取订单详情
   * @param {number} orderId - 订单ID
   * @param {number} userId - 用户ID（可选，用于权限检查）
   * @returns {Object} 订单详情
   */
  async getOrderDetail(orderId, userId = null) {
    try {
      const conditions = ["o.id = $1"];
      const values = [orderId];

      if (userId) {
        conditions.push("o.user_id = $2");
        values.push(userId);
      }

      const orderQuery = `
        SELECT o.* FROM orders o
        WHERE ${conditions.join(" AND ")}
      `;

      const orderResult = await pool.query(orderQuery, values);

      if (orderResult.rows.length === 0) {
        return null;
      }

      const order = orderResult.rows[0];

      // 获取订单商品
      const itemsResult = await pool.query(
        "SELECT * FROM order_items WHERE order_id = $1",
        [orderId]
      );

      return {
        ...order,
        items: itemsResult.rows
      };
    } catch (error) {
      console.error("获取订单详情失败:", error);
      throw error;
    }
  }

  /**
   * 更新订单状态
   * @param {number} orderId - 订单ID
   * @param {string} status - 新状态
   * @param {Object} extraData - 额外数据
   */
  async updateOrderStatus(orderId, status, extraData = {}) {
    try {
      const updates = ["status = $1", "updated_at = NOW()"];
      const values = [status];
      let paramIndex = 2;

      // 处理额外的更新字段
      if (extraData.payment_time) {
        updates.push(`payment_time = $${paramIndex++}`);
        values.push(extraData.payment_time);
      }

      if (extraData.ship_time) {
        updates.push(`ship_time = $${paramIndex++}`);
        values.push(extraData.ship_time);
      }

      if (extraData.finish_time) {
        updates.push(`finish_time = $${paramIndex++}`);
        values.push(extraData.finish_time);
      }

      if (extraData.cancel_time) {
        updates.push(`cancel_time = $${paramIndex++}`);
        values.push(extraData.cancel_time);
      }

      values.push(orderId);

      const query = `
        UPDATE orders
        SET ${updates.join(", ")}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error("更新订单状态失败:", error);
      throw error;
    }
  }

  /**
   * 取消订单
   * @param {number} orderId - 订单ID
   * @param {number} userId - 用户ID
   * @param {string} reason - 取消原因
   * @returns {Object} 取消后的订单
   */
  async cancelOrder(orderId, userId, reason = "用户取消") {
    try {
      const result = await pool.query(`
        UPDATE orders
        SET
          status = 'cancelled',
          shop_status = 'TRADE_CLOSED',
          cancel_time = NOW(),
          cancel_reason = $3,
          updated_at = NOW()
        WHERE id = $1 AND user_id = $2 AND shop_status = 'WAIT_BUYER_PAY'
        RETURNING *
      `, [orderId, userId, reason]);

      return result.rows[0] || null;
    } catch (error) {
      console.error("取消订单失败:", error);
      throw error;
    }
  }

  /**
   * 同步订单到聚水潭
   * @param {number} orderId - 订单ID
   * @param {number} userId - 用户ID（可选，用于权限验证）
   * @returns {Object} 同步结果
   */
  async syncOrderToJushuitan(orderId, userId = null) {
    try {
      // 1. 获取订单详情
      const order = await this.getOrderDetail(orderId, userId);
      if (!order) {
        throw new Error(`订单不存在: ${orderId}`);
      }

      // 2. 检查订单状态（只同步已支付的订单）
      if (order.shop_status === 'WAIT_BUYER_PAY') {
        throw new Error('订单未支付，无法同步到聚水潭');
      }

      // 3. 检查是否已同步
      if (order.sync_status === 'synced' && order.jst_so_id) {
        console.log(`[OrderSync] 订单 ${orderId} 已同步过，跳过`);
        return { success: true, message: '订单已同步', jst_so_id: order.jst_so_id };
      }

      // 4. 构建聚水潭订单数据
      const jstOrderData = this._buildJstOrderData(order);

      // 5. 调用聚水潭订单上传接口（注意：orders 复数，参数是数组）
      console.log(`[OrderSync] 开始同步订单 ${orderId} 到聚水潭...`);
      
      const response = await jushuitanClient.call(
        "jushuitan.orders.upload",
        [jstOrderData],  // 必须是数组格式
        {},
        "https://openapi.jushuitan.com/open/jushuitan/orders/upload"
      );

      // 6. 处理响应（结果在 response.data.datas 数组中）
      if (response.code === 0 && response.data?.datas?.[0]?.issuccess) {
        const jstResult = response.data.datas[0];
        
        // 更新订单同步状态
        await pool.query(`
          UPDATE orders 
          SET 
            sync_status = 'synced',
            sync_at = NOW(),
            jst_o_id = $2,
            jst_so_id = $3,
            shop_id = $4,
            sync_error = NULL,
            updated_at = NOW()
          WHERE id = $1
        `, [orderId, jstResult.o_id || null, jstResult.so_id || order.order_number, jstOrderData.shop_id]);

        console.log(`[OrderSync] 订单 ${orderId} 同步成功, JST订单ID: ${jstResult.o_id}`);
        
        return {
          success: true,
          message: '同步成功',
          jst_o_id: jstResult.o_id,
          jst_so_id: jstResult.so_id || order.order_number
        };
      } else {
        // 同步失败，记录错误
        const errorMsg = response.msg || JSON.stringify(response);
        
        await pool.query(`
          UPDATE orders 
          SET 
            sync_status = 'failed',
            sync_at = NOW(),
            sync_error = $2,
            updated_at = NOW()
          WHERE id = $1
        `, [orderId, errorMsg]);

        console.error(`[OrderSync] 订单 ${orderId} 同步失败:`, errorMsg);
        throw new Error(`聚水潭同步失败: ${errorMsg}`);
      }
    } catch (error) {
      console.error(`[OrderSync] 订单 ${orderId} 同步异常:`, error.message);
      
      // 记录错误状态
      try {
        await pool.query(`
          UPDATE orders 
          SET 
            sync_status = 'failed',
            sync_at = NOW(),
            sync_error = $2,
            updated_at = NOW()
          WHERE id = $1
        `, [orderId, error.message]);
      } catch (updateError) {
        console.error('[OrderSync] 更新同步状态失败:', updateError.message);
      }
      
      throw error;
    }
  }

  /**
   * 构建聚水潭订单数据
   * @private
   */
  _buildJstOrderData(order) {
    // 店铺ID：小程序商城店铺（商家自有商城类型）
    const shopId = order.shop_id || parseInt(process.env.JST_SHOP_ID) || 19669617;
    
    // 构建订单商品列表
    const items = (order.items || []).map((item, index) => ({
      outer_oi_id: item.outer_oi_id || `${order.order_number}-${index + 1}`,
      sku_id: item.sku_id || item.product_code,
      shop_sku_id: item.shop_sku_id || item.sku_id || item.product_code,
      i_id: item.i_id || item.product_code,
      shop_i_id: item.shop_i_id || item.product_code,
      name: item.name || '商品',
      qty: item.qty || item.quantity || 1,
      price: parseFloat(item.price || item.unit_price || 0),
      amount: parseFloat(item.amount || item.total_price || (item.price * (item.qty || 1)) || 0),
      base_price: parseFloat(item.base_price || item.price || item.unit_price || 0),
      properties_value: item.properties_value || '',
      is_gift: item.is_gift || false
    }));

    // 订单日期和支付日期
    const orderDate = this._formatDate(order.order_date || order.created_at);
    const payAmount = parseFloat(order.pay_amount || order.total_amount || 0);

    // 构建聚水潭订单格式
    return {
      shop_id: shopId,
      so_id: order.order_number,                    // 线上订单号（唯一）
      order_date: orderDate,                        // 订单日期
      shop_status: order.shop_status || 'WAIT_SELLER_SEND_GOODS',
      shop_buyer_id: order.shop_buyer_id || `user_${order.user_id}`,
      receiver_state: order.receiver_state || '',   // 省
      receiver_city: order.receiver_city || '',     // 市
      receiver_district: order.receiver_district || '', // 区
      receiver_address: order.receiver_address || order.shipping_address || '',
      receiver_name: order.receiver_name || '',
      receiver_phone: order.receiver_phone || order.receiver_mobile || '',
      receiver_mobile: order.receiver_mobile || order.receiver_phone || '',
      pay_amount: payAmount,
      freight: parseFloat(order.freight || 0),
      buyer_message: order.buyer_message || order.notes || '',
      remark: order.notes || '',
      is_cod: false,                                // 非货到付款
      pay_date: orderDate,                          // 支付时间
      // 支付信息（必填，否则聚水潭认为是待支付订单）
      pay: {
        outer_pay_id: `PAY-${order.order_number}`,
        pay_date: orderDate,
        amount: payAmount,
        payment: '微信支付',
        seller_account: 'NBB小程序商城',
        buyer_account: order.shop_buyer_id || `user_${order.user_id}`
      },
      items: items
    };
  }

  /**
   * 格式化日期为聚水潭要求的格式
   * @private
   */
  _formatDate(date) {
    if (!date) return new Date().toISOString().replace('T', ' ').substring(0, 19);
    const d = new Date(date);
    return d.toISOString().replace('T', ' ').substring(0, 19);
  }

  /**
   * 批量同步待同步的订单到聚水潭
   * @param {number} limit - 每次同步的订单数量
   * @returns {Object} 同步结果统计
   */
  async batchSyncOrdersToJushuitan(limit = 10) {
    try {
      // 查找待同步的订单（已支付但未同步的）
      const pendingOrders = await pool.query(`
        SELECT id, order_number, user_id
        FROM orders
        WHERE sync_status IN ('pending', 'failed')
          AND shop_status != 'WAIT_BUYER_PAY'
          AND shop_status != 'TRADE_CLOSED'
        ORDER BY created_at ASC
        LIMIT $1
      `, [limit]);

      const results = {
        total: pendingOrders.rows.length,
        success: 0,
        failed: 0,
        errors: []
      };

      for (const order of pendingOrders.rows) {
        try {
          await this.syncOrderToJushuitan(order.id, order.user_id);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            orderId: order.id,
            orderNumber: order.order_number,
            error: error.message
          });
        }
      }

      console.log(`[OrderSync] 批量同步完成: 成功 ${results.success}, 失败 ${results.failed}`);
      return results;
    } catch (error) {
      console.error('[OrderSync] 批量同步异常:', error.message);
      throw error;
    }
  }

  /**
   * 获取所有订单列表（管理端使用）
   * @param {Object} options - 查询选项
   * @returns {Object} 订单列表和分页信息
   */
  async getAllOrders(options = {}) {
    try {
      const {
        page = 1,
        pageSize = 20,
        status = null,
        keyword = "",
        startDate = null,
        endDate = null
      } = options;

      const offset = (page - 1) * pageSize;
      const conditions = [];
      const values = [];
      let paramIndex = 1;

      // 状态筛选
      if (status) {
        conditions.push(`status = $${paramIndex}`);
        values.push(status);
        paramIndex++;
      }

      // 关键词搜索（订单号、收货人）
      if (keyword) {
        conditions.push(`(order_no ILIKE $${paramIndex} OR receiver_name ILIKE $${paramIndex})`);
        values.push(`%${keyword}%`);
        paramIndex++;
      }

      // 日期筛选
      if (startDate) {
        conditions.push(`created_at >= $${paramIndex}`);
        values.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        conditions.push(`created_at <= $${paramIndex}`);
        values.push(endDate);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      // 查询总数
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM orders ${whereClause}`,
        values
      );
      const total = parseInt(countResult.rows[0].count);

      // 查询列表
      const listQuery = `
        SELECT * FROM orders
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      values.push(pageSize, offset);

      const listResult = await pool.query(listQuery, values);

      return {
        orders: listResult.rows,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      };
    } catch (error) {
      console.error("获取订单列表失败:", error);
      throw error;
    }
  }
}

module.exports = new OrderService();
