const { Pool } = require("pg");
const logger = require("../utils/logger");
const wechatPay = require("../services/wechatPay");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "ecommerce",
  user: "admin",
  password: "AxiaNBBB123"
});

/**
 * 支付控制器
 * 功能：
 * 1. 创建支付订单
 * 2. 处理支付回调
 * 3. 查询支付状态
 */
class PaymentController {
  /**
   * 创建支付订单（统一下单）
   * POST /api/payment/create
   */
  async createPayment(req, res) {
    const startTime = Date.now();
    try {
      const userId = req.user.id;
      const openid = req.user.openid;
      const orderId = parseInt(req.body.order_id);
      const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";

      logger.info('PAYMENT', '创建支付订单', {
        userId,
        orderId,
        openid: openid ? `${openid.substring(0, 8)}...` : null,
        ip
      });

      // 参数验证
      if (!orderId) {
        return res.status(400).json({
          code: 400,
          message: "订单ID不能为空"
        });
      }

      if (!openid) {
        return res.status(400).json({
          code: 400,
          message: "用户openid不能为空"
        });
      }

      // 1. 获取订单信息
      const orderResult = await pool.query(
        `SELECT o.*, u.openid 
         FROM orders o
         LEFT JOIN users u ON o.user_id = u.id
         WHERE o.id = $1 AND o.user_id = $2`,
        [orderId, userId]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          code: 404,
          message: "订单不存在"
        });
      }

      const order = orderResult.rows[0];

      // 检查订单状态
      if (order.shop_status === 'TRADE_FINISHED' || order.shop_status === 'TRADE_SUCCESS') {
        return res.status(400).json({
          code: 400,
          message: "订单已支付，无需重复支付"
        });
      }

      // 检查是否已有支付记录
      const existingPayment = await pool.query(
        `SELECT * FROM order_payments WHERE order_id = $1 LIMIT 1`,
        [orderId]
      );

      if (existingPayment.rows.length > 0) {
        const payment = existingPayment.rows[0];
        // 如果支付成功，返回已支付信息
        if (payment.amount > 0) {
          return res.json({
            code: 0,
            message: "订单已支付",
            data: {
              order_id: orderId,
              payment_id: payment.id,
              paid: true
            }
          });
        }
      }

      // 2. 调用微信支付统一下单
      const totalFee = Math.round(parseFloat(order.pay_amount || order.total_amount) * 100); // 转换为分
      
      if (totalFee <= 0) {
        return res.status(400).json({
          code: 400,
          message: "订单金额无效"
        });
      }

      const payParams = {
        openid: openid,
        outTradeNo: order.order_no, // 使用订单号作为商户订单号
        body: `订单${order.order_no}`, // 商品描述
        totalFee: totalFee,
        clientIp: ip,
        attach: JSON.stringify({ order_id: orderId }) // 附加数据，用于回调时识别订单
      };

      const payResult = await wechatPay.unifiedOrder(payParams);

      // 3. 生成小程序支付签名
      const paySign = wechatPay.generatePaySign(payResult);

      const duration = Date.now() - startTime;
      logger.info('PAYMENT', '支付订单创建成功', {
        userId,
        orderId,
        orderNo: order.order_no,
        totalFee,
        prepayId: payResult.prepayId,
        duration: `${duration}ms`,
        ip
      });

