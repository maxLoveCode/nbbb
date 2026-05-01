const express = require('express');
const router = express.Router();
const userService = require('../../services/userService');
const adminFormatter = require('../../utils/formatters/adminFormatter');
const adminAuth = require('../../middleware/adminAuth');

// 所有用户管理接口都需要管理员认证
// router.use(adminAuth);

// 获取用户列表
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      keyword = "",
      status = null
    } = req.query;

    const result = await userService.getUserList({
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      keyword,
      status: status === 'true' ? true : (status === 'false' ? false : null)
    });

    res.json(adminFormatter.formatListResponse(
      adminFormatter.formatUserList(result.users),
      result.pagination
    ));
  } catch (error) {
    res.status(500).json(adminFormatter.formatError("获取用户列表失败: " + error.message, 500));
  }
});

// 获取用户详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(parseInt(id));

    if (!user) {
      return res.status(404).json(adminFormatter.formatError("用户不存在", 404));
    }

    res.json(adminFormatter.formatResponse(adminFormatter.formatUser(user)));
  } catch (error) {
    res.status(500).json(adminFormatter.formatError("获取用户详情失败: " + error.message, 500));
  }
});

router.put('/:id/pricing', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { is_whitelist } = req.body || {};

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json(adminFormatter.formatError("用户ID无效", 400));
    }

    const updatedUser = await userService.updateUserPricing(userId, {
      pricingTier: is_whitelist ? 'whitelist' : 'default',
      pricingDiscountRate: is_whitelist ? 0.3 : null
    });

    if (!updatedUser) {
      return res.status(404).json(adminFormatter.formatError("用户不存在", 404));
    }

    return res.json(
      adminFormatter.formatResponse(
        adminFormatter.formatUser(updatedUser),
        is_whitelist ? '白名单已开启' : '白名单已关闭'
      )
    );
  } catch (error) {
    return res.status(500).json(adminFormatter.formatError("更新价格白名单失败: " + error.message, 500));
  }
});

module.exports = router;






