const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'ecommerce',
  user: 'admin',
  password: 'AxiaNBBB123'
});

/**
 * 获取地址列表
 */
exports.getAddressList = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT * FROM addresses
       WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('获取地址列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取地址列表失败'
    });
  }
};

/**
 * 获取单个地址详情
 */
exports.getAddressDetail = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM addresses WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '地址不存在'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('获取地址详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取地址详情失败'
    });
  }
};

/**
 * 创建新地址
 */
exports.createAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      phone,
      mobile,
      province_name,
      city_name,
      district_name,
      detail_address,
      postal_code,
      email,
      is_default,
      address_tag
    } = req.body;

    // 验证必填字段
    if (!name || !detail_address) {
      return res.status(400).json({
        success: false,
        message: '姓名和详细地址为必填项'
      });
    }

    // 验证联系方式：phone 或 mobile 至少填写一项
    if (!phone && !mobile) {
      return res.status(400).json({
        success: false,
        message: '联系电话和手机号至少填写一项'
      });
    }

    // 开始事务
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 如果设置为默认地址，先取消其他默认地址
      if (is_default) {
        await client.query(
          'UPDATE addresses SET is_default = false WHERE user_id = $1',
          [userId]
        );
      }

      // 插入新地址
      const result = await client.query(
        `INSERT INTO addresses
         (user_id, name, phone, mobile, province_name, city_name, district_name,
          detail_address, postal_code, email, is_default, address_tag)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [userId, name, phone || null, mobile || null, province_name, city_name, district_name,
         detail_address, postal_code, email || null, is_default || false, address_tag]
      );

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: '地址创建成功'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('创建地址失败:', error);
    res.status(500).json({
      success: false,
      message: '创建地址失败'
    });
  }
};

/**
 * 更新地址
 */
exports.updateAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      name,
      phone,
      mobile,
      province_name,
      city_name,
      district_name,
      detail_address,
      postal_code,
      email,
      is_default,
      address_tag
    } = req.body;

    // 验证必填字段
    if (!name || !detail_address) {
      return res.status(400).json({
        success: false,
        message: '姓名和详细地址为必填项'
      });
    }

    // 验证联系方式：phone 或 mobile 至少填写一项
    if (!phone && !mobile) {
      return res.status(400).json({
        success: false,
        message: '联系电话和手机号至少填写一项'
      });
    }

    // 开始事务
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 检查地址是否属于当前用户
      const checkResult = await client.query(
        'SELECT id FROM addresses WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: '地址不存在'
        });
      }

      // 如果设置为默认地址，先取消其他默认地址
      if (is_default) {
        await client.query(
          'UPDATE addresses SET is_default = false WHERE user_id = $1 AND id != $2',
          [userId, id]
        );
      }

      // 更新地址
      const result = await client.query(
        `UPDATE addresses SET
         name = $1, phone = $2, mobile = $3, province_name = $4, city_name = $5,
         district_name = $6, detail_address = $7, postal_code = $8,
         email = $9, is_default = $10, address_tag = $11, updated_at = CURRENT_TIMESTAMP
         WHERE id = $12 AND user_id = $13
         RETURNING *`,
        [name, phone || null, mobile || null, province_name, city_name, district_name,
         detail_address, postal_code, email || null, is_default || false, address_tag,
         id, userId]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        data: result.rows[0],
        message: '地址更新成功'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('更新地址失败:', error);
    res.status(500).json({
      success: false,
      message: '更新地址失败'
    });
  }
};

/**
 * 删除地址
 */
exports.deleteAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '地址不存在'
      });
    }

    res.json({
      success: true,
      message: '地址删除成功'
    });
  } catch (error) {
    console.error('删除地址失败:', error);
    res.status(500).json({
      success: false,
      message: '删除地址失败'
    });
  }
};

/**
 * 设置默认地址
 */
exports.setDefaultAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // 开始事务
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 检查地址是否属于当前用户
      const checkResult = await client.query(
        'SELECT id FROM addresses WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: '地址不存在'
        });
      }

      // 取消其他默认地址
      await client.query(
        'UPDATE addresses SET is_default = false WHERE user_id = $1',
        [userId]
      );

      // 设置为默认地址
      const result = await client.query(
        `UPDATE addresses SET is_default = true, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [id, userId]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        data: result.rows[0],
        message: '默认地址设置成功'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('设置默认地址失败:', error);
    res.status(500).json({
      success: false,
      message: '设置默认地址失败'
    });
  }
};
