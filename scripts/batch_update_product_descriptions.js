const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "ecommerce",
  user: "admin",
  password: "AxiaNBBB123"
});

// 从代码中提取的所有商品编码
const allProductCodes = [
  // 博主甄选
  'NBB-AWJ003', 'NBB-AWC004', 'NBB-AWKN002', 'NBB-AWH001',
  // 人宠同款
  'NBB-AWJ003', 'NBB-25AW004', 'NBB-AWD002', 'NBB-25AW003B', 'NBB-AWJ001A', 'NBB-AWJ001B', 
  'NBB-25AW001B', 'NBB-AWJ002', 'NBB-25AW002', 'NBB-AWC002', 'NBB-25AW007', 'NBB-AWD001', 
  'NBB-25AW008', 'NBB-AWJ005', 'NBB-25AW002',
  // 男款上装
  'NBB-AWJ001A', 'NBB-AWJ001B', 'NBB-AWJ002', 'NBB-AWJ003', 'NBB-AWC001', 'NBB-AWC002', 
  'NBB-AWJ005', 'NBB-AWJ004', 'NBB-AWJ006', 'NBB-AWKN002', 'NBB-AWKN001B', 'NBB-AWKN001A', 
  'NBB-AWD002', 'NBB-AWT001', 'NBB-AWT002',
  // 男款下装
  'NBB-AWTR001A', 'NBB-AWTR001B', 'NBB-AWTR004', 'NBB-AWTR009', 'NBB-AWTR005',
  // 女款上装
  'NBB-AWJ001A', 'NBB-AWJ001B', 'NBB-AWJ002', 'NBB-AWJ003', 'NBB-AWC001', 'NBB-AWC002', 
  'NBB-AWC004', 'NBB-AWC005', 'NBB-AWJ005', 'NBB-AWJ004', 'NBB-AWJ006', 'NBB-AWKN002', 
  'NBB-AWKN001B', 'NBB-AWKN001A', 'NBB-AWD001', 'NBB-AWD002', 'NBB-AWT001', 'NBB-AWT002',
  // 女款下装
  'NBB-AWTR001A', 'NBB-AWTR001B', 'NBB-AWTR003', 'NBB-AWTR004', 'NBB-AWTR007', 'NBB-AWTR008', 
  'NBB-AWTR005',
  // 宠物
  'NBB-25AW001B', 'NBB-25AW002', 'NBB-25AW003B', 'NBB-25AW004', 'NBB-25AW005', 'NBB-25AW007', 
  'NBB-25AW008', 'NBB-25AW009', 'NBB-25AW014', 'NBB-25AW016', 'NBB-25AW020', 'NBB-25AW011',
  // 帽子
  'NBB-AWH001', 'NBB-AWH002',
  // 配饰
  'NBB-AWZ001'
];

// 去重
const uniqueProductCodes = [...new Set(allProductCodes)];

// ============================================
// 请在这里填写要添加的描述内容
// ============================================
const DESCRIPTION_TO_ADD = `请在这里填写描述内容`;

async function batchUpdateDescriptions() {
  if (!DESCRIPTION_TO_ADD || DESCRIPTION_TO_ADD.trim() === '请在这里填写描述内容') {
    console.error('❌ 错误：请先填写 DESCRIPTION_TO_ADD 变量中的描述内容！');
    process.exit(1);
  }

  console.log(`\n开始批量更新商品描述...`);
  console.log(`商品总数: ${uniqueProductCodes.length}`);
  console.log(`描述内容: ${DESCRIPTION_TO_ADD.substring(0, 50)}...\n`);

  let successCount = 0;
  let failCount = 0;
  const errors = [];

  for (const productCode of uniqueProductCodes) {
    try {
      // 检查商品是否已存在
      const checkResult = await pool.query(
        `SELECT id, product_code, local_description FROM products WHERE product_code = $1`,
        [productCode]
      );

      if (checkResult.rows.length > 0) {
        // 更新现有商品
        await pool.query(
          `UPDATE products 
           SET local_description = $1, updated_at = CURRENT_TIMESTAMP
           WHERE product_code = $2`,
          [DESCRIPTION_TO_ADD.trim(), productCode]
        );
        console.log(`✅ 更新: ${productCode}`);
      } else {
        // 插入新商品记录
        await pool.query(
          `INSERT INTO products (product_code, local_description, created_at, updated_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [productCode, DESCRIPTION_TO_ADD.trim()]
        );
        console.log(`✅ 创建: ${productCode}`);
      }
      successCount++;
    } catch (error) {
      console.error(`❌ 失败: ${productCode} - ${error.message}`);
      errors.push({ productCode, error: error.message });
      failCount++;
    }
  }

  console.log(`\n========== 更新完成 ==========`);
  console.log(`成功: ${successCount} 个`);
  console.log(`失败: ${failCount} 个`);

  if (errors.length > 0) {
    console.log(`\n失败详情:`);
    errors.forEach(({ productCode, error }) => {
      console.log(`  - ${productCode}: ${error}`);
    });
  }

  await pool.end();
}

// 执行更新
batchUpdateDescriptions().catch(error => {
  console.error('执行失败:', error);
  process.exit(1);
});











