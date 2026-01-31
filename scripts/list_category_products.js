const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "ecommerce",
  user: "admin",
  password: "AxiaNBBB123"
});

async function listCategoryProducts() {
  try {
    // 1. 获取所有分类（包含层级关系）
    const categoriesResult = await pool.query(`
      SELECT 
        c1.id as level1_id,
        c1.name as level1_name,
        c1.sort_order as level1_sort,
        c2.id as level2_id,
        c2.name as level2_name,
        c2.product_codes,
        c2.sort_order as level2_sort
      FROM category_management c1
      LEFT JOIN category_management c2 ON c1.id = c2.parent_id
      WHERE c1.parent_id IS NULL
      ORDER BY c1.sort_order, c2.sort_order
    `);

    console.log("\n========== 类目及商品列表 ==========\n");

    // 按一级分类分组
    const level1Map = {};
    categoriesResult.rows.forEach(row => {
      if (!level1Map[row.level1_id]) {
        level1Map[row.level1_id] = {
          id: row.level1_id,
          name: row.level1_name,
          sort_order: row.level1_sort,
          children: []
        };
      }
      if (row.level2_id) {
        level1Map[row.level1_id].children.push({
          id: row.level2_id,
          name: row.level2_name,
          product_codes: row.product_codes || '',
          sort_order: row.level2_sort
        });
      }
    });

    // 输出结果
    Object.values(level1Map).forEach(level1 => {
      console.log(`\n【一级分类】${level1.name} (ID: ${level1.id}, 排序: ${level1.sort_order})`);
      console.log("─".repeat(60));
      
      if (level1.children.length === 0) {
        console.log("  暂无二级分类");
      } else {
        level1.children.forEach(level2 => {
          console.log(`\n  【二级分类】${level2.name} (ID: ${level2.id}, 排序: ${level2.sort_order})`);
          
          if (level2.product_codes) {
            const productCodes = level2.product_codes.split(';').filter(code => code.trim());
            if (productCodes.length > 0) {
              console.log(`  商品编码 (共 ${productCodes.length} 个):`);
              productCodes.forEach((code, index) => {
                console.log(`    ${index + 1}. ${code.trim()}`);
              });
            } else {
              console.log(`  商品编码: 无`);
            }
          } else {
            console.log(`  商品编码: 无`);
          }
        });
      }
    });

    // 统计信息
    const totalLevel1 = Object.keys(level1Map).length;
    const totalLevel2 = Object.values(level1Map).reduce((sum, cat) => sum + cat.children.length, 0);
    const totalProducts = Object.values(level1Map).reduce((sum, cat) => {
      return sum + cat.children.reduce((s, child) => {
        if (child.product_codes) {
          return s + child.product_codes.split(';').filter(c => c.trim()).length;
        }
        return s;
      }, 0);
    }, 0);

    console.log("\n" + "=".repeat(60));
    console.log("\n【统计信息】");
    console.log(`  一级分类数量: ${totalLevel1}`);
    console.log(`  二级分类数量: ${totalLevel2}`);
    console.log(`  商品总数: ${totalProducts}`);
    console.log("=".repeat(60) + "\n");

  } catch (error) {
    console.error("查询错误:", error);
  } finally {
    await pool.end();
  }
}

listCategoryProducts();








