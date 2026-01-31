const express = require('express');
const router = express.Router();
const orderService = require('../../services/orderService');
const adminFormatter = require('../../utils/formatters/adminFormatter');
const adminAuth = require('../../middleware/adminAuth');

// 所有订单管理接口都需要管理员认证
// router.use(adminAuth);

// 获取所有订单列表（管理视图）
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      status = null,
      keyword = "",
      startDate = null,
      endDate = null
    } = req.query;

    const result = await orderService.getAllOrders({
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      status,
      keyword,
      startDate,
      endDate
    });

    res.json(adminFormatter.formatListResponse(
      adminFormatter.formatOrderList(result.orders),
      result.pagination
    ));
  } catch (error) {
    res.status(500).json(adminFormatter.formatError("获取订单列表失败: " + error.message, 500));
  }
});

// 获取订单详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderService.getOrderDetail(parseInt(id));

    if (!order) {
      return res.status(404).json(adminFormatter.formatError("订单不存在", 404));
    }

    res.json(adminFormatter.formatResponse(adminFormatter.formatOrder(order)));
  } catch (error) {
    res.status(500).json(adminFormatter.formatError("获取订单详情失败: " + error.message, 500));
  }
});

// 更新订单状态
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedOrder = await orderService.updateOrderStatus(parseInt(id), status);

    res.json(adminFormatter.formatResponse(
      adminFormatter.formatOrder(updatedOrder),
      '订单状态更新成功'
    ));
  } catch (error) {
    res.status(500).json(adminFormatter.formatError("更新订单状态失败: " + error.message, 500));
  }
});

module.exports = router;






