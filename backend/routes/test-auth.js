const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
const jwtUtil = require("../utils/jwt");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "ecommerce",
  user: "admin",
  password: "AxiaNBBB123"
});

// 测试登录接口 - 模拟微信登录成功
router.post("/test/login", async (req, res) => {
  try {
    const { code } = req.body;
    
    console.log("测试登录请求，code:", code);
    
    // 模拟成功的微信登录
    const mockOpenid = "test_openid_" + Date.now();
    
    // 查找或创建测试用户
    let user;
    const userQuery = await pool.query(
      "SELECT * FROM users WHERE openid = $1",
      [mockOpenid]
    );

    if (userQuery.rows.length > 0) {
      user = userQuery.rows[0];
    } else {
      // 创建测试用户
      const createUserQuery = await pool.query(
        "INSERT INTO users (openid, unionid, nickname, avatar_url, username, email, password_hash) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [mockOpenid, null, "测试用户", "https://via.placeholder.com/100", mockOpenid, mockOpenid + "@test.com", "test_user"]
      );
      user = createUserQuery.rows[0];
    }

    // 生成token
    const tokenPayload = {
      uid: user.id,
      openid: user.openid
    };
    const token = jwtUtil.sign(tokenPayload);

    console.log("测试登录成功，返回token:", token.substring(0, 20) + "...");

    // 返回成功响应
    res.json({
      code: 0,
      data: {
        token,
        user: {
          id: user.id,
          openid: user.openid,
          nickname: user.nickname,
          avatarUrl: user.avatar_url,
          mobile: user.phone || null
        }
      }
    });

  } catch (error) {
    console.error("测试登录失败:", error.message);
    res.status(500).json({
      code: 500,
      message: error.message || "测试登录失败"
    });
  }
});

module.exports = router;
