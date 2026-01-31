/**
 * 图片URL转换工具
 * 用于处理聚水潭返回的HTTP图片URL，转换为HTTPS或代理URL
 */

/**
 * 转换图片URL
 * @param {string} imageUrl - 原始图片URL
 * @param {Object} options - 配置选项
 * @returns {string} 转换后的图片URL
 */
function convertImageUrl(imageUrl, options = {}) {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return imageUrl || '';
  }

  // 如果已经是完整URL，直接处理
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    // 将 HTTP 转换为 HTTPS
    if (imageUrl.startsWith('http://')) {
      // 方案1: 直接替换为HTTPS（如果目标服务器支持HTTPS）
      if (options.forceHttps !== false) {
        imageUrl = imageUrl.replace('http://', 'https://');
      }
      
      // 方案2: 使用图片代理服务（如果配置了代理）
      if (options.proxyUrl) {
        return `${options.proxyUrl}?url=${encodeURIComponent(imageUrl)}`;
      }
      
      // 方案3: 使用CDN代理（如果配置了CDN）
      if (options.cdnUrl) {
        const path = imageUrl.replace('http://', '').replace('https://', '');
        return `${options.cdnUrl}/${path}`;
      }
    }
    
    return imageUrl;
  }

  // 如果是相对路径，添加基础URL
  if (imageUrl.startsWith('/')) {
    const baseUrl = options.baseUrl || process.env.BASE_URL || '';
    return baseUrl ? `${baseUrl}${imageUrl}` : imageUrl;
  }

  return imageUrl;
}

/**
 * 批量转换图片URL
 * @param {Array|Object} data - 需要转换的数据（数组或对象）
 * @param {Object} options - 配置选项
 * @returns {Array|Object} 转换后的数据
 */
function convertImageUrls(data, options = {}) {
  if (Array.isArray(data)) {
    return data.map(item => convertImageUrls(item, options));
  }

  if (data && typeof data === 'object') {
    const converted = {};
    for (const [key, value] of Object.entries(data)) {
      // 转换常见的图片字段
      if (key === 'pic' || key === 'image' || key === 'image_url' || 
          key === 'avatar' || key === 'avatar_url' || key === 'background' ||
          key === 'pics' || key === 'images') {
        if (Array.isArray(value)) {
          converted[key] = value.map(url => convertImageUrl(url, options));
        } else {
          converted[key] = convertImageUrl(value, options);
        }
      } else if (key === 'skus' && Array.isArray(value)) {
        // 处理SKU中的图片
        converted[key] = value.map(sku => ({
          ...sku,
          pic: convertImageUrl(sku.pic, options)
        }));
      } else if (typeof value === 'object' && value !== null) {
        // 递归处理嵌套对象
        converted[key] = convertImageUrls(value, options);
      } else {
        converted[key] = value;
      }
    }
    return converted;
  }

  return data;
}

/**
 * 检查URL是否为HTTP（需要转换）
 * @param {string} url - 图片URL
 * @returns {boolean} 是否为HTTP
 */
function isHttpUrl(url) {
  return url && typeof url === 'string' && url.startsWith('http://');
}

/**
 * 检查URL是否为HTTPS
 * @param {string} url - 图片URL
 * @returns {boolean} 是否为HTTPS
 */
function isHttpsUrl(url) {
  return url && typeof url === 'string' && url.startsWith('https://');
}

module.exports = {
  convertImageUrl,
  convertImageUrls,
  isHttpUrl,
  isHttpsUrl
};

