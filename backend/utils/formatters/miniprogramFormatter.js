/**
 * 小程序数据格式化工具
 * 将通用数据格式转换为小程序专用格式
 */

/**
 * 格式化商品数据（小程序格式）
 */
function formatProduct(product) {
  if (!product) return null;

  return {
    code: product.code,
    name: product.name,
    description: product.description,
    mainImage: product.main_image,
    images: product.images || [],
    price: product.price, // 单位：分
    originalPrice: product.original_price ?? null,
    publicPrice: product.public_price ?? product.price,
    priceNote: product.price_note ?? null,
    priceSource: product.price_source ?? "default",
    pricingTier: product.pricing_tier ?? "default",
    costPrice: product.cost_price,
    onsale: product.onsale,
    brand: product.brand,
    category: product.category,
    stock: product.stock,
    sku: (product.sku || []).map(s => ({
      skuId: s.sku_id,
      properties: s.properties_value,
      price: s.price ? Math.round(s.price * 100) : product.price,
      stock: s.qty || 0,
      image: s.pic
    })),
    properties: product.properties
  };
}

/**
 * 格式化商品列表（小程序格式）
 */
function formatProductList(products) {
  return (products || []).map(formatProduct);
}

/**
 * 格式化订单数据（小程序格式）
 */
function formatOrder(order) {
  if (!order) return null;

  return {
    id: order.id,
    orderNo: order.order_no,
    status: order.status,
    statusText: getOrderStatusText(order.status),
    totalAmount: order.total_amount,
    freight: order.freight || 0,
    payAmount: order.pay_amount,
    receiver: {
      name: order.receiver_name,
      mobile: order.receiver_mobile,
      address: `${order.receiver_state}${order.receiver_city}${order.receiver_district}${order.receiver_address}`
    },
    items: order.items || [],
    createdAt: order.created_at,
    paymentTime: order.payment_time,
    shipTime: order.ship_time
  };
}

/**
 * 格式化订单列表（小程序格式）
 */
function formatOrderList(orders) {
  return (orders || []).map(formatOrder);
}

/**
 * 格式化用户信息（小程序格式）
 */
function formatUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    openid: user.openid,
    nickname: user.nickname,
    avatarUrl: user.avatar_url,
    mobile: user.mobile,
    pricingTier: user.pricing_tier || "default",
    pricingDiscountRate: user.pricing_discount_rate ?? null
  };
}

/**
 * 格式化购物车数据（小程序格式）
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
    invalidReason: item.invalid_reason
  };
}

/**
 * 格式化购物车列表（小程序格式）
 */
function formatCartList(items) {
  return (items || []).map(formatCartItem);
}

/**
 * 获取订单状态文本
 */
function getOrderStatusText(status) {
  const statusMap = {
    'pending': '待支付',
    'paid': '已支付',
    'shipped': '已发货',
    'completed': '已完成',
    'cancelled': '已取消',
    'refunding': '退款中',
    'refunded': '已退款'
  };
  return statusMap[status] || status;
}

/**
 * 格式化响应（小程序标准格式）
 */
function formatResponse(data, message = 'success') {
  return {
    code: 0,
    message,
    data
  };
}

/**
 * 格式化错误响应（小程序格式）
 */
function formatError(message, code = 400, details = null) {
  const response = {
    code,
    message
  };
  
  if (details) {
    response.details = details;
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






