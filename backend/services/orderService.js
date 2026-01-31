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
        status = null
      } = options;

      const offset = (page - 1) * pageSize;
      const conditions = ["user_id = $1"];
      const values = [userId];
      let paramIndex = 2;

      if (status) {
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

      // 查询列表
      const listQuery = `
        SELECT * FROM orders
        WHERE ${whereClause}
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
