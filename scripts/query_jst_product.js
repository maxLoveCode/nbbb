/**
 * 聚水潭商品查询工具
 * 
 * 使用方法：
 * node scripts/query_jst_product.js <商品编码1> [商品编码2] ...
 * 
 * 示例：
 * node scripts/query_jst_product.js NBB-AWJ003
 * node scripts/query_jst_product.js NBB-AWJ003 NBB-AWTR001A NBB-AWTR004
 */

require('dotenv').config({ path: '.env' });
const axios = require('axios');
const crypto = require('crypto');

const partnerId = process.env.JST_PARTNER_ID;
const partnerKey = process.env.JST_PARTNER_KEY;
const appSecret = 'ab1f495da5e34053a64db4e2c23432b0';

// 从命令行参数获取商品编码
const productCodes = process.argv.slice(2);

if (!productCodes || productCodes.length === 0) {
  console.log('❌ 请提供商品编码');
  console.log('使用方法: node scripts/query_jst_product.js <商品编码1> [商品编码2] ...');
  console.log('示例: node scripts/query_jst_product.js NBB-AWJ003');
  process.exit(1);
}

if (!partnerId || !partnerKey) {
  console.error('❌ 缺少必要的配置 (JST_PARTNER_ID 或 JST_PARTNER_KEY)');
  process.exit(1);
}

// 使用正确的商品查询接口
const gateway = 'https://openapi.jushuitan.com/open/mall/item/query';
const timestamp = Math.floor(Date.now() / 1000);

const biz = {
  i_ids: productCodes,
  page_index: 1,
  page_size: 50
};

const params = {
  app_key: partnerId,
  access_token: partnerKey,
  timestamp: timestamp,
  charset: 'utf-8',
  version: '2',
  biz: JSON.stringify(biz)
};

// 生成签名
const toSign = Object.keys(params)
  .filter(k => k !== 'sign' && params[k] !== undefined && params[k] !== null)
  .sort()
  .map(k => `${k}${typeof params[k] === 'object' ? JSON.stringify(params[k]) : String(params[k])}`)
  .join('');

const raw = `${appSecret}${toSign}`;
params.sign = crypto.createHash('md5').update(raw, 'utf8').digest('hex').toLowerCase();

console.log('🔄 正在查询商品信息...');
console.log('  接口:', gateway);
console.log('  商品编码:', productCodes.join(', '));
console.log('');

axios.post(gateway, new URLSearchParams(params).toString(), {
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  timeout: 15000
}).then(response => {
  const result = response.data;
  console.log('📦 商品查询结果:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('响应码:', result.code);
  console.log('响应信息:', result.msg || '成功');
  
  if (result.code === 0 && result.data) {
    const items = result.data.datas || result.data.data?.datas || [];
    console.log('\n✅ 找到', items.length, '个商品\n');
    
    items.forEach((item, index) => {
      console.log(`商品 ${index + 1}:`);
      console.log('  商品编码:', item.i_id || item.item_code);
      console.log('  商品名称:', item.name || item.item_name);
      console.log('  销售价格:', item.s_price || item.sale_price || 'N/A');
      console.log('  成本价格:', item.c_price || item.cost_price || 'N/A');
      console.log('  品牌:', item.brand || 'N/A');
      console.log('  是否上架:', (item.onsale === 1 || item.onsale === '1') ? '是' : '否');
      console.log('  商品图片:', item.pic || item.pic_big || 'N/A');
      
      if (item.skus && item.skus.length > 0) {
        console.log('  SKU数量:', item.skus.length);
        item.skus.forEach((sku, i) => {
          console.log(`    SKU${i+1}: ${sku.sku_id}`);
          console.log(`      规格: ${sku.properties_value || 'N/A'}`);
          console.log(`      售价: ¥${sku.sale_price || sku.price || 'N/A'}`);
          console.log(`      成本: ¥${sku.cost_price || 'N/A'}`);
        });
      }
      console.log('');
    });
    
    // 显示第一个商品的完整JSON（如果只有一个商品）
    if (items.length === 1) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('完整商品信息 (JSON):');
      console.log(JSON.stringify(items[0], null, 2));
    }
  } else {
    console.log('❌ 查询失败或未找到商品');
    console.log('完整响应:', JSON.stringify(result, null, 2));
  }
}).catch(error => {
  console.error('❌ 请求失败:', error.message);
  if (error.response) {
    console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
  }
  process.exit(1);
});

