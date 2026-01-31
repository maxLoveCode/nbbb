const axios = require("axios");

// 测试配置
const BASE_URL = "http://localhost:3000/api";

/**
 * API 接口测试
 */
class ApiTest {
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
  }

  /**
   * 测试首页接口
   */
  async testHomeApi() {
    try {
      console.log("\n🏠 测试首页接口...");
      
      const response = await axios.get(`${BASE_URL}/home`);
      
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        this.logTest("首页接口", true, "获取成功", {
          hasBanners: !!data.banners,
          hasCategories: !!data.featuredCategories,
          hasNewArrivals: !!data.newArrivals,
          hasHotSales: !!data.hotSales
        });
        return true;
      } else {
        this.logTest("首页接口", false, "响应格式错误");
        return false;
      }
    } catch (error) {
      this.logTest("首页接口", false, "请求失败: " + error.message);
      return false;
    }
  }

  /**
   * 测试产品列表接口
   */
  async testProductsApi() {
    try {
      console.log("\n📦 测试产品列表接口...");
      
      // 测试基础产品列表
      let response = await axios.get(`${BASE_URL}/products`);
      
      if (response.data.success && Array.isArray(response.data.data)) {
        this.logTest("产品列表基础", true, "获取成功", {
          productCount: response.data.data.length,
          hasPagination: !!response.data.pagination
        });
      } else {
        this.logTest("产品列表基础", false, "响应格式错误");
        return false;
      }

      // 测试带参数的产品列表
      response = await axios.get(`${BASE_URL}/products?page=1&pageSize=2&sort=price_desc`);
      
      if (response.data.success) {
        this.logTest("产品列表参数", true, "参数查询成功", {
          page: response.data.pagination.page,
          pageSize: response.data.pagination.pageSize,
          total: response.data.pagination.total
        });
      } else {
        this.logTest("产品列表参数", false, "参数查询失败");
        return false;
      }

      return true;
    } catch (error) {
      this.logTest("产品列表接口", false, "请求失败: " + error.message);
      return false;
    }
  }

  /**
   * 测试产品详情接口
   */
  async testProductDetailApi() {
    try {
      console.log("\n📋 测试产品详情接口...");
      
      // 测试存在的产品
      const response = await axios.get(`${BASE_URL}/products/1`);
      
      if (response.data.success && response.data.data) {
        this.logTest("产品详情", true, "获取成功", {
          productId: response.data.data.id,
          hasName: !!response.data.data.name,
          hasPrice: !!response.data.data.price
        });
      } else {
        this.logTest("产品详情", false, "响应格式错误");
        return false;
      }

      return true;
    } catch (error) {
      this.logTest("产品详情接口", false, "请求失败: " + error.message);
      return false;
    }
  }

  /**
   * 测试产品图片接口
   */
  async testProductImagesApi() {
    try {
      console.log("\n🖼️ 测试产品图片接口...");
      
      const response = await axios.get(`${BASE_URL}/products/1/images`);
      
      if (response.data.success && Array.isArray(response.data.data)) {
        this.logTest("产品图片", true, "获取成功", {
          imageCount: response.data.data.length
        });
      } else {
        this.logTest("产品图片", false, "响应格式错误");
        return false;
      }

      return true;
    } catch (error) {
      this.logTest("产品图片接口", false, "请求失败: " + error.message);
      return false;
    }
  }

  /**
   * 测试产品推荐接口
   */
  async testProductRecommendationsApi() {
    try {
      console.log("\n💡 测试产品推荐接口...");
      
      const response = await axios.get(`${BASE_URL}/products/1/recommendations`);
      
      if (response.data.success && Array.isArray(response.data.data)) {
        this.logTest("产品推荐", true, "获取成功", {
          recommendationCount: response.data.data.length
        });
      } else {
        this.logTest("产品推荐", false, "响应格式错误");
        return false;
      }

      return true;
    } catch (error) {
      this.logTest("产品推荐接口", false, "请求失败: " + error.message);
      return false;
    }
  }

  /**
   * 测试分类接口
   */
  async testCategoriesApi() {
    try {
      console.log("\n🏷️ 测试分类接口...");
      
      // 测试分类列表
      let response = await axios.get(`${BASE_URL}/categories`);
      
      if (response.data.success && Array.isArray(response.data.data)) {
        this.logTest("分类列表", true, "获取成功", {
          categoryCount: response.data.data.length
        });
      } else {
        this.logTest("分类列表", false, "响应格式错误");
        return false;
      }

      // 测试分类树
      response = await axios.get(`${BASE_URL}/categories/tree`);
      
      if (response.data.success && Array.isArray(response.data.data)) {
        this.logTest("分类树", true, "获取成功", {
          treeCount: response.data.data.length
        });
      } else {
        this.logTest("分类树", false, "响应格式错误");
        return false;
      }

      return true;
    } catch (error) {
      this.logTest("分类接口", false, "请求失败: " + error.message);
      return false;
    }
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log("🚀 开始运行 API 接口测试...\n");

    const tests = [
      this.testHomeApi.bind(this),
      this.testProductsApi.bind(this),
      this.testProductDetailApi.bind(this),
      this.testProductImagesApi.bind(this),
      this.testProductRecommendationsApi.bind(this),
      this.testCategoriesApi.bind(this)
    ];

    let passedTests = 0;
    for (const test of tests) {
      const result = await test();
      if (result) passedTests++;
    }

    console.log(`\n📊 测试结果汇总:`);
    console.log(`总测试数: ${tests.length}`);
    console.log(`通过测试: ${passedTests}`);
    console.log(`失败测试: ${tests.length - passedTests}`);
    console.log(`成功率: ${((passedTests / tests.length) * 100).toFixed(1)}%`);

    return {
      total: tests.length,
      passed: passedTests,
      failed: tests.length - passedTests,
      results: this.testResults
    };
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  const apiTest = new ApiTest();
  apiTest.runAllTests()
    .then(results => {
      console.log("\n🎉 测试完成!");
      process.exit(results.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error("❌ 测试执行失败:", error);
      process.exit(1);
    });
}

module.exports = ApiTest;
