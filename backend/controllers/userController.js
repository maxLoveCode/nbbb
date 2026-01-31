const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "ecommerce",
  user: "admin",
  password: "AxiaNBBB123"
});

/**
 * 用户控制器
 */
class UserController {
  /**
   * 更新用户资料
   * POST /user/profile
   * 注意：member字段由系统根据消费金额自动计算，不支持手动更新
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { nickname, avatarUrl } = req.body;

      // 构建更新字段
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

      if (updates.length === 0) {
        return res.status(400).json({
          code: 400,
          message: "没有要更新的字段"
        });
      }

      values.push(userId);

      const updateQuery = `
        UPDATE users 
        SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex}
        RETURNING id, openid, unionid, nickname, avatar_url, phone as mobile, member, is_active, created_at, updated_at
      `;

      const result = await pool.query(updateQuery, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          code: 404,
          message: "用户不存在"
        });
      }

      const user = result.rows[0];

      res.json({
        code: 0,
        data: {
          user: {
            id: user.id,
            openid: user.openid,
            nickname: user.nickname,
            avatarUrl: user.avatar_url,
            mobile: user.mobile,
            member: user.member,
            isActive: user.is_active,
            createdAt: user.created_at,
            updatedAt: user.updated_at
          }
        }
      });

    } catch (error) {
      console.error("更新用户资料失败:", error.message);
      res.status(500).json({
        code: 500,
        message: "更新用户资料失败"
      });
    }
  }
}

module.exports = new UserController();
