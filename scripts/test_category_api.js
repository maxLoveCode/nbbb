const axios = require("axios");

// 测试配置
const BASE_URL = "http://localhost:3000/api";
const CATEGORY_API = `${BASE_URL}/category-management`;

/**
 * 类目接口测试脚本
 */
class CategoryApiTest {
  constructor() {
    this.testResults = [];
    this.level1Categories = [];
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
   * 格式化输出分类信息
   */
  formatCategory(category, level = 1) {
    const indent = "  ".repeat(level);
    const levelName = level === 1 ? "一级分类" : "二级分类";
    console.log(`${indent}【${levelName}】`);
    console.log(`${indent}  ID: ${category.id}`);
    console.log(`${indent}  名称: ${category.name}`);
    if (category.sort_order !== undefined) {
      console.log(`${indent}  排序: ${category.sort_order}`);
    }
    if (category.created_at) {
      console.log(`${indent}  创建时间: ${category.created_at}`);
    }
    if (category.product_codes) {
      if (Array.isArray(category.product_codes)) {
        console.log(`${indent}  商品编码数量: ${category.product_codes.length}`);
        if (category.product_codes.length > 0 && category.product_codes.length <= 5) {
          console.log(`${indent}  商品编码: ${category.product_codes.join(', ')}`);
        } else if (category.product_codes.length > 5) {
          console.log(`${indent}  商品编码(前5个): ${category.product_codes.slice(0, 5).join(', ')}...`);
        }
      } else if (typeof category.product_codes === 'string') {
        const codes = category.product_codes.split(';').filter(c => c.trim());
        console.log(`${indent}  商品编码数量: ${codes.length}`);
        if (codes.length > 0 && codes.length <= 5) {
          console.log(`${indent}  商品编码: ${codes.join(', ')}`);
        } else if (codes.length > 5) {
          console.log(`${indent}  商品编码(前5个): ${codes.slice(0, 5).join(', ')}...`);
        }
      }
    }
    if (category.children && Array.isArray(category.children)) {
      console.log(`${indent}  子分类数量: ${category.children.length}`);
    }
  }

  /**
   * 测试获取一级分类列表
   */
  async testLevel1Categories() {
    try {
      console.log("\n" + "=".repeat(80));
      console.log("📋 测试一级分类接口 (GET /api/category-management/level1)");
      console.log("=".repeat(80));

      const response = await axios.get(`${CATEGORY_API}/level1`);

      // 检查响应状态
      if (response.status !== 200) {
        this.logTest("一级分类接口", false, `HTTP状态码错误: ${response.status}`);
        return false;
      }

      // 检查响应格式
      if (!response.data.success) {
        this.logTest("一级分类接口", false, `请求失败: ${response.data.message || '未知错误'}`);
        return false;
      }

      // 检查数据格式
      if (!Array.isArray(response.data.data)) {
        this.logTest("一级分类接口", false, "响应数据格式错误：data不是数组");
        return false;
      }

      // 保存一级分类数据供后续测试使用
      this.level1Categories = response.data.data;

      // 验证数据结构
      const validData = this.level1Categories.every(cat => {
        return cat.id && 
               cat.name && 
               typeof cat.id === 'number' &&
               typeof cat.name === 'string';
      });

      if (!validData) {
        this.logTest("一级分类接口", false, "数据结构验证失败：缺少必要字段");
        return false;
      }

      this.logTest("一级分类接口", true, `获取成功，共 ${this.level1Categories.length} 个一级分类`, {
        count: this.level1Categories.length,
        categories: this.level1Categories.map(c => ({
          id: c.id,
          name: c.name,
          sort_order: c.sort_order
        }))
      });

      // 输出详细信息
      console.log("\n【一级分类详情】");
      if (this.level1Categories.length === 0) {
        console.log("  暂无一级分类");
      } else {
        this.level1Categories.forEach((cat, index) => {
          console.log(`\n[${index + 1}]`);
          this.formatCategory(cat, 1);
        });
      }

      return true;
    } catch (error) {
      if (error.response) {
        this.logTest("一级分类接口", false, 
          `请求失败 (${error.response.status}): ${error.response.data?.message || error.message}`);
      } else {
        this.logTest("一级分类接口", false, `请求失败: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * 测试获取二级分类列表
   */
  async testLevel2Categories() {
    try {
      console.log("\n" + "=".repeat(80));
      console.log("📋 测试二级分类接口 (GET /api/category-management/level2/:parentId)");
      console.log("=".repeat(80));

      if (this.level1Categories.length === 0) {
        this.logTest("二级分类接口", false, "无法测试：没有一级分类数据");
        return false;
      }

      let allSuccess = true;
      let totalLevel2Count = 0;

      // 对每个一级分类测试获取其二级分类
      for (const level1 of this.level1Categories) {
        console.log(`\n测试一级分类 "${level1.name}" (ID: ${level1.id}) 的二级分类...`);

        try {
          const response = await axios.get(`${CATEGORY_API}/level2/${level1.id}`);

          // 检查响应状态
          if (response.status !== 200) {
            this.logTest(`二级分类接口(${level1.id})`, false, `HTTP状态码错误: ${response.status}`);
            allSuccess = false;
            continue;
          }

          // 检查响应格式
          if (!response.data.success) {
            this.logTest(`二级分类接口(${level1.id})`, false, 
              `请求失败: ${response.data.message || '未知错误'}`);
            allSuccess = false;
            continue;
          }

          // 检查数据格式
          if (!Array.isArray(response.data.data)) {
            this.logTest(`二级分类接口(${level1.id})`, false, "响应数据格式错误：data不是数组");
            allSuccess = false;
            continue;
          }

          const level2Categories = response.data.data;
          totalLevel2Count += level2Categories.length;

          // 验证数据结构
          const validData = level2Categories.every(cat => {
            return cat.id && 
                   cat.name && 
                   typeof cat.id === 'number' &&
                   typeof cat.name === 'string';
          });

          if (!validData && level2Categories.length > 0) {
            this.logTest(`二级分类接口(${level1.id})`, false, "数据结构验证失败：缺少必要字段");
            allSuccess = false;
            continue;
          }

          // 验证product_codes格式（应该是数组）
          const validProductCodes = level2Categories.every(cat => {
            if (cat.product_codes === null || cat.product_codes === undefined) {
              return true; // 允许为空
            }
            return Array.isArray(cat.product_codes);
          });

          if (!validProductCodes) {
            this.logTest(`二级分类接口(${level1.id})`, false, 
              "product_codes格式验证失败：应该是数组格式");
            allSuccess = false;
            continue;
          }

          this.logTest(`二级分类接口(${level1.id})`, true, 
            `获取成功，共 ${level2Categories.length} 个二级分类`, {
            parent_id: level1.id,
            parent_name: level1.name,
            count: level2Categories.length,
            categories: level2Categories.map(c => ({
              id: c.id,
              name: c.name,
              product_codes_count: Array.isArray(c.product_codes) ? c.product_codes.length : 0
            }))
          });

          // 输出详细信息
          console.log(`\n【一级分类】${level1.name} (ID: ${level1.id})`);
          if (level2Categories.length === 0) {
            console.log("  暂无二级分类");
          } else {
            level2Categories.forEach((cat, index) => {
              console.log(`\n  [${index + 1}]`);
              this.formatCategory(cat, 2);
            });
          }
        } catch (error) {
          if (error.response) {
            this.logTest(`二级分类接口(${level1.id})`, false, 
              `请求失败 (${error.response.status}): ${error.response.data?.message || error.message}`);
          } else {
            this.logTest(`二级分类接口(${level1.id})`, false, `请求失败: ${error.message}`);
          }
          allSuccess = false;
        }
      }

      // 测试无效的parentId
      console.log("\n测试无效的parentId...");
      try {
        const invalidId = 99999;
        const response = await axios.get(`${CATEGORY_API}/level2/${invalidId}`);
        
        if (response.data.success && Array.isArray(response.data.data) && response.data.data.length === 0) {
          this.logTest("二级分类接口(无效ID)", true, "正确处理了无效的parentId，返回空数组");
        } else {
          this.logTest("二级分类接口(无效ID)", true, "无效ID返回结果", {
            success: response.data.success,
            data_length: response.data.data?.length || 0
          });
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          this.logTest("二级分类接口(无效ID)", true, "无效ID正确返回404");
        } else {
          this.logTest("二级分类接口(无效ID)", false, `处理无效ID时出错: ${error.message}`);
        }
      }

      console.log("\n" + "=".repeat(80));
      console.log("【二级分类测试汇总】");
      console.log(`  测试的一级分类数量: ${this.level1Categories.length}`);
      console.log(`  获取到的二级分类总数: ${totalLevel2Count}`);
      console.log("=".repeat(80));

      return allSuccess;
    } catch (error) {
      this.logTest("二级分类接口", false, `测试执行失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 测试分类树接口（额外测试）
   */
  async testCategoryTree() {
    try {
      console.log("\n" + "=".repeat(80));
      console.log("📋 测试分类树接口 (GET /api/category-management/tree)");
      console.log("=".repeat(80));

      const response = await axios.get(`${CATEGORY_API}/tree`);

      if (response.status !== 200) {
        this.logTest("分类树接口", false, `HTTP状态码错误: ${response.status}`);
        return false;
      }

      if (!response.data.success) {
        this.logTest("分类树接口", false, `请求失败: ${response.data.message || '未知错误'}`);
        return false;
      }

      if (!Array.isArray(response.data.data)) {
        this.logTest("分类树接口", false, "响应数据格式错误：data不是数组");
        return false;
      }

      const tree = response.data.data;
      let totalLevel2 = 0;

      // 验证树结构
      const validTree = tree.every(level1 => {
        if (!level1.id || !level1.name || !Array.isArray(level1.children)) {
          return false;
        }
        totalLevel2 += level1.children.length;
        return level1.children.every(level2 => {
          if (!level2.id || !level2.name) {
            return false;
          }
          // 验证product_codes是数组格式
          if (level2.product_codes !== null && level2.product_codes !== undefined) {
            return Array.isArray(level2.product_codes);
          }
          return true;
        });
      });

      if (!validTree) {
        this.logTest("分类树接口", false, "树结构验证失败：数据结构不正确");
        return false;
      }

      this.logTest("分类树接口", true, `获取成功`, {
        level1_count: tree.length,
        level2_count: totalLevel2,
        tree_structure: tree.map(t => ({
          id: t.id,
          name: t.name,
          children_count: t.children.length
        }))
      });

      // 输出树结构
      console.log("\n【分类树结构】");
      tree.forEach((level1, index) => {
        console.log(`\n[一级分类 ${index + 1}]`);
        this.formatCategory(level1, 1);
        if (level1.children.length > 0) {
          level1.children.forEach((level2, idx) => {
            console.log(`  [二级分类 ${idx + 1}]`);
            this.formatCategory(level2, 2);
          });
        }
      });

      return true;
    } catch (error) {
      if (error.response) {
        this.logTest("分类树接口", false, 
          `请求失败 (${error.response.status}): ${error.response.data?.message || error.message}`);
      } else {
        this.logTest("分类树接口", false, `请求失败: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log("\n" + "=".repeat(80));
    console.log("🚀 开始测试类目接口...");
    console.log("=".repeat(80));
    console.log(`测试目标: ${BASE_URL}`);
    console.log(`测试时间: ${new Date().toLocaleString('zh-CN')}`);
    console.log("=".repeat(80));

    const tests = [
      this.testLevel1Categories.bind(this),
      this.testLevel2Categories.bind(this),
      this.testCategoryTree.bind(this)
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
      if (result.data) {
        console.log(`   数据:`, JSON.stringify(result.data, null, 6));
      }
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
  const categoryTest = new CategoryApiTest();
  categoryTest.runAllTests()
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

module.exports = CategoryApiTest;
