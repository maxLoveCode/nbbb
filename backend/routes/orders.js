const express = require('express');
const router = express.Router();
const orderService = require('../services/orderService');
const auth = require('../middleware/auth');

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
