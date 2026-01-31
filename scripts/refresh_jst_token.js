/**
 * 聚水潭Token刷新工具
 * 
 * 使用方法：
 * node scripts/refresh_jst_token.js
 * 
 * 或者提供refresh_token作为参数：
 * node scripts/refresh_jst_token.js <refresh_token>
 */

const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 从.env文件读取配置
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  });
  
  return env;
}

// 聚水潭获取access_token
async function getAccessToken(refreshToken) {
  const env = loadEnv();
  const partnerId = env.JST_PARTNER_ID || 'a3e55a4a70e74fdcae35526d8077460f';
  const appSecret = 'ab1f495da5e34053a64db4e2c23432b0'; // 固定值
  // 正式环境接口地址
  const gateway = 'https://openapi.jushuitan.com/openWeb/auth/getInitToken';
  // 测试环境：https://dev-api.jushuitan.com/openWebIsv/auth/getInitToken
  
  if (!refreshToken) {
    refreshToken = env.JST_REFRESH_TOKEN || '6448ea500b67487f96a3f44b432f8346';
  }
  
  const timestamp = Math.floor(Date.now() / 1000);
  
  // 构建参数
  // 注意：根据文档，code是"随机码（随机创建六位字符串）自定义值"
  // 但在access_token过期后，可能需要使用refresh_token作为code
  // 如果refresh_token是32位，可能需要作为code使用
  const params = {
    app_key: partnerId,
    code: refreshToken, // 使用refresh_token作为code（过期后刷新场景）
    grant_type: 'authorization_code',
    timestamp: timestamp.toString(), // 文档要求是string类型
    charset: 'utf-8'
    // 注意：文档中没有version参数，移除它
  };
  
  // 生成签名
  const toSign = Object.keys(params)
    .filter(k => k !== 'sign' && params[k] !== undefined && params[k] !== null)
    .sort()
    .map(k => `${k}${typeof params[k] === 'object' ? JSON.stringify(params[k]) : String(params[k])}`)
    .join('');
  
  const raw = `${appSecret}${toSign}`;
  const sign = crypto.createHash('md5').update(raw, 'utf8').digest('hex').toLowerCase();
  params.sign = sign;
  
  console.log('📋 请求信息:');
  console.log('  接口:', gateway);
  console.log('  app_key:', partnerId);
  console.log('  refresh_token:', refreshToken.substring(0, 8) + '...');
  console.log('  签名:', sign.substring(0, 16) + '...');
  
  try {
    const response = await axios.post(gateway, new URLSearchParams(params).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000
    });
    
    console.log('\n📥 响应:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.code === 0 && response.data.data) {
      const newAccessToken = response.data.data.access_token;
      const newRefreshToken = response.data.data.refresh_token;
      
      console.log('\n✅ 成功获取新的token!');
      console.log('  新的access_token:', newAccessToken);
      if (newRefreshToken) {
        console.log('  新的refresh_token:', newRefreshToken);
      }
      
      // 更新.env文件
      const envPath = path.join(__dirname, '..', '.env');
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      // 更新JST_PARTNER_KEY
      envContent = envContent.replace(
        /^JST_PARTNER_KEY=.*/m,
        `JST_PARTNER_KEY=${newAccessToken}`
      );
      
      // 更新或添加refresh_token
      if (newRefreshToken) {
        if (!envContent.includes('JST_REFRESH_TOKEN')) {
          envContent += `\n# 聚水潭refresh_token (用于刷新access_token)\nJST_REFRESH_TOKEN=${newRefreshToken}\n`;
        } else {
          envContent = envContent.replace(
            /^JST_REFRESH_TOKEN=.*/m,
            `JST_REFRESH_TOKEN=${newRefreshToken}`
          );
        }
      }
      
      fs.writeFileSync(envPath, envContent);
      console.log('\n✅ .env文件已自动更新');
      
      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken || refreshToken
      };
    } else {
      console.error('\n❌ 获取失败:', response.data.msg || response.data.message);
      console.log('\n可能的原因:');
      console.log('  1. refresh_token已过期（需要在过期前12小时内调用）');
      console.log('  2. refresh_token无效');
      console.log('  3. 签名验证失败（请检查appSecret是否正确）');
      console.log('  4. 参数格式不正确');
      return null;
    }
  } catch (error) {
    console.error('\n❌ 请求异常:', error.message);
    if (error.response) {
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// 主函数
async function main() {
  const refreshToken = process.argv[2];
  
  console.log('🔄 聚水潭Token刷新工具\n');
  
  try {
    const result = await getAccessToken(refreshToken);
    if (result) {
      console.log('\n✅ Token刷新完成！');
      console.log('请重启服务以使新配置生效:');
      console.log('  pkill -f "node.*server.js"');
      console.log('  node backend/server.js');
      process.exit(0);
    } else {
      console.log('\n⚠️  未能获取新的access_token');
      console.log('建议:');
      console.log('  1. 确认refresh_token是否在有效期内（过期前12小时）');
      console.log('  2. 联系聚水潭技术支持获取新的access_token');
      console.log('  3. 手动更新.env文件中的JST_PARTNER_KEY');
      process.exit(1);
    }
  } catch (error) {
    console.error('执行失败:', error);
    process.exit(1);
  }
}

main();

