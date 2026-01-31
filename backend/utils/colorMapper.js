/**
 * 颜色名称到HEX值的映射工具
 * 支持常见的中文颜色名称转换为HEX颜色值
 */

const colorMap = {
  // 基础颜色
  '黑色': '#000000',
  '白色': '#FFFFFF',
  '灰色': '#808080',
  '深灰色': '#696969',
  '浅灰色': '#D3D3D3',
  
  // 棕色系
  '棕色': '#A52A2A',
  '深棕色': '#654321',
  '浅棕色': '#D2691E',
  '咖啡色': '#6F4E37',
  '卡其色': '#C3B091',
  '驼色': '#C19A6B',
  '米色': '#F5F5DC',
  '杏色': '#FFE4B5',
  
  // 红色系
  '红色': '#FF0000',
  '深红色': '#8B0000',
  '浅红色': '#FF6347',
  '粉红色': '#FFC0CB',
  '玫红色': '#FF1493',
  '酒红色': '#800020',
  '枣红色': '#8B0000',
  '樱桃红': '#DE3163',
  
  // 蓝色系
  '蓝色': '#0000FF',
  '深蓝色': '#00008B',
  '浅蓝色': '#87CEEB',
  '天蓝色': '#87CEEB',
  '海军蓝': '#000080',
  '宝蓝色': '#4169E1',
  '藏青色': '#000080',
  
  // 绿色系
  '绿色': '#008000',
  '深绿色': '#006400',
  '浅绿色': '#90EE90',
  '草绿色': '#7CFC00',
  '墨绿色': '#2F4F2F',
  '军绿色': '#556B2F',
  '橄榄绿': '#808000',
  
  // 黄色系
  '黄色': '#FFFF00',
  '深黄色': '#B8860B',
  '浅黄色': '#FFFFE0',
  '金色': '#FFD700',
  '香槟色': '#F7E7CE',
  
  // 紫色系
  '紫色': '#800080',
  '深紫色': '#4B0082',
  '浅紫色': '#DA70D6',
  '紫罗兰': '#8A2BE2',
  
  // 橙色系
  '橙色': '#FFA500',
  '深橙色': '#FF8C00',
  '浅橙色': '#FFE4B5',
  
  // 其他常见颜色
  '米白色': '#F5F5DC',
  '象牙白': '#FFFFF0',
  '乳白色': '#FAF0E6',
  '本白色': '#FFFAF0',
  '纯白色': '#FFFFFF',
  '纯黑色': '#000000',
  '炭黑色': '#1C1C1C',
  '银灰色': '#C0C0C0',
  '香槟金': '#F7E7CE',
  '玫瑰金': '#E8B4B8',
  '古铜色': '#CD7F32',
  '青铜色': '#B87333',
};

/**
 * 根据颜色名称获取HEX值
 * @param {string} colorName - 颜色名称（中文）
 * @returns {string} HEX颜色值，如果找不到则返回默认值
 */
function getColorHex(colorName) {
  if (!colorName || typeof colorName !== 'string') {
    return '#808080'; // 默认灰色
  }
  
  // 去除空格和特殊字符
  const normalizedName = colorName.trim();
  
  // 精确匹配
  if (colorMap[normalizedName]) {
    return colorMap[normalizedName];
  }
  
  // 模糊匹配（包含关键词）
  for (const [key, value] of Object.entries(colorMap)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return value;
    }
  }
  
  // 如果包含"色"字，尝试去掉"色"字再匹配
  if (normalizedName.endsWith('色')) {
    const nameWithoutSuffix = normalizedName.slice(0, -1);
    if (colorMap[nameWithoutSuffix]) {
      return colorMap[nameWithoutSuffix];
    }
  }
  
  // 默认返回灰色
  return '#808080';
}

/**
 * 批量获取颜色HEX值
 * @param {string[]} colorNames - 颜色名称数组
 * @returns {Object} { colorName: hexValue }
 */
function getColorHexMap(colorNames) {
  const result = {};
  if (Array.isArray(colorNames)) {
    colorNames.forEach(color => {
      result[color] = getColorHex(color);
    });
  }
  return result;
}

/**
 * 添加新的颜色映射
 * @param {string} colorName - 颜色名称
 * @param {string} hexValue - HEX值
 */
function addColorMapping(colorName, hexValue) {
  if (colorName && hexValue && /^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
    colorMap[colorName] = hexValue.toUpperCase();
  }
}

module.exports = {
  getColorHex,
  getColorHexMap,
  addColorMapping,
  colorMap // 导出映射表供查看
};














