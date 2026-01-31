#!/usr/bin/env node

/**
 * 从Excel导入类目数据到categories表
 * 以Excel中的实际类目为准
 */

const XLSX = require('xlsx');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ecommerce',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'AxiaNBBB123'
});

/**
 * 从Excel提取类目
 */
function extractCategories(filePath) {
  console.log(`📖 读取Excel文件: ${filePath}`);
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  const categoriesSet = new Set();
  
  // 跳过表头，收集所有类目
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // 跳过空行
    
    const category = row[0]; // 第一列是类目名称
    categoriesSet.add(category);
  }
  
  console.log(`✅ 提取到 ${categoriesSet.size} 个唯一类目`);
  
  return Array.from(categoriesSet);
}

/**
 * 解析类目层级
 */
function parseCategories(rawCategories) {
  const categoryTree = {
    rootCategories: new Map(),
    subCategories: new Map()
  };
  
  rawCategories.forEach(raw => {
    // 格式: "女装/女士精品>>羽绒服" 或 "宠物/宠物食品及用品>>宠物服饰及配件>>狗宠物服装/雨衣"
    const parts = raw.split('>>');
    
    if (parts.length === 1) {
      // 只有一级类目
      const level1 = simplifyCategory(parts[0]);
      if (!categoryTree.rootCategories.has(level1)) {
        categoryTree.rootCategories.set(level1, {
          name: level1,
          raw: parts[0],
          count: 0
        });
      }
      categoryTree.rootCategories.get(level1).count++;
    } else {
      // 有二级类目
      const level1 = simplifyCategory(parts[0]);
      const level2 = parts[1].trim();
      
      // 添加一级类目
      if (!categoryTree.rootCategories.has(level1)) {
        categoryTree.rootCategories.set(level1, {
          name: level1,
          raw: parts[0],
          count: 0
        });
      }
      
      // 添加二级类目
      const key = `${level1}|${level2}`;
      if (!categoryTree.subCategories.has(key)) {
        categoryTree.subCategories.set(key, {
          parent: level1,
          name: level2,
          raw: raw,
          count: 0
        });
      }
      categoryTree.subCategories.get(key).count++;
    }
  });
  
  return categoryTree;
}

/**
 * 简化一级类目名称
 */
function simplifyCategory(rawName) {
  // "女装/女士精品" -> "女装"
  // "宠物/宠物食品及用品" -> "宠物"
  // "服饰配件/皮带/帽子/围巾" -> "配饰"
  
  if (rawName.includes('女装')) return '女装';
  if (rawName.includes('男装')) return '男装';
  if (rawName.includes('宠物')) return '宠物';
  if (rawName.includes('配件') || rawName.includes('帽子') || rawName.includes('围巾')) return '配饰';
  if (rawName.includes('其他')) return '其他';
  
  // 默认返回第一部分
  return rawName.split('/')[0].split('>>')[0].trim();
}

/**
 * 导入到数据库
 */
async function importToDatabase(categoryTree) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('\n🔄 开始导入类目...');
    
    // 1. 清空现有数据
    console.log('   清空现有类目数据...');
    // 先删除关联的products数据，或将其category_id设为NULL
    await client.query('UPDATE products SET category_id = NULL WHERE category_id IS NOT NULL');
    await client.query('DELETE FROM categories');
    
    // 2. 插入一级类目
    console.log('\n   插入一级类目:');
    const rootCategoryIds = new Map();
    
    for (const [name, info] of categoryTree.rootCategories) {
      const result = await client.query(
        `INSERT INTO categories (name, description, is_active)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [name, `${info.raw} (${info.count}个商品)`, true]
      );
      
      rootCategoryIds.set(name, result.rows[0].id);
      console.log(`   ✅ [ID:${result.rows[0].id}] ${name}`);
    }
    
    // 3. 插入二级类目
    console.log('\n   插入二级类目:');
    let subCategoryCount = 0;
    
    for (const [key, info] of categoryTree.subCategories) {
      const parentId = rootCategoryIds.get(info.parent);
      
      if (!parentId) {
        console.warn(`   ⚠️  跳过: ${info.name} (找不到父类目: ${info.parent})`);
        continue;
      }
      
      await client.query(
        `INSERT INTO categories (name, description, parent_id, is_active)
         VALUES ($1, $2, $3, $4)`,
        [info.name, `${info.count}个商品`, parentId, true]
      );
      
      subCategoryCount++;
      console.log(`   ✅ ${info.parent} -> ${info.name}`);
    }
    
    await client.query('COMMIT');
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ 导入完成！');
    console.log('='.repeat(80));
    console.log(`📊 统计信息:`);
    console.log(`   - 一级类目: ${rootCategoryIds.size}`);
    console.log(`   - 二级类目: ${subCategoryCount}`);
    console.log(`   - 总计: ${rootCategoryIds.size + subCategoryCount}`);
    
    // 4. 显示导入结果
    const result = await client.query(`
      SELECT 
        c1.id,
        c1.name,
        c1.description,
        c2.name as parent_name,
        (SELECT COUNT(*) FROM categories WHERE parent_id = c1.id) as child_count
      FROM categories c1
      LEFT JOIN categories c2 ON c1.parent_id = c2.id
      ORDER BY c1.parent_id NULLS FIRST, c1.id;
    `);
    
    console.log('\n📋 导入结果:');
    result.rows.forEach(cat => {
      if (!cat.parent_name) {
        // 一级类目
        console.log(`\n   [ID:${cat.id}] ${cat.name} (${cat.child_count}个子类目)`);
        console.log(`   ${cat.description}`);
      } else {
        // 二级类目
        console.log(`      └─ [ID:${cat.id}] ${cat.name} - ${cat.description}`);
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ 导入失败:', error.message);
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
  console.log('📦 从Excel导入类目到数据库');
  console.log('='.repeat(80));
  
  const excelPath = path.join(__dirname, '..', '商品表.xlsx');
  
  try {
    // 1. 从Excel提取类目
    const rawCategories = extractCategories(excelPath);
    
    // 2. 解析类目层级
    const categoryTree = parseCategories(rawCategories);
    
    console.log('\n📊 类目结构分析:');
    console.log(`   - 一级类目: ${categoryTree.rootCategories.size}`);
    console.log(`   - 二级类目: ${categoryTree.subCategories.size}`);
    
    // 3. 导入到数据库
    await importToDatabase(categoryTree);
    
    console.log('\n✨ 所有操作完成！');
    console.log('\n💡 下一步:');
    console.log('   1. 可以查询 categories 表查看导入的类目');
    console.log('   2. 前端可以使用这些类目进行筛选');
    console.log('   3. 可以关联 listed_products 表建立类目关系');
    
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

module.exports = { extractCategories, parseCategories, importToDatabase };

