const axios = require("axios");

// 测试配置
const BASE_URL = "http://localhost:3000/api";
const CATEGORY_PAGE_API = `${BASE_URL}/category-page`;

/**
 * 分类页接口测试脚本
 */
class CategoryPageApiTest {
  constructor() {
    this.testResults = [];
  }

  /**
   * 记录测试结果
   */
  logTest(testName, success, message, data = null) {
    const result = {
      test: testName,
      success,
      message,
      data,
      timestamp: new Date().toISOString()
    };
    this.testResults.push(result);
    console.log(`${success ? "✅" : "❌"} ${testName}: ${message}`);
    if (data && typeof data === 'object') {
      console.log(`   详情:`, JSON.stringify(data, null, 2));
    }
  }

  /**
   * 验证分类数据结构
   */
  validateCategory(category, index) {
    const errors = [];
    
    // 必填字段检查
    if (!category.id || typeof category.id !== 'number') {
      errors.push("id字段缺失或类型错误");
    }
    if (!category.name || typeof category.name !== 'string') {
      errors.push("name字段缺失或类型错误");
    }
    if (!category.type || !['cards', 'products'].includes(category.type)) {
      errors.push("type字段缺失或值错误（必须是cards或products）");
    }
    if (!category.source || !['category', 'activity', 'promotion'].includes(category.source)) {
      errors.push("source字段缺失或值错误");
    }
    if (!category.content || typeof category.content !== 'object') {
      errors.push("content字段缺失或类型错误");
    }

    // type为cards时的content验证
    if (category.type === 'cards') {
      if (!Array.isArray(category.content.cards)) {
        errors.push("type=cards时，content.cards必须是数组");
      } else {
        category.content.cards.forEach((card, cardIndex) => {
          if (!card.id || typeof card.id !== 'number') {
            errors.push(`cards[${cardIndex}].id字段缺失或类型错误`);
          }
          if (!card.title || typeof card.title !== 'string') {
            errors.push(`cards[${cardIndex}].title字段缺失或类型错误`);
          }
          if (!card.image || typeof card.image !== 'string') {
            errors.push(`cards[${cardIndex}].image字段缺失或类型错误`);
          }
        });
      }
    }

    // type为products时的content验证
    if (category.type === 'products') {
      if (!Array.isArray(category.content.products)) {
        errors.push("type=products时，content.products必须是数组");
      } else {
        category.content.products.forEach((product, productIndex) => {
          if (!product.id) {
            errors.push(`products[${productIndex}].id字段缺失`);
          }
          if (!product.title || typeof product.title !== 'string') {
            errors.push(`products[${productIndex}].title字段缺失或类型错误`);
          }
          if (typeof product.price !== 'number') {
            errors.push(`products[${productIndex}].price字段缺失或类型错误`);
          }
          if (!product.image || typeof product.image !== 'string') {
            errors.push(`products[${productIndex}].image字段缺失或类型错误`);
          }
          if (product.currency && product.currency !== '¥') {
            errors.push(`products[${productIndex}].currency值应该是¥`);
          }
        });
      }

      // 分页信息验证
      if (!category.content.pagination || typeof category.content.pagination !== 'object') {
        errors.push("type=products时，content.pagination字段缺失或类型错误");
      } else {
        const pagination = category.content.pagination;
        if (typeof pagination.pageNum !== 'number') {
          errors.push("pagination.pageNum字段缺失或类型错误");
        }
        if (typeof pagination.pageSize !== 'number') {
          errors.push("pagination.pageSize字段缺失或类型错误");
        }
        if (typeof pagination.total !== 'number') {
          errors.push("pagination.total字段缺失或类型错误");
        }
        if (typeof pagination.totalPages !== 'number') {
          errors.push("pagination.totalPages字段缺失或类型错误");
        }
      }
    }

    return errors;
  }

