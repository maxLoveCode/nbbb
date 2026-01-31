const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "ecommerce",
  user: "admin",
  password: "AxiaNBBB123"
});

/**
 * 用户服务
 * 提供用户相关的业务逻辑
 */
class UserService {
  /**
   * 根据ID获取用户信息
   * @param {number} userId - 用户ID
   * @returns {Object} 用户信息
   */
  async getUserById(userId) {
    try {
      const result = await pool.query(
        "SELECT id, openid, unionid, nickname, avatar_url, phone, email, username, is_active, created_at, updated_at FROM users WHERE id = $1",
        [userId]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error("获取用户信息失败:", error);
      throw error;
    }
  }

  /**
   * 根据 openid 获取用户
   * @param {string} openid - 微信 openid
   * @returns {Object} 用户信息
   */
  async getUserByOpenid(openid) {
    try {
      const result = await pool.query(
        "SELECT * FROM users WHERE openid = $1",
        [openid]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error("获取用户信息失败:", error);
      throw error;
    }
  }

  /**
   * 创建新用户
   * @param {Object} userData - 用户数据
   * @returns {Object} 创建的用户信息
   */
  async createUser(userData) {
    try {
      const {
        openid,
        unionid = null,
        nickname = "用户",
        avatarUrl = "https://via.placeholder.com/100",
        mobile = null,
        email = null,
        username = null,
        password = null
      } = userData;

      let passwordHash = "wechat_user";
      if (password) {
        passwordHash = await bcrypt.hash(password, 10);
      }

      const result = await pool.query(
        `INSERT INTO users (openid, unionid, nickname, avatar_url, mobile, email, username, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, openid, unionid, nickname, avatar_url, mobile, email, username, is_active, created_at`,
        [openid, unionid, nickname, avatarUrl, mobile, email, username, passwordHash]
      );

      return result.rows[0];
    } catch (error) {
      console.error("创建用户失败:", error);
      throw error;
    }
  }

  /**
   * 更新用户资料
   * @param {number} userId - 用户ID
   * @param {Object} updateData - 更新的数据
   * @returns {Object} 更新后的用户信息
   */
  async updateUserProfile(userId, updateData) {
    try {
      const { nickname, avatarUrl, mobile, email } = updateData;
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (nickname !== undefined) {
        updates.push(`nickname = $${paramIndex++}`);
        values.push(nickname);
      }

      if (avatarUrl !== undefined) {
        updates.push(`avatar_url = $${paramIndex++}`);
        values.push(avatarUrl);
      }

      if (mobile !== undefined) {
        updates.push(`mobile = $${paramIndex++}`);
        values.push(mobile);
      }

      if (email !== undefined) {
        updates.push(`email = $${paramIndex++}`);
        values.push(email);
      }

      if (updates.length === 0) {
        return await this.getUserById(userId);
      }

      updates.push(`updated_at = NOW()`);
      values.push(userId);

      const query = `
        UPDATE users 
        SET ${updates.join(", ")}
        WHERE id = $${paramIndex}
        RETURNING id, openid, unionid, nickname, avatar_url, mobile, email, username, is_active, created_at, updated_at
      `;

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error("更新用户资料失败:", error);
      throw error;
    }
  }

  /**
   * 更新用户密码
   * @param {number} userId - 用户ID
   * @param {string} newPassword - 新密码
   */
  async updatePassword(userId, newPassword) {
    try {
      const passwordHash = await bcrypt.hash(newPassword, 10);
      
      await pool.query(
        "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
        [passwordHash, userId]
      );

      return true;
    } catch (error) {
      console.error("更新密码失败:", error);
      throw error;
    }
  }

  /**
   * 验证用户密码
   * @param {number} userId - 用户ID
   * @param {string} password - 密码
   * @returns {boolean} 是否验证通过
   */
  async verifyPassword(userId, password) {
    try {
      const result = await pool.query(
        "SELECT password_hash FROM users WHERE id = $1",
        [userId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      const user = result.rows[0];
      
      // 如果是微信用户（没有设置密码），返回false
      if (user.password_hash === "wechat_user") {
        return false;
      }

      return await bcrypt.compare(password, user.password_hash);
    } catch (error) {
      console.error("验证密码失败:", error);
      return false;
    }
  }

  /**
   * 获取用户列表（管理端使用）
   * @param {Object} options - 查询选项
   * @returns {Object} 用户列表和分页信息
   */
  async getUserList(options = {}) {
    try {
      const {
        page = 1,
        pageSize = 20,
        keyword = "",
        status = null
      } = options;

      const offset = (page - 1) * pageSize;
      const conditions = [];
      const values = [];
      let paramIndex = 1;

      // 关键词搜索
      if (keyword) {
        conditions.push(`(nickname ILIKE $${paramIndex} OR phone ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
        values.push(`%${keyword}%`);
        paramIndex++;
      }

      // 状态筛选
      if (status !== null) {
        conditions.push(`is_active = $${paramIndex}`);
        values.push(status);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      // 查询总数
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM users ${whereClause}`,
        values
      );
      const total = parseInt(countResult.rows[0].count);

      // 查询列表
      const listQuery = `
        SELECT id, openid, nickname, avatar_url, phone, email, username, is_active, created_at, updated_at
        FROM users
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      values.push(pageSize, offset);

      const listResult = await pool.query(listQuery, values);

      return {
        users: listResult.rows,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      };
    } catch (error) {
      console.error("获取用户列表失败:", error);
      throw error;
    }
  }
}

module.exports = new UserService();




