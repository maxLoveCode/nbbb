require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const jushuitanClient = require("../backend/services/jushuitanClient");

async function queryProduct(productCode) {
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

    if (result.code !== 0) {
      console.error("查询失败:", result.msg || "未知错误");
      return;
    }

    // 检查响应结构
    let items = null;
    if (result.data && result.data.datas) {
      items = result.data.datas;
    } else if (result.data && result.data.data && result.data.data.datas) {
      items = result.data.data.datas;
    } else if (result.data && result.data.items) {
      items = result.data.items;
    } else if (result.items) {
      items = result.items;
    } else if (result.datas) {
      items = result.datas;
    }

    if (!items || items.length === 0) {
      console.log(`未找到商品: ${productCode}`);
      return;
    }

    const item = items[0];
    
    // 如果item只有skus数组，需要从第一个sku获取商品信息
    if (item.skus && item.skus.length > 0 && !item.i_id) {
      const firstSku = item.skus[0];
      item.i_id = firstSku.i_id;
      item.name = firstSku.name;
      item.brand = firstSku.brand;
      item.pic = firstSku.pic;
    }
    
    console.log("=".repeat(80));
    console.log(`商品信息: ${productCode}`);
    console.log("=".repeat(80));
    
    // 基本信息
    console.log("\n【基本信息】");
    console.log(`  商品编码: ${item.i_id || 'N/A'}`);
    console.log(`  商品名称: ${item.name || 'N/A'}`);
    console.log(`  品牌: ${item.brand || 'N/A'}`);
    console.log(`  类目: ${item.category_name || 'N/A'}`);
    console.log(`  状态: ${item.is_listing === 'Y' ? '上架' : '下架'}`);
    
    // 价格信息
    if (item.s_price) {
      console.log(`  售价: ¥${item.s_price}`);
    }
    if (item.cost_price) {
      console.log(`  成本价: ¥${item.cost_price}`);
    }
    
    // SKU信息
    let skus = item.itemsku || item.skus || [];
    if (skus.length > 0) {
      console.log("\n【SKU信息】");
      console.log(`  共有 ${skus.length} 个SKU:\n`);
      
      skus.forEach((sku, index) => {
        console.log(`  SKU ${index + 1}:`);
        console.log(`    编码: ${sku.sku_id || 'N/A'}`);
        
        // 解析properties_value获取颜色和尺码
        if (sku.properties_value) {
          const props = sku.properties_value.split(';');
          const color = props.find(p => p.includes('颜色') || !p.match(/^[A-Z]$/)) || props[0] || 'N/A';
          const size = props.find(p => p.match(/^[A-Z]$/)) || props[props.length - 1] || 'N/A';
          console.log(`    颜色: ${color.replace(/颜色分类:/g, '').trim()}`);
          console.log(`    尺码: ${size.trim()}`);
        } else {
          console.log(`    颜色: ${sku.color || 'N/A'}`);
          console.log(`    尺码: ${sku.size || 'N/A'}`);
        }
        
        console.log(`    售价: ¥${sku.sale_price || sku.s_price || 'N/A'}`);
        console.log(`    状态: ${sku.enabled === 1 ? '启用' : '禁用'}`);
        console.log(`    库存禁用: ${sku.stock_disabled === 1 ? '是' : '否'}`);
        if (sku.pic_big) {
          console.log(`    图片: ${sku.pic_big}`);
        }
        if (sku.supplier_name) {
          console.log(`    供应商: ${sku.supplier_name}`);
        }
        console.log("");
      });
    } else {
      console.log("\n【SKU信息】");
      console.log("  暂无SKU信息");
    }
    
    // 图片信息
    if (item.pic) {
      console.log("\n【商品图片】");
      if (Array.isArray(item.pic)) {
        item.pic.forEach((pic, index) => {
          console.log(`  图片 ${index + 1}: ${pic}`);
        });
      } else {
        console.log(`  主图: ${item.pic}`);
      }
    }
    
    // 其他信息
    if (item.modifier_name) {
      console.log(`\n【修改人】: ${item.modifier_name}`);
    }
    if (item.creator_name) {
      console.log(`【创建人】: ${item.creator_name}`);
    }
    if (item.item_type) {
      console.log(`【商品类型】: ${item.item_type}`);
    }
    if (item.co_id) {
      console.log(`【公司ID】: ${item.co_id}`);
    }
    
    console.log("\n" + "=".repeat(80) + "\n");

  } catch (error) {
    console.error("查询错误:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

// 从命令行参数获取商品编码
const productCode = process.argv[2] || 'NBB-AWTR003';

queryProduct(productCode).then(() => {
  process.exit(0);
}).catch(err => {
  console.error("执行错误:", err);
  process.exit(1);
});

