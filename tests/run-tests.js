#!/usr/bin/env node

const MockAuthTest = require("./mock-auth.test");
const ApiTest = require("./api.test");

/**
 * 测试运行器
 */
class TestRunner {
  constructor() {
    this.results = {
      auth: null,
      api: null,
      total: {
        tests: 0,
        passed: 0,
        failed: 0
      }
    };
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log("�� NBBB 电商系统 - 完整测试套件");
    console.log("=" .repeat(50));

    // 运行 API 测试
    console.log("\n📡 第一阶段: API 接口测试");
    console.log("-" .repeat(30));
    const apiTest = new ApiTest();
    this.results.api = await apiTest.runAllTests();

    // 运行模拟认证测试
    console.log("\n🔐 第二阶段: 认证功能测试（模拟）");
    console.log("-" .repeat(30));
    const mockAuthTest = new MockAuthTest();
    this.results.auth = await mockAuthTest.runAllTests();

    // 汇总结果
    this.results.total.tests = this.results.api.total + this.results.auth.total;
    this.results.total.passed = this.results.api.passed + this.results.auth.passed;
    this.results.total.failed = this.results.api.failed + this.results.auth.failed;

    // 输出最终报告
    this.printFinalReport();

    return this.results;
  }

  /**
   * 打印最终测试报告
   */
  printFinalReport() {
    console.log("\n" + "=" .repeat(50));
    console.log("📊 最终测试报告");
    console.log("=" .repeat(50));

    console.log(`\n📡 API 接口测试:`);
    console.log(`  总测试数: ${this.results.api.total}`);
    console.log(`  通过测试: ${this.results.api.passed}`);
    console.log(`  失败测试: ${this.results.api.failed}`);
    console.log(`  成功率: ${((this.results.api.passed / this.results.api.total) * 100).toFixed(1)}%`);

    console.log(`\n🔐 认证功能测试:`);
    console.log(`  总测试数: ${this.results.auth.total}`);
    console.log(`  通过测试: ${this.results.auth.passed}`);
    console.log(`  失败测试: ${this.results.auth.failed}`);
    console.log(`  成功率: ${((this.results.auth.passed / this.results.auth.total) * 100).toFixed(1)}%`);

    console.log(`\n�� 总体测试结果:`);
    console.log(`  总测试数: ${this.results.total.tests}`);
    console.log(`  通过测试: ${this.results.total.passed}`);
    console.log(`  失败测试: ${this.results.total.failed}`);
    console.log(`  总成功率: ${((this.results.total.passed / this.results.total.tests) * 100).toFixed(1)}%`);

    if (this.results.total.failed === 0) {
      console.log("\n🎉 所有测试通过！系统运行正常！");
      console.log("\n📝 注意事项:");
      console.log("  - 微信登录功能需要配置真实的 AppID 和 AppSecret");
      console.log("  - 当前使用模拟测试验证了错误处理逻辑");
      console.log("  - 所有 API 接口和认证逻辑都已正确实现");
    } else {
      console.log(`\n⚠️  有 ${this.results.total.failed} 个测试失败，请检查相关功能。`);
    }

    console.log("\n" + "=" .repeat(50));
  }
}

// 如果直接运行此文件，执行所有测试
if (require.main === module) {
  const testRunner = new TestRunner();
  testRunner.runAllTests()
    .then(results => {
      const exitCode = results.total.failed === 0 ? 0 : 1;
      process.exit(exitCode);
    })
    .catch(error => {
      console.error("❌ 测试执行失败:", error);
      process.exit(1);
    });
}

module.exports = TestRunner;
