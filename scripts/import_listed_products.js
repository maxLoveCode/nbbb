#!/usr/bin/env node

/**
 * 从Excel导入上架商品清单
 * 
 * 功能：
 * 1. 读取商品表.xlsx
 * 2. 提取商品编码（去重）
 * 3. 导入到 listed_products 表
 * 
 * 使用方法：
 * node scripts/import_listed_products.js
 */

const XLSX = require('xlsx');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// 数据库连接
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ecommerce',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'AxiaNBBB123'
});

/**
 * 解析类目
 */
function parseCategory(categoryStr) {
  if (!categoryStr) return null;
  // "女装/女士精品>>羽绒服" -> "羽绒服"
  const parts = categoryStr.split('>>');
  return parts.length > 1 ? parts[1].trim() : parts[0].trim();
}

/**
 * 从Excel读取商品数据
 */
function readExcel(filePath) {
  console.log(`📖 读取Excel文件: ${filePath}`);
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  // 跳过表头
  const rows = data.slice(1);
  
  // 按商品编码分组
  const products = new Map();
  
  for (const row of rows) {
    if (!row[0]) continue; // 跳过空行
    
    const [category, title, productCode, attrs, price, skuCode] = row;
    
    if (!productCode) continue;
    
    if (!products.has(productCode)) {
      products.set(productCode, {
        code: productCode,
        title,
        category: parseCategory(category),
        rawCategory: category,
        price: Math.round(price * 100), // 转为分
        skuCount: 0
      });
    }
    
    products.get(productCode).skuCount++;
  }
  
  console.log(`✅ 解析完成: ${products.size} 个商品, ${rows.length} 个SKU`);
  
  return Array.from(products.values());
}

/**
 * 导入到数据库
 */
async function importToDatabase(products) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`\n🔄 开始导入 ${products.length} 个商品...`);
    
    let insertCount = 0;
    let updateCount = 0;
    let skipCount = 0;
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      // 检查是否已存在
      const checkResult = await client.query(
        'SELECT id, is_active FROM listed_products WHERE product_code = $1',
        [product.code]
      );
      
      if (checkResult.rows.length > 0) {
        // 已存在，更新类目和价格提示
        await client.query(
          `UPDATE listed_products 
           SET category = $2, price_hint = $3, updated_at = CURRENT_TIMESTAMP
           WHERE product_code = $1`,
          [product.code, product.category, product.price]
        );
        updateCount++;
        console.log(`   ${i+1}/${products.length} 更新: ${product.code} - ${product.title.substring(0, 30)}...`);
      } else {
        // 不存在，插入新记录
        await client.query(
          `INSERT INTO listed_products (product_code, category, price_hint, display_order, notes)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            product.code,
            product.category,
            product.price,
            i, // 使用Excel中的顺序作为排序
            `${product.skuCount}个SKU - ${product.rawCategory}`
          ]
        );
        insertCount++;
        console.log(`   ${i+1}/${products.length} 新增: ${product.code} - ${product.title.substring(0, 30)}...`);
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ 导入完成！');
    console.log('='.repeat(80));
    console.log(`📊 统计信息:`);
    console.log(`   - 新增商品: ${insertCount}`);
    console.log(`   - 更新商品: ${updateCount}`);
    console.log(`   - 跳过商品: ${skipCount}`);
    console.log(`   - 总计: ${products.length}`);
    
    // 显示数据库当前状态
    const statsResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE is_active = false) as inactive
      FROM listed_products
    `);
    
    const stats = statsResult.rows[0];
    console.log(`\n📦 数据库状态:`);
    console.log(`   - 总商品数: ${stats.total}`);
    console.log(`   - 上架中: ${stats.active}`);
    console.log(`   - 已下架: ${stats.inactive}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 导入失败:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('='.repeat(80));
  console.log('📦 商品上架清单导入工具');
  console.log('='.repeat(80));
  
  const excelPath = path.join(__dirname, '..', '商品表.xlsx');
  
  try {
    // 1. 读取Excel
    const products = readExcel(excelPath);
    
    // 2. 导入数据库
    await importToDatabase(products);
    
    console.log('\n✨ 所有操作完成！');
    console.log('\n💡 下一步:');
    console.log('   1. 访问管理后台查看上架商品列表');
    console.log('   2. 前端调用API时会自动从聚水潭获取详细信息');
    console.log('   3. 可以在数据库中修改 is_active 字段控制上下架');
    console.log('   4. 可以修改 display_order 字段调整显示顺序');
    
  } catch (error) {
    console.error('\n❌ 执行失败:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 执行
if (require.main === module) {
  main();
}

module.exports = { readExcel, importToDatabase };




