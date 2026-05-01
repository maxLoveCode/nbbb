const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();

const pool = require("../../utils/db");
const jwtUtil = require("../../utils/jwt");
const pricingService = require("../../services/pricingService");
const webAuth = require("../../middleware/webAuth");
const webFormatter = require("../../utils/formatters/webFormatter");

function createWebOpenId(seed = "") {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `web_${Date.now()}_${seed || suffix}`;
}

function normalizeUser(row) {
  return {
    id: row.id,
    openid: row.openid,
    username: row.username || null,
    nickname: row.nickname || null,
    email: row.email || null,
    mobile: row.mobile || row.phone || null,
    avatar_url: row.avatar_url || null,
    pricing_tier: row.pricing_tier || "default",
    pricing_discount_rate: row.pricing_discount_rate ?? null,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function buildAuthPayload(user) {
  return {
    uid: user.id,
    openid: user.openid,
    email: user.email || null,
    mobile: user.mobile || null
  };
}

router.post("/login", async (req, res) => {
  try {
    const { account, password } = req.body || {};

    if (!account || !password) {
      return res.status(400).json(webFormatter.formatError("账号和密码不能为空", 400));
    }

    const result = await pool.query(
      `SELECT id, openid, username, nickname, email, phone, avatar_url,
              is_active,
              created_at, updated_at, password_hash
       FROM users
       WHERE email = $1 OR username = $1 OR phone = $1
       LIMIT 1`,
      [account.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json(webFormatter.formatError("账号或密码错误", 401));
    }

    const user = result.rows[0];
    if (!user.password_hash || user.password_hash === "wechat_user") {
      return res.status(400).json(webFormatter.formatError("该账号暂未设置网页端密码，请先注册或重置密码", 400));
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json(webFormatter.formatError("账号或密码错误", 401));
    }

    const pricingProfile = await pricingService.getPricingProfile(user.id);
    const normalizedUser = normalizeUser({
      ...user,
      pricing_tier: pricingProfile.pricingTier,
      pricing_discount_rate: pricingProfile.discountRate
    });
    const token = jwtUtil.sign(buildAuthPayload(normalizedUser));

    return res.json(
      webFormatter.formatResponse({
        token,
        user: webFormatter.formatUser(normalizedUser)
      })
    );
  } catch (error) {
    console.error("网页端登录失败:", error);
    return res.status(500).json(webFormatter.formatError(`网页端登录失败: ${error.message}`, 500));
  }
});

router.post("/register", async (req, res) => {
  try {
    const { email, password, username, nickname, mobile } = req.body || {};

    if (!email || !password) {
      return res.status(400).json(webFormatter.formatError("邮箱和密码不能为空", 400));
    }

    if (password.length < 6) {
      return res.status(400).json(webFormatter.formatError("密码长度至少 6 位", 400));
    }

    const accountEmail = email.trim().toLowerCase();
    const accountUsername = (username || accountEmail.split("@")[0]).trim();

    const existing = await pool.query(
      `SELECT id
       FROM users
       WHERE email = $1 OR username = $2`,
      [accountEmail, accountUsername]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json(webFormatter.formatError("邮箱或用户名已存在", 409));
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const openid = createWebOpenId(accountUsername);

    const created = await pool.query(
      `INSERT INTO users (openid, nickname, avatar_url, phone, email, username, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, openid, username, nickname, email, phone, avatar_url,
                 is_active, created_at, updated_at`,
      [
        openid,
        (nickname || accountUsername).trim(),
        "https://via.placeholder.com/240x240?text=NBBB",
        mobile || null,
        accountEmail,
        accountUsername,
        passwordHash
      ]
    );

    const pricingProfile = await pricingService.getPricingProfile(created.rows[0].id);
    const user = normalizeUser({
      ...created.rows[0],
      pricing_tier: pricingProfile.pricingTier,
      pricing_discount_rate: pricingProfile.discountRate
    });
    const token = jwtUtil.sign(buildAuthPayload(user));

    return res.status(201).json(
      webFormatter.formatResponse({
        token,
        user: webFormatter.formatUser(user)
      }, "注册成功")
    );
  } catch (error) {
    console.error("网页端注册失败:", error);
    return res.status(500).json(webFormatter.formatError(`网页端注册失败: ${error.message}`, 500));
  }
});

router.get("/me", webAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, openid, username, nickname, email, phone, avatar_url,
              is_active, created_at, updated_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(webFormatter.formatError("用户不存在", 404));
    }

    const pricingProfile = await pricingService.getPricingProfile(req.user.id);
    return res.json(
      webFormatter.formatResponse({
        user: webFormatter.formatUser(normalizeUser({
          ...result.rows[0],
          pricing_tier: pricingProfile.pricingTier,
          pricing_discount_rate: pricingProfile.discountRate
        }))
      })
    );
  } catch (error) {
    console.error("获取网页端用户信息失败:", error);
    return res.status(500).json(webFormatter.formatError(`获取网页端用户信息失败: ${error.message}`, 500));
  }
});

router.post("/logout", webAuth, (req, res) => {
  res.json(webFormatter.formatResponse({ success: true }, "已退出登录"));
});

module.exports = router;






