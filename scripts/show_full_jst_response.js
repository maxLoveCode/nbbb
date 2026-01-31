require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const jushuitanClient = require("../backend/services/jushuitanClient");

async function showFullResponse(productCode) {
  try {
    console.log(`\n正在查询商品: ${productCode}...\n`);

    // 调用聚水潭商品查询接口
    const biz = {
      i_ids: [productCode],
      page_index: 1,
      page_size: 30
    };

    const result = await jushuitanClient.call(
      "jushuitan.item.query",
      biz,
      {},
      "https://openapi.jushuitan.com/open/mall/item/query"
    );

    console.log("=".repeat(80));
    console.log("聚水潭API完整响应数据:");
    console.log("=".repeat(80));
    console.log(JSON.stringify(result, null, 2));
    console.log("=".repeat(80));
    
    // 同时显示结构化的信息
    console.log("\n【响应结构分析】");
    console.log(`code: ${result.code}`);
    console.log(`msg: ${result.msg || 'N/A'}`);
    
    if (result.data) {
      console.log("\ndata 字段存在");
      if (result.data.datas) {
        console.log(`  - datas 数组长度: ${result.data.datas.length}`);
      }
      if (result.data.page_index) {
        console.log(`  - page_index: ${result.data.page_index}`);
      }
      if (result.data.page_size) {
        console.log(`  - page_size: ${result.data.page_size}`);
      }
      if (result.data.has_next !== undefined) {
        console.log(`  - has_next: ${result.data.has_next}`);
      }
      if (result.data.data_count !== undefined) {
        console.log(`  - data_count: ${result.data.data_count}`);
      }
    }
    
    // 显示第一个商品的完整字段
    if (result.data && result.data.datas && result.data.datas.length > 0) {
      const item = result.data.datas[0];
      console.log("\n【第一个商品的所有字段】");
      console.log(JSON.stringify(item, null, 2));
      
      if (item.skus || item.itemsku) {
        const skus = item.skus || item.itemsku || [];
        console.log(`\n【SKU数量】: ${skus.length}`);
        if (skus.length > 0) {
          console.log("\n【第一个SKU的所有字段】");
          console.log(JSON.stringify(skus[0], null, 2));
        }
      }
    }

  } catch (error) {
    console.error("查询错误:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

// 从命令行参数获取商品编码
const productCode = process.argv[2] || 'NBB-AWTR004';

showFullResponse(productCode).then(() => {
  process.exit(0);
}).catch(err => {
  console.error("执行错误:", err);
  process.exit(1);
});






