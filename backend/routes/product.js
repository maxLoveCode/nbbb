const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
const jushuitanClient = require("../services/jushuitanClient");
const { convertImageUrl, convertImageUrls } = require("../utils/imageUrlConverter");
const { getColorHex, getColorHexMap } = require("../utils/colorMapper");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "ecommerce",
  user: "admin",
  password: "AxiaNBBB123"
});

/**
 * 通过商品编码获取商品详情
 * GET /api/product/:productCode
 */
router.get("/:productCode", async (req, res) => {
  try {
    const { productCode } = req.params;

    if (!productCode || productCode.trim() === "") {
      return res.status(400).json({
        success: false,
        code: 400,
        message: "商品编码不能为空"
      });
    }

    // 调用聚水潭接口查询商品详情
    const biz = {
      i_ids: [productCode.trim()],
      page_index: 1,
      page_size: 1
    };

    // eslint-disable-next-line no-console
    console.log("[ProductDetail] 调用聚水潭商品查询 jushuitan.item.query", {
      productCode: productCode.trim(),
      biz
    });

    const result = await jushuitanClient.call(
      "jushuitan.item.query",
      biz,
      {},
      "https://openapi.jushuitan.com/open/mall/item/query"
    );

    // eslint-disable-next-line no-console
    console.log("[ProductDetail] 聚水潭商品查询返回", {
      productCode: productCode.trim(),
      code: result && result.code,
      msg: result && result.msg,
      hasData:
        !!(
          result &&
          result.data &&
          (Array.isArray(result.data.datas)
            ? result.data.datas.length
            : result.data.data &&
              Array.isArray(result.data.data.datas) &&
              result.data.data.datas.length)
        )
    });

    // 检查响应
    if (result.code !== 0) {
      return res.status(404).json({
        success: false,
        code: result.code || 404,
        message: result.msg || "商品不存在或查询失败"
      });
    }

    // 解析响应数据
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
      return res.status(404).json({
        success: false,
        code: 404,
        message: "商品不存在"
      });
    }

    const item = items[0];

    // ===== 聚水潭库存查询：通过 /open/inventory/query 获取真实库存 =====
    // 使用 i_ids + ts 查询，不依赖前面临时的 mock 库存
    let inventoryMap = {};
    try {
      const inventoryBiz = {
        i_ids: productCode.trim(),
        page_index: 1,
        page_size: 100,
        has_lock_qty: true,
        ts: Math.floor(Date.now() / 1000) // 防漏单时间戳
      };

      // eslint-disable-next-line no-console
      console.log("[ProductDetail] 调用聚水潭库存查询 jushuitan.inventory.query", {
        productCode: productCode.trim(),
        inventoryBiz
      });

      const inventoryResult = await jushuitanClient.call(
        "jushuitan.inventory.query",
        inventoryBiz,
        {},
        "https://openapi.jushuitan.com/open/inventory/query"
      );

      if (
        inventoryResult &&
        inventoryResult.code === 0 &&
        inventoryResult.data &&
        Array.isArray(inventoryResult.data.inventorys)
      ) {
        // eslint-disable-next-line no-console
        console.log("[ProductDetail] 聚水潭库存查询成功", {
          productCode: productCode.trim(),
          count: inventoryResult.data.inventorys.length
        });

        inventoryResult.data.inventorys.forEach(inv => {
          const key = inv.sku_id || inv.i_id;
          if (!key) return;
          inventoryMap[key] = {
            qty: typeof inv.qty === "number" ? inv.qty : 0,
            order_lock: typeof inv.order_lock === "number" ? inv.order_lock : 0,
            pick_lock: typeof inv.pick_lock === "number" ? inv.pick_lock : 0,
            virtual_qty: typeof inv.virtual_qty === "number" ? inv.virtual_qty : 0
          };
        });
      } else {
        // eslint-disable-next-line no-console
        console.warn(
          "JST inventory query failed or empty for product:",
          productCode,
          inventoryResult && inventoryResult.msg
        );
      }
    } catch (invError) {
      // 库存查询失败不阻塞商品详情，只记录日志，前端可以根据 stock=0 做降级展示
      // eslint-disable-next-line no-console
      console.warn("查询聚水潭库存失败:", productCode, invError.message);
    }

    // 处理特殊情况：如果item只有skus数组，需要从第一个sku获取商品信息
    if (item.skus && item.skus.length > 0 && !item.i_id) {
      const firstSku = item.skus[0];
      item.i_id = firstSku.i_id;
      item.name = firstSku.name || item.name;
      item.brand = firstSku.brand || item.brand;
      item.pic = firstSku.pic || item.pic;
    }

    // 转换图片URL（HTTP -> HTTPS）
    const convertedItem = convertImageUrls(item, { forceHttps: true });

    // 处理SKU信息，解析颜色和尺码
    const processedSkus = convertedItem.skus && Array.isArray(convertedItem.skus)
      ? convertedItem.skus.map(sku => {
          const skuId = sku.sku_id || sku.id || sku.i_id || "";
          const inv = inventoryMap[skuId] || {};
          // 解析 properties_value，格式通常是 "颜色;尺码"
          let color = "";
          let size = "";
          if (sku.properties_value) {
            const parts = sku.properties_value.split(';');
            // 通常第一部分是颜色，最后一部分是尺码
            // 尺码通常是单个字母或数字（如 S, M, L, XL 或 80, 90, 100）
            // 颜色通常是中文或包含"颜色"关键词
            if (parts.length >= 2) {
              // 尝试识别尺码（通常是最后一个部分，且是单个字母或数字）
              const lastPart = parts[parts.length - 1].trim();
              const isSize = /^[A-Z]{1,3}$|^\d+$|^XL|^XXL|^XXXL$/i.test(lastPart);
              
              if (isSize) {
                size = lastPart;
                color = parts.slice(0, -1).join(';').trim();
              } else {
                // 如果最后一部分不是尺码，则第一部分是颜色，最后是尺码
                color = parts[0].trim();
                size = lastPart;
              }
            } else if (parts.length === 1) {
              // 只有一个部分，可能是颜色或尺码
              const part = parts[0].trim();
              if (/^[A-Z]{1,3}$|^\d+$|^XL|^XXL|^XXXL$/i.test(part)) {
                size = part;
              } else {
                color = part;
              }
            }
          }

          return {
            sku_id: skuId,
            properties_value: sku.properties_value || "",
            color: color,
            color_hex: color ? getColorHex(color) : null,
            size: size,
            sale_price: sku.sale_price ? Math.round(sku.sale_price * 100) : null,
            price: sku.price ? Math.round(sku.price * 100) : null,
            cost_price: sku.cost_price ? Math.round(sku.cost_price * 100) : null,
            pic: convertImageUrl(sku.pic, { forceHttps: true }) || "",
            pic_big: sku.pic_big ? convertImageUrl(sku.pic_big, { forceHttps: true }) : "",
            enabled: sku.enabled !== 0,
            // 使用聚水潭 /open/inventory/query 返回的实际库存数量（主仓实际库存 qty）
            stock: typeof inv.qty === "number" ? inv.qty : 0,
            stock_disabled: sku.stock_disabled === 1
          };
        })
      : [];

    // 提取所有可用的颜色和尺码
    const colorSet = new Set();
    const sizeSet = new Set();
    const colorSizeMap = {}; // { color: Set<sizes> }
    const skuMap = {}; // { "color:size": sku_id }

    processedSkus.forEach(sku => {
      if (sku.color) colorSet.add(sku.color);
      if (sku.size) sizeSet.add(sku.size);
      
      // 建立颜色-尺码映射
      if (sku.color && sku.size) {
        if (!colorSizeMap[sku.color]) {
          colorSizeMap[sku.color] = new Set();
        }
        colorSizeMap[sku.color].add(sku.size);
        
        // 建立SKU映射
        const key = `${sku.color}:${sku.size}`;
        skuMap[key] = sku.sku_id;
      }
    });

    // 获取所有颜色的HEX值映射
    const colorsArray = Array.from(colorSet).sort();
    const colorHexMap = getColorHexMap(colorsArray);

    // 从本地 product_extras 表查询本地描述（如果存在）
    let localDescription = "";
    try {
      const dbResult = await pool.query(
        `SELECT local_description 
         FROM product_extras 
         WHERE product_code = $1`,
        [productCode.trim()]
      );
      if (dbResult.rows.length > 0 && dbResult.rows[0].local_description) {
        localDescription = dbResult.rows[0].local_description.trim();
      }
    } catch (dbError) {
      // 如果查询失败，不影响主流程，只记录错误
      console.warn("查询本地描述失败:", dbError.message);
    }

    // 拼接描述：聚水潭描述 + 本地描述
    const jushuitanDesc = (convertedItem.description || "").trim();
    let combinedDescription = "";
    if (jushuitanDesc && localDescription) {
      combinedDescription = `${jushuitanDesc}\n\n${localDescription}`;
    } else if (jushuitanDesc) {
      combinedDescription = jushuitanDesc;
    } else if (localDescription) {
      combinedDescription = localDescription;
    }

    // 如果没有任何描述，使用一段默认的商品描述文案（mock）
    const defaultDescription =
      combinedDescription ||
      "这款复古毛绣花朵宽松阔腿裤采用柔软垂感面料打造，上身自然顺滑，不挑腿型，行走之间轻盈飘逸，营造出利落又慵懒的复古气质。" +
        "裤身点缀精致毛绣花朵细节，在低调的黑色基底上增添一抹灵动层次，既不会过于张扬，又能在光线下展现细腻纹理与立体感。" +
        "宽松直筒版型结合高腰设计，有效拉长下半身比例，遮肉显瘦，对大腿、小腿线条都有很好的包容度，搭配简单的上装就能轻松完成日常通勤或周末出游造型。";

    // 格式化商品详情数据
    const productDetail = {
      // 基本信息
      product_code: convertedItem.i_id || productCode,
      name: convertedItem.name || "",
      brand: convertedItem.brand || "",
      item_type: convertedItem.item_type || "",
      category_name: convertedItem.category_name || "",
      category_id: convertedItem.c_id || null,

      // 价格信息（聚水潭返回的价格单位可能是元，统一转换为分）
      price: convertedItem.s_price ? Math.round(convertedItem.s_price * 100) : 0,
      original_price: convertedItem.market_price 
        ? Math.round(convertedItem.market_price * 100) 
        : (convertedItem.c_price ? Math.round(convertedItem.c_price * 100) : null),
      cost_price: convertedItem.c_price ? Math.round(convertedItem.c_price * 100) : null,

      // 图片信息
      main_image: convertedItem.pic ? convertImageUrl(convertedItem.pic, { forceHttps: true }) : "",
      images: (() => {
        if (convertedItem.pics && Array.isArray(convertedItem.pics) && convertedItem.pics.length > 0) {
          const convertedPics = convertedItem.pics
            .map(img => convertImageUrl(img, { forceHttps: true }))
            .filter(img => img && img.trim() !== "");
          return convertedPics.length > 0 ? convertedPics : (convertedItem.pic ? [convertImageUrl(convertedItem.pic, { forceHttps: true })] : []);
        }
        return convertedItem.pic ? [convertImageUrl(convertedItem.pic, { forceHttps: true })] : [];
      })(),

      // 商品状态
      is_listing: convertedItem.is_listing === "Y" || convertedItem.onsale === 1,
      onsale: convertedItem.onsale === 1 || convertedItem.is_listing === "Y",

      // SKU信息（包含解析后的颜色和尺码）
      skus: processedSkus,

      // 颜色和尺码选择数据（便于前端使用）
      variants: {
        // 所有可用的颜色列表
        colors: colorsArray,
        // 颜色HEX值映射：{ color: hex }
        color_hex: colorHexMap,
        // 所有可用的尺码列表
        sizes: Array.from(sizeSet).sort((a, b) => {
          // 尺码排序：S, M, L, XL, XXL 或数字从小到大
          const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
          const aIndex = sizeOrder.indexOf(a.toUpperCase());
          const bIndex = sizeOrder.indexOf(b.toUpperCase());
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          // 数字尺码
          const aNum = parseInt(a);
          const bNum = parseInt(b);
          if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
          return a.localeCompare(b);
        }),
        // 颜色-尺码映射：{ color: [sizes] }
        color_sizes: Object.keys(colorSizeMap).reduce((acc, color) => {
          acc[color] = Array.from(colorSizeMap[color]).sort();
          return acc;
        }, {}),
        // SKU映射：根据颜色和尺码快速查找SKU ID
        sku_map: skuMap
      },

      // 其他信息
      weight: convertedItem.weight || null,
      unit: convertedItem.unit || "",
      description: defaultDescription, // 使用拼接后的描述或默认文案
      properties: convertedItem.properties || {},
      created: convertedItem.created || null,
      modified: convertedItem.modified || null,

      // 展示用扩展字段（前端可直接渲染）—— 当前为 mock 文案
      size_guide:
        "本款商品尺码为常规版型，建议按照您日常穿着的尺码选择即可。如介于两个尺码之间，偏好宽松可选择大一号，偏好合身可选择小一号。" +
        "模特身高 170cm 体重 50kg，试穿 S 码为略宽松效果，腰部及臀围预留舒适活动空间。" +
        "不同人群体型存在差异，建议结合身高、体重与日常穿着习惯综合判断，如介意尺码问题可优先咨询客服获取更精确建议。",
      delivery_service:
        "默认使用合作快递配送，发货地为官方指定仓库，一般在下单后 24 小时内完成出库，特殊活动或节假日可能略有延迟。" +
        "全国大部分地区预计 2-5 个工作日送达，偏远地区和特殊区域时效会有所增加，具体以实际物流信息为准。" +
        "签收时如发现外包装破损、明显受潮或被私自拆封，请第一时间拍照并拒收，同时联系官方客服处理，我们将协助您快速核实与售后。", 
      payment_methods:
        "当前支持微信支付、支付宝等常用线上支付方式，部分渠道还支持银行卡快捷支付及花呗、信用卡分期等延伸服务，具体以下单页展示为准。" +
        "所有支付均通过第三方支付平台加密完成，我们不会保存您的完整银行卡号或支付密码等敏感信息。" +
        "如在支付过程中出现扣款异常、订单状态未及时更新等情况，请保留相关截图，并通过客服渠道联系我们协助核查与处理。",

      // 扩展信息（原始聚水潭字段）
      f_json: convertedItem.f_json || null,
      autoid: convertedItem.autoid || null
    };

    res.json({
      success: true,
      code: 0,
      data: productDetail
    });
  } catch (error) {
    console.error("获取商品详情错误:", error);
    res.status(500).json({
      success: false,
      code: 500,
      message: "服务器错误",
      error: error.message
    });
  }
});

module.exports = router;

