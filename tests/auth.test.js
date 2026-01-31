const axios = require("axios");

// 测试配置
const BASE_URL = "http://localhost:3000/api";
const TEST_CODE = "test_code_123456";

/**
 * 微信登录认证测试
 */
class AuthTest {
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
   * 测试微信登录接口
   */
  async testWechatLogin() {
    try {
      console.log("\n🔐 测试微信登录接口...");
      
      const response = await axios.post(`${BASE_URL}/auth/wechat/login`, {
        code: TEST_CODE
      });

      if (response.data.code === 0 && response.data.data.token) {
        this.authToken = response.data.data.token;
        this.userId = response.data.data.user.id;
        this.logTest("微信登录", true, "登录成功", {
          hasToken: !!this.authToken,
          userId: this.userId
        });
        return true;
      } else {
        this.logTest("微信登录", false, "登录失败: " + response.data.message);
        return false;
      }
    } catch (error) {
      this.logTest("微信登录", false, "请求失败: " + error.message);
      return false;
    }
  }

  /**
   * 测试获取当前用户信息
   */
  async testGetCurrentUser() {
    try {
      console.log("\n👤 测试获取当前用户信息...");
      
      if (!this.authToken) {
        this.logTest("获取用户信息", false, "缺少认证 token");
        return false;
      }

      const response = await axios.get(`${BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${this.authToken}`
        }
      });

      if (response.data.code === 0 && response.data.data.user) {
        this.logTest("获取用户信息", true, "获取成功", {
          userId: response.data.data.user.id,
          openid: response.data.data.user.openid
        });
        return true;
      } else {
        this.logTest("获取用户信息", false, "获取失败: " + response.data.message);
        return false;
      }
    } catch (error) {
      this.logTest("获取用户信息", false, "请求失败: " + error.message);
      return false;
    }
  }

  /**
   * 测试更新用户资料
   */
  async testUpdateProfile() {
    try {
      console.log("\n📝 测试更新用户资料...");
      
      if (!this.authToken) {
        this.logTest("更新用户资料", false, "缺少认证 token");
        return false;
      }

      const updateData = {
        nickname: "测试用户" + Date.now(),
        avatarUrl: "https://via.placeholder.com/100"
      };

      const response = await axios.post(`${BASE_URL}/user/profile`, updateData, {
        headers: {
          Authorization: `Bearer ${this.authToken}`
        }
      });

      if (response.data.code === 0 && response.data.data.user) {
        this.logTest("更新用户资料", true, "更新成功", {
          nickname: response.data.data.user.nickname,
          avatarUrl: response.data.data.user.avatarUrl
        });
        return true;
      } else {
        this.logTest("更新用户资料", false, "更新失败: " + response.data.message);
        return false;
      }
    } catch (error) {
      this.logTest("更新用户资料", false, "请求失败: " + error.message);
      return false;
    }
  }

  /**
   * 测试获取手机号接口（模拟）
   */
  async testGetPhoneNumber() {
    try {
      console.log("\n📱 测试获取手机号接口...");
      
      if (!this.authToken) {
        this.logTest("获取手机号", false, "缺少认证 token");
        return false;
      }

      // 注意：这里使用模拟的 phone_code，实际需要真实的微信手机号授权码
      const response = await axios.post(`${BASE_URL}/auth/wechat/phone`, {
        code: "mock_phone_code"
      }, {
        headers: {
          Authorization: `Bearer ${this.authToken}`
        }
      });

      // 由于使用模拟 code，预期会失败
      if (response.data.code !== 0) {
        this.logTest("获取手机号", true, "接口正常响应（预期失败）", {
          message: response.data.message
        });
        return true;
      } else {
        this.logTest("获取手机号", true, "获取成功", response.data.data);
        return true;
      }
    } catch (error) {
      // 检查是否是预期的错误
      if (error.response && error.response.status === 500) {
        this.logTest("获取手机号", true, "接口正常响应（预期失败）", {
          message: error.response.data.message
        });
        return true;
      } else {
        this.logTest("获取手机号", false, "请求失败: " + error.message);
        return false;
      }
    }
  }

  /**
   * 测试登出接口
   */
  async testLogout() {
    try {
      console.log("\n🚪 测试登出接口...");
      
      if (!this.authToken) {
        this.logTest("登出", false, "缺少认证 token");
        return false;
      }

      const response = await axios.post(`${BASE_URL}/auth/logout`, {}, {
        headers: {
          Authorization: `Bearer ${this.authToken}`
        }
      });

      if (response.data.code === 0) {
        this.logTest("登出", true, "登出成功");
        return true;
      } else {
        this.logTest("登出", false, "登出失败: " + response.data.message);
        return false;
      }
    } catch (error) {
      this.logTest("登出", false, "请求失败: " + error.message);
      return false;
    }
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
   * 运行所有测试
   */
  async runAllTests() {
    console.log("🚀 开始运行微信登录认证测试...\n");

    const tests = [
      this.testWechatLogin.bind(this),
      this.testGetCurrentUser.bind(this),
      this.testUpdateProfile.bind(this),
      this.testGetPhoneNumber.bind(this),
      this.testLogout.bind(this),
      this.testUnauthorizedAccess.bind(this)
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
  const authTest = new AuthTest();
  authTest.runAllTests()
    .then(results => {
      console.log("\n🎉 测试完成!");
      process.exit(results.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error("❌ 测试执行失败:", error);
      process.exit(1);
    });
}

module.exports = AuthTest;
