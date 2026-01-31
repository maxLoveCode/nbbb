const axios = require("axios");

// 测试配置
const BASE_URL = "http://localhost:3000/api";

/**
 * 模拟微信登录认证测试
 */
class MockAuthTest {
  constructor() {
    this.testResults = [];
    this.authToken = null;
    this.userId = null;
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
   * 测试无认证访问受保护接口
   */
  async testUnauthorizedAccess() {
    try {
      console.log("\n🔒 测试无认证访问受保护接口...");
      
      const response = await axios.get(`${BASE_URL}/auth/me`);

      this.logTest("无认证访问", false, "应该返回 401 错误");
      return false;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        this.logTest("无认证访问", true, "正确返回 401 错误");
        return true;
      } else {
        this.logTest("无认证访问", false, "未返回预期的 401 错误");
        return false;
      }
    }
  }

  /**
   * 测试微信登录接口错误处理
   */
  async testWechatLoginErrorHandling() {
    try {
      console.log("\n🔐 测试微信登录接口错误处理...");
      
      const response = await axios.post(`${BASE_URL}/auth/wechat/login`, {
        code: "invalid_test_code"
      });

      this.logTest("微信登录错误处理", false, "应该返回错误响应");
      return false;
    } catch (error) {
      if (error.response && error.response.status === 500) {
        this.logTest("微信登录错误处理", true, "正确返回 500 错误（预期的微信接口错误）");
        return true;
      } else {
        this.logTest("微信登录错误处理", false, "未返回预期的错误响应");
        return false;
      }
    }
  }

  /**
   * 测试缺少 code 参数
   */
  async testMissingCode() {
    try {
      console.log("\n📝 测试缺少 code 参数...");
      
      const response = await axios.post(`${BASE_URL}/auth/wechat/login`, {});

      this.logTest("缺少 code 参数", false, "应该返回 400 错误");
      return false;
    } catch (error) {
      if (error.response && error.response.status === 400) {
        this.logTest("缺少 code 参数", true, "正确返回 400 错误");
        return true;
      } else {
        this.logTest("缺少 code 参数", false, "未返回预期的 400 错误");
        return false;
      }
    }
  }

  /**
   * 测试手机号接口缺少认证
   */
  async testPhoneWithoutAuth() {
    try {
      console.log("\n📱 测试手机号接口缺少认证...");
      
      const response = await axios.post(`${BASE_URL}/auth/wechat/phone`, {
        code: "test_phone_code"
      });

      this.logTest("手机号接口无认证", false, "应该返回 401 错误");
      return false;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        this.logTest("手机号接口无认证", true, "正确返回 401 错误");
        return true;
      } else {
        this.logTest("手机号接口无认证", false, "未返回预期的 401 错误");
        return false;
      }
    }
  }

  /**
   * 测试用户资料更新缺少认证
   */
  async testProfileUpdateWithoutAuth() {
    try {
      console.log("\n👤 测试用户资料更新缺少认证...");
      
      const response = await axios.post(`${BASE_URL}/user/profile`, {
        nickname: "测试用户"
      });

      this.logTest("用户资料更新无认证", false, "应该返回 401 错误");
      return false;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        this.logTest("用户资料更新无认证", true, "正确返回 401 错误");
        return true;
      } else {
        this.logTest("用户资料更新无认证", false, "未返回预期的 401 错误");
        return false;
      }
    }
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log("🚀 开始运行模拟认证测试...\n");

    const tests = [
      this.testUnauthorizedAccess.bind(this),
      this.testWechatLoginErrorHandling.bind(this),
      this.testMissingCode.bind(this),
      this.testPhoneWithoutAuth.bind(this),
      this.testProfileUpdateWithoutAuth.bind(this)
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
  const mockAuthTest = new MockAuthTest();
  mockAuthTest.runAllTests()
    .then(results => {
      console.log("\n🎉 测试完成!");
      process.exit(results.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error("❌ 测试执行失败:", error);
      process.exit(1);
    });
}

module.exports = MockAuthTest;