      // 4. 返回小程序支付参数
      return res.json({
        code: 0,
        message: "支付订单创建成功",
        data: {
          order_id: orderId,
          order_no: order.order_no,
          payment: {
            appId: payResult.appId,
            timeStamp: payResult.timeStamp,
            nonceStr: payResult.nonceStr,
            package: payResult.package,
            signType: payResult.signType,
            paySign: paySign
          }
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const userId = req.user?.id || 'unknown';
      const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";
      
      logger.error('PAYMENT', '创建支付订单失败', {
        userId,
        error: error.message,
        stack: error.stack?.substring(0, 200),
        duration: `${duration}ms`,
        ip
      });

      return res.status(500).json({
        code: 500,
        message: error.message || "创建支付订单失败"
      });
    }
  }

  /**
   * 支付回调处理
   * POST /api/payment/notify
   */
  async handleNotify(req, res) {
    const startTime = Date.now();
    try {
      const data = req.body;
      const contentType = req.headers['content-type'] || '';
      const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";

      logger.info('PAYMENT', '收到支付回调', {
        ip,
        contentType,
        hasData: !!data
      });

      // 处理支付回调（自动识别v2/v3）
      const notifyData = await wechatPay.handleNotify(data, req.headers);

      // 解析附加数据
      let attachData = {};
      try {
        if (notifyData.attach) {
          attachData = JSON.parse(notifyData.attach);
        }
      } catch (e) {
        logger.warn('PAYMENT', '解析附加数据失败', {
          attach: notifyData.attach,
          error: e.message
        });
      }

      const orderId = attachData.order_id;
      const orderNo = notifyData.outTradeNo;

      if (!orderId) {
        logger.error('PAYMENT', '支付回调缺少订单ID', {
          outTradeNo: orderNo,
          attach: notifyData.attach
        });
        const response = wechatPay.generateNotifyResponse(false, '缺少订单ID');
        // API v3返回JSON，v2返回XML
        if (typeof response === 'object') {
          return res.status(200).json(response);
        } else {
          return res.send(response);
        }
      }

      // 先获取订单信息（用于同步）
      const orderInfoResult = await pool.query(
        `SELECT user_id, sync_status, jst_o_id FROM orders WHERE id = $1`,
        [orderId]
      );

      if (orderInfoResult.rows.length === 0) {
        logger.error('PAYMENT', '支付回调订单不存在', {
          orderId,
          orderNo
        });
        const response = wechatPay.generateNotifyResponse(false, '订单不存在');
        if (typeof response === 'object') {
          return res.status(200).json(response);
        } else {
          return res.send(response);
        }
      }

      const orderInfo = orderInfoResult.rows[0];
      const userId = orderInfo.user_id;

      // 使用事务更新订单和支付信息
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // 1. 更新订单状态
        const updateResult = await client.query(
          `UPDATE orders 
           SET shop_status = 'WAIT_SELLER_SEND_GOODS', 
               sync_status = CASE WHEN sync_status = 'pending' THEN 'pending' ELSE sync_status END,
               pay_amount = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND shop_status = 'WAIT_BUYER_PAY'
           RETURNING id`,
          [notifyData.totalFee / 100, orderId]
        );

        // 检查是否真的更新了订单（防止重复回调）
        if (updateResult.rows.length === 0) {
          logger.warn('PAYMENT', '支付回调订单状态未更新（可能已处理过）', {
            orderId,
            orderNo,
            transactionId: notifyData.transactionId
          });
          await client.query('COMMIT');
          
          // 即使订单状态未更新，也返回成功（避免微信重复回调）
          const response = wechatPay.generateNotifyResponse(true, 'OK');
          if (typeof response === 'object') {
            return res.status(200).json(response);
          } else {
            return res.send(response);
          }
        }

        // 2. 插入或更新支付记录
        await client.query(
          `INSERT INTO order_payments (
            order_id, outer_pay_id, pay_date, payment, 
            seller_account, buyer_account, amount
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (order_id, outer_pay_id) DO UPDATE SET
            pay_date = EXCLUDED.pay_date,
            amount = EXCLUDED.amount,
            updated_at = CURRENT_TIMESTAMP`,
          [
            orderId,
            notifyData.transactionId, // 微信支付交易号
            new Date(notifyData.timeEnd ? notifyData.timeEnd.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1-$2-$3 $4:$5:$6') : new Date()),
            '微信支付',
            '微信商户平台',
            notifyData.openid || '',
            notifyData.totalFee / 100 // 转换为元
          ]
        );

        await client.query('COMMIT');

        const duration = Date.now() - startTime;
        logger.info('PAYMENT', '支付回调处理成功', {
          orderId,
          orderNo,
          transactionId: notifyData.transactionId,
          totalFee: notifyData.totalFee,
          duration: `${duration}ms`,
          ip
        });

        // 3. 异步同步订单到聚水潭（不阻塞回调响应）
        // 支付成功后，订单状态已更新为 WAIT_SELLER_SEND_GOODS，且有支付信息，可以同步
        // 使用 setImmediate 确保在响应返回后再执行同步，避免阻塞回调响应
        setImmediate(async () => {
          try {
            const orderService = require('../services/orderService');
            // 调用订单同步方法（异步执行，不阻塞）
            await orderService.syncOrderToJushuitan(orderId, userId);
            logger.info('PAYMENT', '支付成功后订单同步到聚水潭成功', {
              orderId,
              orderNo,
              userId
            });
          } catch (syncError) {
            // 同步失败不影响支付回调响应，只记录日志
            // 订单状态和支付信息已更新，同步失败可以后续手动重试
            logger.error('PAYMENT', '支付成功后订单同步到聚水潭失败', {
              orderId,
              orderNo,
              userId,
              error: syncError.message,
              stack: syncError.stack?.substring(0, 200)
            });
          }
        });

        // 返回成功响应（自动选择v2/v3格式）
        const response = wechatPay.generateNotifyResponse(true, 'OK');
        if (typeof response === 'object') {
          return res.status(200).json(response);
        } else {
          return res.send(response);
        }
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";
      
      logger.error('PAYMENT', '支付回调处理失败', {
        error: error.message,
        stack: error.stack?.substring(0, 200),
        duration: `${duration}ms`,
        ip
      });

      // 返回失败响应（自动选择v2/v3格式）
      const response = wechatPay.generateNotifyResponse(false, error.message || '处理失败');
      if (typeof response === 'object') {
        return res.status(200).json(response);
      } else {
        return res.send(response);
      }
    }
  }

  /**
   * 创建微信支付v3订单（专门为前端封装）
   * POST /api/payment/v3/create
   * 
   * 返回格式化的支付参数，前端可直接调用 wx.requestPayment()
   */
  async createPaymentV3(req, res) {
    const startTime = Date.now();
    try {
      const userId = req.user.id;
      const openid = req.user.openid;
      const orderId = parseInt(req.body.order_id);
      const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";

      logger.info('PAYMENT', '创建微信支付v3订单', {
        userId,
        orderId,
        openid: openid ? `${openid.substring(0, 8)}...` : null,
        ip
      });

      // 检查是否启用API v3
      if (!wechatPay.useApiV3) {
        return res.status(400).json({
          code: 400,
          message: "微信支付v3未启用，请检查环境变量 WX_PAY_API_V3=true"
        });
      }

      // 参数验证
      if (!orderId) {
        return res.status(400).json({
          code: 400,
          message: "订单ID不能为空"
        });
      }

      if (!openid) {
        return res.status(400).json({
          code: 400,
          message: "用户openid不能为空"
        });
      }

      // 1. 获取订单信息
      const orderResult = await pool.query(
        `SELECT o.*, u.openid 
         FROM orders o
         LEFT JOIN users u ON o.user_id = u.id
         WHERE o.id = $1 AND o.user_id = $2`,
        [orderId, userId]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          code: 404,
          message: "订单不存在"
        });
      }

      const order = orderResult.rows[0];

      // 检查订单状态
      if (order.shop_status === 'TRADE_FINISHED' || order.shop_status === 'TRADE_SUCCESS') {
        return res.status(400).json({
          code: 400,
          message: "订单已支付，无需重复支付"
        });
      }

      // 检查是否已有支付记录
      const existingPayment = await pool.query(
        `SELECT * FROM order_payments WHERE order_id = $1 LIMIT 1`,
        [orderId]
      );

      if (existingPayment.rows.length > 0) {
        const payment = existingPayment.rows[0];
        // 如果支付成功，返回已支付信息
        if (payment.amount > 0) {
          return res.json({
            code: 0,
            message: "订单已支付",
            data: {
              order_id: orderId,
              payment_id: payment.id,
              paid: true
            }
          });
        }
      }

      // 2. 调用微信支付v3统一下单
      const totalFee = Math.round(parseFloat(order.pay_amount || order.total_amount) * 100); // 转换为分
      
      if (totalFee <= 0) {
        return res.status(400).json({
          code: 400,
          message: "订单金额无效"
        });
      }

      const payParams = {
        openid: openid,
        outTradeNo: order.order_no, // 使用订单号作为商户订单号
        body: `订单${order.order_no}`, // 商品描述
        totalFee: totalFee,
        clientIp: ip,
        attach: JSON.stringify({ order_id: orderId }) // 附加数据，用于回调时识别订单
      };

      // 直接调用v3接口
      const payResult = await wechatPay.unifiedOrderV3(payParams);

      // 3. 生成小程序支付签名（v3使用RSA-SHA256）
      const paySign = wechatPay.generatePaySign(payResult);

      const duration = Date.now() - startTime;
      logger.info('PAYMENT', '微信支付v3订单创建成功', {
        userId,
        orderId,
        orderNo: order.order_no,
        totalFee,
        prepayId: payResult.prepayId,
        duration: `${duration}ms`,
        ip
      });

      // 4. 返回格式化的支付参数（前端可直接使用）
      return res.json({
        code: 0,
        message: "支付订单创建成功",
        data: {
          order_id: orderId,
          order_no: order.order_no,
          total_fee: totalFee,
          // 微信小程序支付参数（可直接传给 wx.requestPayment）
          payment: {
            appId: payResult.appId,
            timeStamp: payResult.timeStamp,
            nonceStr: payResult.nonceStr,
            package: payResult.package,
            signType: payResult.signType, // 'RSA'
            paySign: paySign
          },
          // 额外信息
          api_version: 'v3',
          prepay_id: payResult.prepayId
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const userId = req.user?.id || 'unknown';
      const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";

      // 增强日志信息，方便排查微信支付v3的 401 / 签名等问题
      logger.error('PAYMENT', '创建微信支付v3订单失败', {
        userId,
        error: error.message,
        stack: error.stack?.substring(0, 200),
        duration: `${duration}ms`,
        ip,
        // 如果是 axios 调用微信支付失败，记录下游返回
        isAxiosError: error.isAxiosError,
        wechatStatus: error.response?.status,
        wechatResponse: error.response?.data
      });

      return res.status(500).json({
        code: 500,
        message: error.message || "创建支付订单失败"
      });
    }
  }

  /**
   * 查询支付状态
   * GET /api/payment/status/:order_id
   */
  async getPaymentStatus(req, res) {
    try {
      const userId = req.user.id;
      const orderId = parseInt(req.params.order_id);
      const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";

      logger.info('PAYMENT', '查询支付状态', {
        userId,
        orderId,
        ip
      });

      // 获取订单信息
      const orderResult = await pool.query(
        `SELECT o.* FROM orders o WHERE o.id = $1 AND o.user_id = $2`,
        [orderId, userId]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          code: 404,
          message: "订单不存在"
        });
      }

      const order = orderResult.rows[0];

      // 获取支付信息
      const paymentResult = await pool.query(
        `SELECT * FROM order_payments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [orderId]
      );

      // 如果订单已支付，直接返回
      if (paymentResult.rows.length > 0 && paymentResult.rows[0].amount > 0) {
        return res.json({
          code: 0,
          data: {
            order_id: orderId,
            order_no: order.order_no,
            paid: true,
            payment: paymentResult.rows[0],
            order_status: order.shop_status
          }
        });
      }

      // 如果订单未支付，查询微信支付状态
      try {
        const queryResult = await wechatPay.queryOrder(order.order_no);
        
        const paid = queryResult.trade_state === 'SUCCESS';
        
        // 如果支付成功但数据库未更新，更新数据库
        if (paid && paymentResult.rows.length === 0) {
          await pool.query(
            `INSERT INTO order_payments (
              order_id, outer_pay_id, pay_date, payment, 
              seller_account, buyer_account, amount
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              orderId,
              queryResult.transaction_id,
              new Date(queryResult.time_end ? queryResult.time_end.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1-$2-$3 $4:$5:$6') : new Date()),
              '微信支付',
              '微信商户平台',
              queryResult.openid || '',
              parseInt(queryResult.total_fee) / 100
            ]
          );

          // 更新订单状态
          await pool.query(
            `UPDATE orders 
             SET shop_status = 'WAIT_SELLER_SEND_GOODS', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [orderId]
          );
        }

        return res.json({
          code: 0,
          data: {
            order_id: orderId,
            order_no: order.order_no,
            paid: paid,
            trade_state: queryResult.trade_state,
            trade_state_desc: queryResult.trade_state_desc,
            payment: paid && paymentResult.rows.length > 0 ? paymentResult.rows[0] : null
          }
        });
      } catch (error) {
        logger.error('PAYMENT', '查询微信支付状态失败', {
          orderId,
          orderNo: order.order_no,
          error: error.message
        });

        // 即使查询失败，也返回订单当前状态
        return res.json({
          code: 0,
          data: {
            order_id: orderId,
            order_no: order.order_no,
            paid: order.shop_status !== 'WAIT_BUYER_PAY',
            order_status: order.shop_status,
            payment: paymentResult.rows.length > 0 ? paymentResult.rows[0] : null,
            query_error: error.message
          }
        });
      }
    } catch (error) {
      const userId = req.user?.id || 'unknown';
      const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";
      
      logger.error('PAYMENT', '查询支付状态失败', {
        userId,
        order_id: req.params.order_id,
        error: error.message,
        ip
      });

      return res.status(500).json({
        code: 500,
        message: "查询支付状态失败"
      });
    }
  }

  /**
   * 手动更新订单支付信息
   * PUT /api/payment/order/:order_id
   * 
   * 用于手动添加或更新订单的支付信息
   * 适用于：
   * 1. 线下支付
   * 2. 其他支付方式
   * 3. 手动标记订单为已支付
   */
  async updateOrderPayment(req, res) {
    const startTime = Date.now();
    try {
      const userId = req.user.id;
      const orderId = parseInt(req.params.order_id);
      const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";

      const {
        outer_pay_id,      // 外部支付单号（必填）
        pay_date,          // 支付日期（可选，默认当前时间）
        payment,           // 支付方式（可选，默认"其他支付"）
        seller_account,    // 收款账户（可选，默认"默认账户"）
        buyer_account,     // 买家支付账号（可选，默认用户ID）
        amount,            // 支付金额（可选，默认订单金额）
        update_order_status // 是否更新订单状态（可选，默认true）
      } = req.body;

      logger.info('PAYMENT', '手动更新订单支付信息', {
        userId,
        orderId,
        outer_pay_id,
        ip
      });

      // 参数验证
      if (!outer_pay_id) {
        return res.status(400).json({
          code: 400,
          message: "外部支付单号不能为空"
        });
      }

      // 1. 获取订单信息
      const orderResult = await pool.query(
        `SELECT o.* FROM orders o WHERE o.id = $1 AND o.user_id = $2`,
        [orderId, userId]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          code: 404,
          message: "订单不存在"
        });
      }

      const order = orderResult.rows[0];

      // 2. 使用事务更新订单和支付信息
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // 准备支付信息
        const paymentAmount = amount !== undefined 
          ? parseFloat(amount) 
          : parseFloat(order.pay_amount || order.total_amount);
        const paymentDate = pay_date ? new Date(pay_date) : new Date();
        const paymentMethod = payment || '其他支付';
        const sellerAcc = seller_account || '默认账户';
        const buyerAcc = buyer_account || order.shop_buyer_id || order.user_id.toString();

        // 2.1 插入或更新支付记录
        await client.query(
          `INSERT INTO order_payments (
            order_id, outer_pay_id, pay_date, payment, 
            seller_account, buyer_account, amount
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (order_id, outer_pay_id) DO UPDATE SET
            pay_date = EXCLUDED.pay_date,
            payment = EXCLUDED.payment,
            seller_account = EXCLUDED.seller_account,
            buyer_account = EXCLUDED.buyer_account,
            amount = EXCLUDED.amount,
            updated_at = CURRENT_TIMESTAMP`,
          [
            orderId,
            outer_pay_id,
            paymentDate,
            paymentMethod,
            sellerAcc,
            buyerAcc,
            paymentAmount
          ]
        );

        // 2.2 如果指定更新订单状态，则更新订单状态
        if (update_order_status !== false) {
          // 如果订单状态是待支付，更新为等待卖家发货
          if (order.shop_status === 'WAIT_BUYER_PAY') {
            await client.query(
              `UPDATE orders 
               SET shop_status = 'WAIT_SELLER_SEND_GOODS',
                   pay_amount = $1,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = $2`,
              [paymentAmount, orderId]
            );
          } else {
            // 只更新支付金额
            await client.query(
              `UPDATE orders 
               SET pay_amount = $1,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = $2`,
              [paymentAmount, orderId]
            );
          }
        }

        await client.query('COMMIT');

        const duration = Date.now() - startTime;
        logger.info('PAYMENT', '手动更新订单支付信息成功', {
          userId,
          orderId,
          orderNo: order.order_no,
          outer_pay_id,
          amount: paymentAmount,
          duration: `${duration}ms`,
          ip
        });

        // 3. 如果订单已同步到聚水潭，重新同步更新后的订单
        if (order.sync_status === 'success' && order.jst_o_id) {
          // 异步重新同步到聚水潭
          // 注意：这里不直接调用内部方法，而是通过订单更新接口触发同步
          // 或者可以在这里直接调用聚水潭同步逻辑
          logger.info('PAYMENT', '支付更新后需要重新同步到聚水潭', {
            userId,
            order_id: orderId,
            ip
          });
          // 如果需要立即同步，可以在这里调用同步逻辑
          // 但为了避免循环依赖，建议通过订单更新接口或定时任务来处理
        }

        return res.json({
          code: 0,
          message: "订单支付信息更新成功",
          data: {
            order_id: orderId,
            order_no: order.order_no,
            payment: {
              outer_pay_id,
              pay_date: paymentDate,
              payment: paymentMethod,
              amount: paymentAmount
            },
            order_status_updated: update_order_status !== false && order.shop_status === 'WAIT_BUYER_PAY'
          }
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const userId = req.user?.id || 'unknown';
      const ip = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"] || "unknown";

      logger.error('PAYMENT', '手动更新订单支付信息失败', {
        userId,
        order_id: req.params.order_id,
        error: error.message,
        stack: error.stack?.substring(0, 200),
        duration: `${duration}ms`,
        ip
      });

      return res.status(500).json({
        code: 500,
        message: error.message || "更新订单支付信息失败"
      });
    }
  }
}

module.exports = new PaymentController();

