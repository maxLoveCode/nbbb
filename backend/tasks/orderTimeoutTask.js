const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "ecommerce",
  user: "admin",
  password: "AxiaNBBB123"
});

/**
 * 订单超时自动关闭任务
 * 
 * 功能：关闭超过30分钟未支付的订单
 * 执行频率：每分钟检查一次
 */
class OrderTimeoutTask {
  constructor() {
    // 超时时间：30分钟（毫秒）
    this.timeoutMinutes = 30;
    // 检查间隔：1分钟
    this.checkInterval = 60 * 1000;
    // 定时器
    this.timer = null;
    // 是否正在运行
    this.isRunning = false;
  }

  /**
   * 启动定时任务
   */
  start() {
    if (this.timer) {
      console.log("[OrderTimeout] 任务已在运行中");
      return;
    }

    console.log(`[OrderTimeout] 启动订单超时检查任务，超时时间: ${this.timeoutMinutes} 分钟`);
    
    // 立即执行一次
    this.checkAndCloseTimeoutOrders();
    
    // 设置定时器
    this.timer = setInterval(() => {
      this.checkAndCloseTimeoutOrders();
    }, this.checkInterval);
  }

  /**
   * 停止定时任务
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log("[OrderTimeout] 任务已停止");
    }
  }

  /**
   * 检查并关闭超时订单
   */
  async checkAndCloseTimeoutOrders() {
    if (this.isRunning) {
      return; // 防止重复执行
    }

    this.isRunning = true;

    try {
      // 查找超时未支付的订单
      // 条件：status=pending, shop_status=WAIT_BUYER_PAY, 创建时间超过30分钟
      const result = await pool.query(`
        UPDATE orders 
        SET 
          status = 'cancelled',
          shop_status = 'TRADE_CLOSED',
          cancel_time = NOW(),
          cancel_reason = '订单超时未支付，系统自动关闭',
          updated_at = NOW()
        WHERE 
          status = 'pending' 
          AND shop_status = 'WAIT_BUYER_PAY'
          AND created_at < NOW() - INTERVAL '${this.timeoutMinutes} minutes'
        RETURNING id, order_number, created_at
      `);

      if (result.rows.length > 0) {
        console.log(`[OrderTimeout] 已关闭 ${result.rows.length} 个超时订单:`);
        result.rows.forEach(order => {
          console.log(`  - 订单号: ${order.order_number}, 创建时间: ${order.created_at}`);
        });
      }
    } catch (error) {
      console.error("[OrderTimeout] 检查超时订单失败:", error.message);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 手动关闭指定订单
   */
  async closeOrder(orderId, reason = "用户取消") {
    try {
      const result = await pool.query(`
        UPDATE orders 
        SET 
          status = 'cancelled',
          shop_status = 'TRADE_CLOSED',
          cancel_time = NOW(),
          cancel_reason = $2,
          updated_at = NOW()
        WHERE id = $1 AND status = 'pending'
        RETURNING *
      `, [orderId, reason]);

      return result.rows[0] || null;
    } catch (error) {
      console.error("[OrderTimeout] 关闭订单失败:", error.message);
      throw error;
    }
  }

  /**
   * 获取即将超时的订单（用于前端倒计时提醒）
   */
  async getExpiringOrders(userId) {
    try {
      const result = await pool.query(`
        SELECT 
          id, 
          order_number, 
          total_amount,
          created_at,
          EXTRACT(EPOCH FROM (created_at + INTERVAL '${this.timeoutMinutes} minutes' - NOW())) as remaining_seconds
        FROM orders 
        WHERE 
          user_id = $1
          AND status = 'pending' 
          AND shop_status = 'WAIT_BUYER_PAY'
          AND created_at > NOW() - INTERVAL '${this.timeoutMinutes} minutes'
        ORDER BY created_at ASC
      `, [userId]);

      return result.rows.map(order => ({
        ...order,
        remaining_seconds: Math.max(0, Math.floor(order.remaining_seconds)),
        expires_at: new Date(new Date(order.created_at).getTime() + this.timeoutMinutes * 60 * 1000)
      }));
    } catch (error) {
      console.error("[OrderTimeout] 获取即将超时订单失败:", error.message);
      return [];
    }
  }
}

// 创建单例
const orderTimeoutTask = new OrderTimeoutTask();

module.exports = orderTimeoutTask;
