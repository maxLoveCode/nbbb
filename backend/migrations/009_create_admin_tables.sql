-- ============================================
-- 后台管理员相关表
-- ============================================

-- 1. 管理员角色表
CREATE TABLE IF NOT EXISTS admin_roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,  -- 角色名称：超级管理员、商品管理员、订单管理员、客服等
    name_en VARCHAR(50),
    description TEXT,  -- 角色描述
    
    -- 权限设置（JSON格式存储权限配置）
    permissions JSONB DEFAULT '{}',  -- 权限配置：{"products": ["read", "write"], "orders": ["read"]}
    
    -- 状态
    is_active BOOLEAN DEFAULT true,
    is_super BOOLEAN DEFAULT false,  -- 是否超级管理员
    
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 管理员表
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,  -- 登录用户名
    password_hash VARCHAR(255) NOT NULL,  -- 密码哈希
    salt VARCHAR(50),  -- 密码盐值
    
    -- 基本信息
    real_name VARCHAR(100),  -- 真实姓名
    email VARCHAR(100),  -- 邮箱
    mobile VARCHAR(20),  -- 手机号
    avatar_url VARCHAR(500),  -- 头像
    
    -- 角色权限
    role_id INTEGER NOT NULL REFERENCES admin_roles(id) ON DELETE RESTRICT,
    
    -- 状态信息
    status VARCHAR(20) DEFAULT 'active',  -- active-正常, disabled-禁用, locked-锁定
    
    -- 登录相关
    last_login_at TIMESTAMP,  -- 最后登录时间
    last_login_ip INET,  -- 最后登录IP
    login_count INTEGER DEFAULT 0,  -- 登录次数
    
    -- 密码相关
    password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- 密码修改时间
    must_change_password BOOLEAN DEFAULT false,  -- 是否必须修改密码
    failed_login_count INTEGER DEFAULT 0,  -- 连续登录失败次数
    locked_until TIMESTAMP,  -- 锁定到期时间
    
    -- 审计字段
    created_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,  -- 创建人
    updated_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,  -- 最后修改人
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 管理员登录日志表
CREATE TABLE IF NOT EXISTS admin_login_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL,  -- 登录用户名（冗余存储，防止用户被删除后无法追溯）
    
    -- 登录信息
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    login_ip INET,  -- 登录IP
    user_agent TEXT,  -- 浏览器信息
    
    -- 登录结果
    login_result VARCHAR(20) NOT NULL,  -- success-成功, failed-失败, locked-账号锁定
    fail_reason VARCHAR(100),  -- 失败原因：密码错误、账号禁用、账号锁定等
    
    -- 会话信息
    session_id VARCHAR(64),  -- 会话ID
    logout_time TIMESTAMP,  -- 登出时间
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 管理员操作日志表
CREATE TABLE IF NOT EXISTS admin_operation_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
    username VARCHAR(50),  -- 操作人用户名（冗余存储）
    real_name VARCHAR(100),  -- 操作人姓名（冗余存储）
    
    -- 操作信息
    module VARCHAR(50) NOT NULL,  -- 操作模块：product, order, user, promotion等
    action VARCHAR(50) NOT NULL,  -- 操作动作：create, update, delete, export等
    resource_type VARCHAR(50),  -- 资源类型：products, orders, users等
    resource_id VARCHAR(100),  -- 资源ID
    
    -- 操作详情
    operation_desc TEXT,  -- 操作描述
    request_url VARCHAR(500),  -- 请求URL
    request_method VARCHAR(10),  -- 请求方法：GET, POST, PUT, DELETE
    request_params JSONB,  -- 请求参数
    
    -- 操作结果
    operation_result VARCHAR(20) DEFAULT 'success',  -- success-成功, failed-失败
    error_message TEXT,  -- 错误信息
    
    -- 请求信息
    ip_address INET,  -- 操作IP
    user_agent TEXT,  -- 浏览器信息
    
    -- 数据变更（可选，用于重要操作的审计）
    old_data JSONB,  -- 变更前数据
    new_data JSONB,  -- 变更后数据
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. 管理员会话表
CREATE TABLE IF NOT EXISTS admin_sessions (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    session_id VARCHAR(64) UNIQUE NOT NULL,  -- 会话ID
    
    -- 会话信息
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    
    -- 客户端信息
    ip_address INET,
    user_agent TEXT,
    
    -- 状态
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. 系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,  -- 配置键
    config_value TEXT,  -- 配置值
    config_type VARCHAR(20) DEFAULT 'string',  -- 配置类型：string, number, boolean, json
    category VARCHAR(50),  -- 配置分类：system, security, business等
    
    description TEXT,  -- 配置说明
    is_encrypted BOOLEAN DEFAULT false,  -- 是否加密存储
    
    -- 修改记录
    updated_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 初始化默认角色
-- ============================================

-- 插入默认角色
INSERT INTO admin_roles (name, name_en, description, permissions, is_super, sort_order) VALUES
(
    '超级管理员', 
    'Super Admin',
    '拥有系统所有权限，可以管理其他管理员',
    '{"*": ["*"]}',  -- 所有权限
    true,
    1
),
(
    '商品管理员',
    'Product Manager', 
    '负责商品管理、类目管理、库存管理',
    '{"products": ["read", "write", "delete"], "categories": ["read", "write"], "inventory": ["read", "write"]}',
    false,
    2
),
(
    '订单管理员',
    'Order Manager',
    '负责订单处理、发货管理、售后处理',
    '{"orders": ["read", "write"], "refunds": ["read", "write"], "shipping": ["read", "write"]}',
    false,
    3
),
(
    '营销管理员',
    'Marketing Manager',
    '负责优惠券、促销活动、会员管理',
    '{"coupons": ["read", "write"], "promotions": ["read", "write"], "members": ["read", "write"]}',
    false,
    4
),
(
    '客服专员',
    'Customer Service',
    '负责用户管理、评价管理、客户服务',
    '{"users": ["read"], "reviews": ["read", "write"], "customer_service": ["read", "write"]}',
    false,
    5
),
(
    '数据分析师',
    'Data Analyst',
    '负责数据查看、报表导出、统计分析',
    '{"reports": ["read"], "analytics": ["read"], "export": ["read"]}',
    false,
    6
);

-- ============================================
-- 系统配置初始化
-- ============================================

INSERT INTO system_configs (config_key, config_value, config_type, category, description) VALUES
-- 安全配置
('admin.session_timeout', '7200', 'number', 'security', '管理员会话超时时间（秒）'),
('admin.max_login_attempts', '5', 'number', 'security', '最大登录尝试次数'),
('admin.lockout_duration', '1800', 'number', 'security', '账号锁定时长（秒）'),
('admin.password_min_length', '8', 'number', 'security', '密码最小长度'),
('admin.password_must_complex', 'true', 'boolean', 'security', '密码是否必须包含数字、字母、特殊字符'),
('admin.password_expire_days', '90', 'number', 'security', '密码过期天数'),

-- 系统配置
('system.site_name', '服装商城管理后台', 'string', 'system', '网站名称'),
('system.company_name', '某某服装有限公司', 'string', 'system', '公司名称'),
('system.contact_email', 'admin@example.com', 'string', 'system', '联系邮箱'),
('system.timezone', 'Asia/Shanghai', 'string', 'system', '系统时区'),

-- 业务配置
('business.default_shipping_fee', '10.00', 'number', 'business', '默认运费'),
('business.free_shipping_threshold', '99.00', 'number', 'business', '包邮门槛'),
('business.return_days', '7', 'number', 'business', '退货天数'),
('business.auto_confirm_days', '7', 'number', 'business', '自动确认收货天数');

-- ============================================
-- 创建索引
-- ============================================

-- admin_roles
CREATE INDEX IF NOT EXISTS idx_admin_roles_is_active ON admin_roles(is_active);

-- admins
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
CREATE INDEX IF NOT EXISTS idx_admins_role_id ON admins(role_id);
CREATE INDEX IF NOT EXISTS idx_admins_status ON admins(status);
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_mobile ON admins(mobile);

-- admin_login_logs
CREATE INDEX IF NOT EXISTS idx_admin_login_logs_admin_id ON admin_login_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_login_logs_username ON admin_login_logs(username);
CREATE INDEX IF NOT EXISTS idx_admin_login_logs_login_time ON admin_login_logs(login_time);
CREATE INDEX IF NOT EXISTS idx_admin_login_logs_login_ip ON admin_login_logs(login_ip);
CREATE INDEX IF NOT EXISTS idx_admin_login_logs_result ON admin_login_logs(login_result);

-- admin_operation_logs
CREATE INDEX IF NOT EXISTS idx_admin_operation_logs_admin_id ON admin_operation_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_operation_logs_module ON admin_operation_logs(module);
CREATE INDEX IF NOT EXISTS idx_admin_operation_logs_action ON admin_operation_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_operation_logs_created_at ON admin_operation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_operation_logs_resource ON admin_operation_logs(resource_type, resource_id);

-- admin_sessions
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_session_id ON admin_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_is_active ON admin_sessions(is_active);

-- system_configs
CREATE INDEX IF NOT EXISTS idx_system_configs_category ON system_configs(category);

-- ============================================
-- 创建触发器
-- ============================================

CREATE TRIGGER update_admin_roles_updated_at 
    BEFORE UPDATE ON admin_roles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admins_updated_at 
    BEFORE UPDATE ON admins 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_configs_updated_at 
    BEFORE UPDATE ON system_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 管理员密码安全触发器
-- ============================================

-- 密码修改时更新相关字段
CREATE OR REPLACE FUNCTION update_admin_password_info()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果密码发生变化
    IF OLD.password_hash IS DISTINCT FROM NEW.password_hash THEN
        NEW.password_changed_at = CURRENT_TIMESTAMP;
        NEW.must_change_password = false;
        NEW.failed_login_count = 0;  -- 重置失败次数
        NEW.locked_until = NULL;     -- 解除锁定
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER admin_password_change_trigger
    BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_admin_password_info();

-- ============================================
-- 清理过期会话的函数
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_admin_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM admin_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP OR is_active = false;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 提示信息
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE '后台管理员表创建完成！';
    RAISE NOTICE '============================================';
    RAISE NOTICE '已创建：';
    RAISE NOTICE '- admin_roles: 管理员角色表（6个默认角色）';
    RAISE NOTICE '- admins: 管理员表';
    RAISE NOTICE '- admin_login_logs: 登录日志表';
    RAISE NOTICE '- admin_operation_logs: 操作日志表';
    RAISE NOTICE '- admin_sessions: 会话管理表';
    RAISE NOTICE '- system_configs: 系统配置表（12个默认配置）';
    RAISE NOTICE '============================================';
    RAISE NOTICE '默认角色包括：';
    RAISE NOTICE '1. 超级管理员 - 所有权限';
    RAISE NOTICE '2. 商品管理员 - 商品、类目、库存管理';
    RAISE NOTICE '3. 订单管理员 - 订单、发货、售后管理';
    RAISE NOTICE '4. 营销管理员 - 优惠券、促销、会员管理';
    RAISE NOTICE '5. 客服专员 - 用户、评价、客服管理';
    RAISE NOTICE '6. 数据分析师 - 数据查看、报表导出';
    RAISE NOTICE '============================================';
    RAISE NOTICE '请创建第一个超级管理员账号！';
    RAISE NOTICE '============================================';
END $$;
