/**
 * 网页端数据格式化工具
 * 将通用数据格式转换为网页端专用格式
 */

/**
 * 格式化商品数据（网页端格式）
 * 包含更多SEO相关信息
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
    originalPrice: product.cost_price,
    discount: calculateDiscount(product.price, product.cost_price),
    onsale: product.onsale,
    brand: product.brand,
    category: product.category,
    stock: product.stock,
    inStock: product.stock > 0,
    sku: (product.sku || []).map(s => ({
      id: s.sku_id,
      skuId: s.sku_id,
      properties: s.properties_value,
      price: s.price ? Math.round(s.price * 100) : product.price,
      stock: s.qty || 0,
      inStock: (s.qty || 0) > 0,
      image: s.pic
    })),
    properties: product.properties,
    seo: {
      title: product.name,
      description: product.description ? product.description.substring(0, 160) : '',
      keywords: [product.brand, product.category, product.name].filter(Boolean).join(',')
    }
  };
}

/**
 * 计算折扣
 */
function calculateDiscount(currentPrice, originalPrice) {
  if (!originalPrice || !currentPrice || originalPrice <= currentPrice) {
    return 0;
  }
  return Math.round((1 - currentPrice / originalPrice) * 100);
}

/**
 * 格式化商品列表（网页端格式）
 */
function formatProductList(products) {
  return (products || []).map(formatProduct);
}

/**
 * 格式化订单数据（网页端格式）
 */
function formatOrder(order) {
  if (!order) return null;

  return {
    id: order.id,
    orderNo: order.order_no,
    status: order.status,
    statusText: getOrderStatusText(order.status),
    statusColor: getOrderStatusColor(order.status),
    totalAmount: order.total_amount,
    freight: order.freight || 0,
    payAmount: order.pay_amount,
    receiver: {
      name: order.receiver_name,
      phone: order.receiver_phone || order.receiver_mobile,
      mobile: order.receiver_mobile,
      email: order.receiver_email,
      address: `${order.receiver_state}${order.receiver_city}${order.receiver_district}${order.receiver_address}`,
      zip: order.receiver_zip
    },
    items: (order.items || []).map(item => ({
      id: item.id,
      productCode: item.product_code,
      skuId: item.sku_id,
      name: item.name,
      image: item.pic,
      price: item.price,
      quantity: item.qty || item.quantity,
      amount: item.amount
    })),
    timeline: {
      created: order.created_at,
      paid: order.payment_time,
      shipped: order.ship_time,
      completed: order.finish_time,
      cancelled: order.cancel_time
    },
    createdAt: order.created_at,
    updatedAt: order.updated_at
  };
}

/**
 * 格式化订单列表（网页端格式）
 */
function formatOrderList(orders) {
  return (orders || []).map(formatOrder);
}

/**
 * 格式化用户信息（网页端格式）
 */
function formatUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    email: user.email,
    mobile: user.mobile,
    avatar: user.avatar_url,
    isActive: user.is_active,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}

/**
 * 格式化购物车数据（网页端格式）
 */
function formatCartItem(item) {
  if (!item) return null;

  return {
    id: item.id,
    productCode: item.product_code,
    skuId: item.sku_id,
    quantity: item.quantity || 1,
    selected: item.selected !== false,
    product: item.product ? formatProduct(item.product) : null,
    valid: item.valid !== false,
    invalidReason: item.invalid_reason,
    subtotal: item.product && item.product.price ? item.product.price * (item.quantity || 1) : 0
  };
}

/**
 * 格式化购物车列表（网页端格式）
 */
function formatCartList(items) {
  const formattedItems = (items || []).map(formatCartItem);
  const selectedItems = formattedItems.filter(item => item.selected && item.valid);
  const totalAmount = selectedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const totalCount = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

  return {
    items: formattedItems,
    summary: {
      totalItems: formattedItems.length,
      selectedItems: selectedItems.length,
      totalAmount,
      totalCount
    }
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
    'pending': 'warning',
    'paid': 'info',
    'processing': 'info',
    'shipped': 'primary',
    'completed': 'success',
    'cancelled': 'default',
    'refunding': 'warning',
    'refunded': 'default'
  };
  return colorMap[status] || 'default';
}

/**
 * 格式化响应（网页端标准格式）
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
 * 格式化错误响应（网页端格式）
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
  formatCartItem,
  formatCartList,
  formatResponse,
  formatError
};






