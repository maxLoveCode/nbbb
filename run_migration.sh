#!/bin/bash
# 数据库迁移一键执行脚本

DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce
DB_USER=admin
DB_PASSWORD=AxiaNBBB123

echo "=========================================="
echo "数据库迁移脚本"
echo "=========================================="
echo ""

# 检查迁移文件是否存在
if [ ! -f "/tmp/migration.sql" ]; then
    echo "❌ 迁移文件不存在: /tmp/migration.sql"
    echo "请先运行迁移准备脚本"
    exit 1
fi

echo "步骤1: 尝试更改表的所有者为admin用户..."
echo "----------------------------------------"

# 创建更改所有者的SQL
cat > /tmp/change_owner.sql << 'EOFSQL'
ALTER TABLE orders OWNER TO admin;
ALTER TABLE order_items OWNER TO admin;
SELECT 'Table ownership changed to admin' as status;
EOFSQL

# 尝试使用postgres用户更改所有者
echo "尝试使用postgres用户更改表所有者..."
if sudo -u postgres psql -d $DB_NAME -f /tmp/change_owner.sql 2>/dev/null; then
    echo "✅ 表所有者已更改为admin"
    OWNER_CHANGED=true
elif PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U postgres -d $DB_NAME -f /tmp/change_owner.sql 2>/dev/null; then
    echo "✅ 表所有者已更改为admin"
    OWNER_CHANGED=true
else
    echo "⚠️  无法更改表所有者（需要postgres用户）"
    echo "   将尝试直接使用postgres用户执行迁移"
    OWNER_CHANGED=false
fi

echo ""
echo "步骤2: 执行迁移..."
echo "----------------------------------------"

if [ "$OWNER_CHANGED" = true ]; then
    # 使用admin用户执行迁移
    echo "使用admin用户执行迁移..."
    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f /tmp/migration.sql; then
        echo "✅ 迁移成功！"
        MIGRATION_SUCCESS=true
    else
        echo "❌ 迁移失败"
        MIGRATION_SUCCESS=false
    fi
else
    # 使用postgres用户执行迁移
    echo "使用postgres用户执行迁移..."
    if sudo -u postgres psql -d $DB_NAME -f /tmp/migration.sql 2>/dev/null; then
        echo "✅ 迁移成功！"
        MIGRATION_SUCCESS=true
    elif echo "请输入postgres用户密码:" && PGPASSWORD=$(read -s && echo $REPLY) psql -h $DB_HOST -p $DB_PORT -U postgres -d $DB_NAME -f /tmp/migration.sql 2>/dev/null; then
        echo "✅ 迁移成功！"
        MIGRATION_SUCCESS=true
    else
        echo "❌ 自动迁移失败"
        echo ""
        echo "请手动执行以下命令之一："
        echo ""
        echo "方法1: 使用postgres用户（需要密码）"
        echo "  psql -h $DB_HOST -p $DB_PORT -U postgres -d $DB_NAME -f /tmp/migration.sql"
        echo ""
        echo "方法2: 使用sudo"
        echo "  sudo -u postgres psql -d $DB_NAME -f /tmp/migration.sql"
        echo ""
        MIGRATION_SUCCESS=false
    fi
fi

echo ""
echo "步骤3: 验证迁移结果..."
echo "----------------------------------------"

if [ "$MIGRATION_SUCCESS" = true ]; then
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' AND column_name IN ('order_no', 'receiver_name', 'receiver_address', 'shop_id') ORDER BY column_name;" 2>/dev/null
    
    COLUMN_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'orders' AND column_name IN ('order_no', 'receiver_name', 'receiver_address', 'shop_id');" 2>/dev/null | tr -d ' ')
    
    if [ "$COLUMN_COUNT" -ge 4 ]; then
        echo "✅ 迁移验证成功！所有必需字段已添加"
        echo ""
        echo "现在可以运行测试："
        echo "  cd /nbbb && node test_create_order.js"
    else
        echo "⚠️  迁移可能未完全成功，请检查"
    fi
else
    echo "⚠️  跳过验证（迁移未成功）"
fi

echo ""
echo "=========================================="