  /**
   * 测试主接口
   */
  async testMainApi() {
    try {
      console.log("\n" + "=".repeat(80));
      console.log("📋 测试分类页主接口 (GET /api/category-page)");
      console.log("=".repeat(80));

      const response = await axios.get(CATEGORY_PAGE_API);

      // 检查HTTP状态码
      if (response.status !== 200) {
        this.logTest("分类页主接口", false, `HTTP状态码错误: ${response.status}`);
        return false;
      }

      // 检查响应格式
      if (!response.data.success) {
        this.logTest("分类页主接口", false, `请求失败: ${response.data.message || '未知错误'}`);
        return false;
      }

      if (response.data.code !== 0) {
        this.logTest("分类页主接口", false, `返回码错误: ${response.data.code}`);
        return false;
      }

      if (!response.data.data || !response.data.data.categories) {
        this.logTest("分类页主接口", false, "响应数据格式错误：缺少data.categories字段");
        return false;
      }

      const categories = response.data.data.categories;

      if (!Array.isArray(categories)) {
        this.logTest("分类页主接口", false, "categories不是数组类型");
        return false;
      }

      // 验证分类数量（应该是9个）
      if (categories.length !== 9) {
        this.logTest("分类页主接口", false, `分类数量不正确，期望9个，实际${categories.length}个`);
      }

      // 验证每个分类的数据结构
      let allValid = true;
      const categoryErrors = [];
      
      categories.forEach((category, index) => {
        const errors = this.validateCategory(category, index);
        if (errors.length > 0) {
          allValid = false;
          categoryErrors.push({
            index,
            name: category.name,
            errors
          });
        }
      });

      if (!allValid) {
        this.logTest("分类页主接口", false, "分类数据结构验证失败", categoryErrors);
        return false;
      }

      // 统计不同类型和来源的分类
      const stats = {
        total: categories.length,
        cards: categories.filter(c => c.type === 'cards').length,
        products: categories.filter(c => c.type === 'products').length,
        activity: categories.filter(c => c.source === 'activity').length,
        category: categories.filter(c => c.source === 'category').length,
        cardsData: categories.filter(c => c.type === 'cards').reduce((sum, c) => sum + (c.content.cards?.length || 0), 0),
        productsData: categories.filter(c => c.type === 'products').reduce((sum, c) => sum + (c.content.products?.length || 0), 0)
      };

      this.logTest("分类页主接口", true, `获取成功，共 ${categories.length} 个分类`, stats);

      // 输出详细分类信息
      console.log("\n【分类详情】");
      categories.forEach((category, index) => {
        console.log(`\n[${index + 1}] ${category.name}`);
        console.log(`   ID: ${category.id}`);
        console.log(`   Type: ${category.type}`);
        console.log(`   Source: ${category.source}`);
        if (category.image) {
          console.log(`   Image: ${category.image}`);
        }
        if (category.description) {
          console.log(`   Description: ${category.description}`);
        }
        
        if (category.type === 'cards') {
          const cards = category.content.cards || [];
          console.log(`   卡片数量: ${cards.length}`);
          cards.forEach((card, i) => {
            console.log(`     卡片${i + 1}: ${card.title} (ID: ${card.id})`);
            console.log(`       图片: ${card.image}`);
            if (card.link) {
              console.log(`       链接: ${card.link}`);
            }
          });
        } else {
          const products = category.content.products || [];
          const pagination = category.content.pagination || {};
          console.log(`   商品数量: ${products.length}`);
          console.log(`   分页信息: 第${pagination.pageNum}页，每页${pagination.pageSize}条，共${pagination.total}条，${pagination.totalPages}页`);
          if (products.length > 0) {
            products.slice(0, 3).forEach((product, i) => {
              console.log(`     商品${i + 1}: ${product.title}`);
              console.log(`       ID: ${product.id}`);
              console.log(`       价格: ${product.currency || '¥'}${(product.price / 100).toFixed(2)}`);
              if (product.original_price) {
                console.log(`       原价: ${product.currency || '¥'}${(product.original_price / 100).toFixed(2)}`);
              }
              console.log(`       图片: ${product.image}`);
            });
            if (products.length > 3) {
              console.log(`     ... 还有 ${products.length - 3} 个商品`);
            }
          }
        }
      });

      return true;
    } catch (error) {
      if (error.response) {
        this.logTest("分类页主接口", false, 
          `请求失败 (${error.response.status}): ${error.response.data?.message || error.message}`);
      } else {
        this.logTest("分类页主接口", false, `请求失败: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * 测试分页接口
   */
  async testPaginationApi() {
    try {
      console.log("\n" + "=".repeat(80));
      console.log("📋 测试分类页分页接口 (GET /api/category-page/:id/products)");
      console.log("=".repeat(80));

      // 先获取主接口数据，找到products类型的分类
      const mainResponse = await axios.get(CATEGORY_PAGE_API);
      if (!mainResponse.data.success) {
        this.logTest("分页接口", false, "无法获取主接口数据");
        return false;
      }

      const productsCategories = mainResponse.data.data.categories.filter(
        c => c.type === 'products' && c.source === 'category'
      );

      if (productsCategories.length === 0) {
        this.logTest("分页接口", false, "没有找到products类型的分类");
        return false;
      }

      // 测试第一个有商品的分类
      const testCategory = productsCategories.find(c => (c.content.products?.length || 0) > 0);
      
      if (!testCategory) {
        this.logTest("分页接口", true, "没有找到有商品数据的分类，跳过分页测试");
        return true;
      }

      console.log(`\n测试分类: ${testCategory.name} (ID: ${testCategory.id})`);

      // 测试第一页
      let response = await axios.get(`${CATEGORY_PAGE_API}/${testCategory.id}/products`, {
        params: { pageNum: 1, pageSize: 2 }
      });

      if (response.status !== 200) {
        this.logTest("分页接口(第1页)", false, `HTTP状态码错误: ${response.status}`);
        return false;
      }

      if (!response.data.success || response.data.code !== 0) {
        this.logTest("分页接口(第1页)", false, `请求失败: ${response.data.message || '未知错误'}`);
        return false;
      }

      // 验证数据结构
      if (!response.data.data || !response.data.data.list || !response.data.data.pagination) {
        this.logTest("分页接口(第1页)", false, "响应数据格式错误");
        return false;
      }

      const { list, pagination } = response.data.data;

      if (!Array.isArray(list)) {
        this.logTest("分页接口(第1页)", false, "list不是数组类型");
        return false;
      }

      if (list.length > 2) {
        this.logTest("分页接口(第1页)", false, `每页数量不正确，期望最多2条，实际${list.length}条`);
      }

      this.logTest("分页接口(第1页)", true, `获取成功`, {
        listCount: list.length,
        pagination: pagination
      });

      // 测试无效的分类ID
      try {
        await axios.get(`${CATEGORY_PAGE_API}/99999/products`);
        this.logTest("分页接口(无效ID)", false, "应该返回404错误");
      } catch (error) {
        if (error.response && error.response.status === 404) {
          this.logTest("分页接口(无效ID)", true, "正确处理了无效的分类ID");
        } else {
          this.logTest("分页接口(无效ID)", false, `处理无效ID时出错: ${error.message}`);
        }
      }

      // 测试非products类型的分类
      const cardsCategory = mainResponse.data.data.categories.find(c => c.type === 'cards');
      if (cardsCategory) {
        try {
          await axios.get(`${CATEGORY_PAGE_API}/${cardsCategory.id}/products`);
          this.logTest("分页接口(非products类型)", false, "应该返回400错误");
        } catch (error) {
          if (error.response && error.response.status === 400) {
            this.logTest("分页接口(非products类型)", true, "正确处理了非products类型的分类");
          } else {
            this.logTest("分页接口(非products类型)", false, `处理非products类型时出错: ${error.message}`);
          }
        }
      }

      return true;
    } catch (error) {
      if (error.response) {
        this.logTest("分页接口", false, 
          `请求失败 (${error.response.status}): ${error.response.data?.message || error.message}`);
      } else {
        this.logTest("分页接口", false, `请求失败: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * 测试必需分类是否存在
   */
  async testRequiredCategories() {
    try {
      console.log("\n" + "=".repeat(80));
      console.log("📋 测试必需分类是否存在");
      console.log("=".repeat(80));

      const response = await axios.get(CATEGORY_PAGE_API);

      if (!response.data.success) {
        this.logTest("必需分类检查", false, "无法获取分类数据");
        return false;
      }

      const categories = response.data.data.categories;
      const categoryNames = categories.map(c => c.name);

      // 必需的分类列表
      const requiredCategories = [
        { name: '博主甄选', type: 'cards', source: 'activity' },
        { name: '人宠同款', type: 'cards', source: 'activity' },
        { name: '男款上装', type: 'products', source: 'category' },
        { name: '男款下装', type: 'products', source: 'category' },
        { name: '女款上装', type: 'products', source: 'category' },
        { name: '女款下装', type: 'products', source: 'category' },
        { name: '宠物', type: 'products', source: 'category' },
        { name: '帽子', type: 'products', source: 'category' },
        { name: '服饰', type: 'products', source: 'category' }
      ];

      const missingCategories = [];
      const wrongTypeCategories = [];

      requiredCategories.forEach(required => {
        const found = categories.find(c => c.name === required.name);
        if (!found) {
          missingCategories.push(required.name);
        } else {
          if (found.type !== required.type || found.source !== required.source) {
            wrongTypeCategories.push({
              name: required.name,
              expected: { type: required.type, source: required.source },
              actual: { type: found.type, source: found.source }
            });
          }
        }
      });

      if (missingCategories.length > 0) {
        this.logTest("必需分类检查", false, `缺少必需分类: ${missingCategories.join(', ')}`);
        return false;
      }

      if (wrongTypeCategories.length > 0) {
        this.logTest("必需分类检查", false, "分类类型或来源不正确", wrongTypeCategories);
        return false;
      }

      this.logTest("必需分类检查", true, `所有必需分类都存在且类型正确 (共${requiredCategories.length}个)`);

      return true;
    } catch (error) {
      this.logTest("必需分类检查", false, `检查失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log("\n" + "=".repeat(80));
    console.log("🚀 开始测试分类页接口...");
    console.log("=".repeat(80));
    console.log(`测试目标: ${BASE_URL}`);
    console.log(`测试时间: ${new Date().toLocaleString('zh-CN')}`);
    console.log("=".repeat(80));

    const tests = [
      this.testMainApi.bind(this),
      this.testRequiredCategories.bind(this),
      this.testPaginationApi.bind(this)
    ];

    let passedTests = 0;
    for (const test of tests) {
      const result = await test();
      if (result) passedTests++;
    }

    console.log("\n" + "=".repeat(80));
    console.log("📊 测试结果汇总");
    console.log("=".repeat(80));
    console.log(`总测试数: ${tests.length}`);
    console.log(`通过测试: ${passedTests}`);
    console.log(`失败测试: ${tests.length - passedTests}`);
    console.log(`成功率: ${((passedTests / tests.length) * 100).toFixed(1)}%`);

    // 输出详细测试结果
    console.log("\n【详细测试结果】");
    this.testResults.forEach((result, index) => {
      const status = result.success ? "✅" : "❌";
      console.log(`${index + 1}. ${status} ${result.test}`);
      console.log(`   时间: ${result.timestamp}`);
      console.log(`   结果: ${result.message}`);
    });

    console.log("\n" + "=".repeat(80));
    console.log("🎉 测试完成!");
    console.log("=".repeat(80) + "\n");

    return {
      total: tests.length,
      passed: passedTests,
      failed: tests.length - passedTests,
      successRate: ((passedTests / tests.length) * 100).toFixed(1) + "%",
      results: this.testResults
    };
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  const categoryPageTest = new CategoryPageApiTest();
  categoryPageTest.runAllTests()
    .then(results => {
      process.exit(results.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error("\n❌ 测试执行失败:", error);
      if (error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    });
}

module.exports = CategoryPageApiTest;
