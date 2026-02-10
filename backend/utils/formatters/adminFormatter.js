/**
 * 后台管理数据格式化工具
 * 将通用数据格式转换为管理端专用格式（包含更多管理信息）
 */

/**
 * 格式化商品数据（管理端格式）
 * 包含更多管理相关信息
 */
function formatProduct(product) {
  if (!product) return null;

  return {
    id: product.code,
    code: product.code,
    name: product.name,
    description: product.description,
    mainImage: product.main_image,
    images: product.images || [],
    price: product.price, // 单位：分
    costPrice: product.cost_price,
    profit: product.price && product.cost_price ? product.price - product.cost_price : 0,
    profitMargin: calculateProfitMargin(product.price, product.cost_price),
    onsale: product.onsale,
    brand: product.brand,
    category: product.category,
    stock: product.stock,
    stockStatus: getStockStatus(product.stock),
    sku: (product.sku || []).map(s => ({
      id: s.sku_id,
      skuId: s.sku_id,
      properties: s.properties_value,
      price: s.price ? Math.round(s.price * 100) : product.price,
      costPrice: s.cost_price ? Math.round(s.cost_price * 100) : product.cost_price,
      stock: s.qty || 0,
      stockStatus: getStockStatus(s.qty || 0),
      image: s.pic
    })),
    properties: product.properties,
    created: product.created,
    modified: product.modified
  };
}

/**
 * 计算利润率
 */
function calculateProfitMargin(price, costPrice) {
  if (!price || !costPrice || costPrice === 0) {
    return 0;
  }
  return Math.round(((price - costPrice) / costPrice) * 100);
}

/**
 * 获取库存状态
 */
function getStockStatus(stock) {
  if (stock === 0) return 'out_of_stock';
  if (stock < 10) return 'low_stock';
  if (stock < 50) return 'normal';
  return 'sufficient';
}

/**
 * 格式化商品列表（管理端格式）
 */
function formatProductList(products) {
  return (products || []).map(formatProduct);
}

/**
 * 格式化订单数据（管理端格式）
 */
function formatOrder(order) {
  if (!order) return null;

  return {
    id: order.id,
    orderNo: order.order_no,
    userId: order.user_id,
    status: order.status,
    statusText: getOrderStatusText(order.status),
    statusColor: getOrderStatusColor(order.status),
    shopStatus: order.shop_status,
    totalAmount: order.total_amount,
    freight: order.freight || 0,
    payAmount: order.pay_amount,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    receiver: {
      name: order.receiver_name,
      phone: order.receiver_phone,
      mobile: order.receiver_mobile,
      email: order.receiver_email,
      state: order.receiver_state,
      city: order.receiver_city,
      district: order.receiver_district,
      address: order.receiver_address,
      fullAddress: `${order.receiver_state}${order.receiver_city}${order.receiver_district}${order.receiver_address}`,
      zip: order.receiver_zip
    },
    items: (order.items || []).map(item => ({
      id: item.id,
      productCode: item.product_code,
      skuId: item.sku_id,
      shopSkuId: item.shop_sku_id,
      name: item.name,
      properties: item.properties_value,
      image: item.pic,
      price: item.price,
      basePrice: item.base_price,
      quantity: item.qty || item.quantity,
      amount: item.amount,
      refundQty: item.refund_qty || 0,
      refundStatus: item.refund_status
    })),
    logistics: {
      company: order.logistics_company,
      lcId: order.lc_id,
      trackingNumber: order.l_id
    },
    jst: {
      orderId: order.jst_order_id,
      soId: order.jst_so_id,
      syncStatus: order.jst_sync_status,
      syncTime: order.jst_sync_time,
      syncError: order.jst_sync_error
    },
    timeline: {
      created: order.created_at,
      paid: order.payment_time,
      shipped: order.ship_time,
      completed: order.finish_time,
      cancelled: order.cancel_time
    },
    buyerMessage: order.buyer_message,
    remark: order.remark,
    labels: order.labels,
    createdAt: order.created_at,
    updatedAt: order.updated_at
  };
}

/**
 * 格式化订单列表（管理端格式）
 */
function formatOrderList(orders) {
  return (orders || []).map(formatOrder);
}

/**
 * 格式化用户信息（管理端格式）
 */
function formatUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    openid: user.openid ? `${user.openid.substring(0, 8)}****` : null, // 脱敏
    username: user.username,
    nickname: user.nickname,
    email: user.email,
    mobile: user.mobile,
    avatar: user.avatar_url,
    isActive: user.is_active,
    status: user.is_active ? 'active' : 'inactive',
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}

/**
 * 格式化用户列表（管理端格式）
 */
function formatUserList(users) {
  return (users || []).map(formatUser);
}

/**
 * 格式化管理员信息
 */
function formatAdmin(admin) {
  if (!admin) return null;

  return {
    id: admin.id,
    username: admin.username,
    realName: admin.real_name,
    email: admin.email,
    mobile: admin.mobile,
    avatar: admin.avatar_url,
    roleId: admin.role_id,
    roleName: admin.role_name,
    status: admin.status,
    lastLogin: {
      time: admin.last_login_at,
      ip: admin.last_login_ip
    },
    loginCount: admin.login_count,
    createdAt: admin.created_at,
    updatedAt: admin.updated_at
  };
}

/**
 * 获取订单状态文本
 */
function getOrderStatusText(status) {
  const statusMap = {
    'pending': '待支付',
    'paid': '已支付',
    'processing': '处理中',
    'shipped': '已发货',
    'completed': '已完成',
    'cancelled': '已取消',
    'refunding': '退款中',
    'refunded': '已退款'
  };
  return statusMap[status] || status;
}

/**
 * 获取订单状态颜色
 */
function getOrderStatusColor(status) {
  const colorMap = {
    'pending': 'orange',
    'paid': 'blue',
    'processing': 'cyan',
    'shipped': 'purple',
    'completed': 'green',
    'cancelled': 'default',
    'refunding': 'orange',
    'refunded': 'default'
  };
  return colorMap[status] || 'default';
}

/**
 * 格式化响应（管理端标准格式）
 */
function formatResponse(data, message = 'success') {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

/**
 * 格式化列表响应（带分页）
 */
function formatListResponse(items, pagination, message = 'success') {
  return {
    success: true,
    message,
    data: {
      items,
      pagination
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * 格式化错误响应（管理端格式）
 */
function formatError(message, code = 400, details = null) {
  const response = {
    success: false,
    error: {
      code,
      message
    },
    timestamp: new Date().toISOString()
  };
  
  if (details) {
    response.error.details = details;
  }
  
  return response;
}

module.exports = {
  formatProduct,
  formatProductList,
  formatOrder,
  formatOrderList,
  formatUser,
  formatUserList,
  formatAdmin,
  formatResponse,
  formatListResponse,
  formatError
};






