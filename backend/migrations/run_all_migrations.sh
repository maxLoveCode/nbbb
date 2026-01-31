#!/bin/bash

# ============================================
# 服装电商数据库迁移执行脚本
# ============================================

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 数据库配置（请根据实际情况修改）
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-ecommerce}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}服装电商数据库迁移脚本${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# 检查 PostgreSQL 是否可连接
echo -e "${BLUE}正在检查数据库连接...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "SELECT 1;" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 无法连接到数据库！${NC}"
    echo "请检查数据库配置："
    echo "  DB_HOST=$DB_HOST"
    echo "  DB_PORT=$DB_PORT"
    echo "  DB_USER=$DB_USER"
    exit 1
fi

echo -e "${GREEN}✓ 数据库连接成功${NC}"
echo ""

# 创建数据库（如果不存在）
echo -e "${BLUE}正在检查数据库 $DB_NAME...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1

if [ $? -ne 0 ]; then
    echo -e "${BLUE}数据库不存在，正在创建...${NC}"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"
    echo -e "${GREEN}✓ 数据库创建成功${NC}"
else
    echo -e "${GREEN}✓ 数据库已存在${NC}"
fi
echo ""

# 执行迁移文件
MIGRATION_DIR="$(cd "$(dirname "$0")" && pwd)"

run_migration() {
    local file=$1
    local filename=$(basename "$file")
    
    echo -e "${BLUE}正在执行: $filename${NC}"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$file"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $filename 执行成功${NC}"
        echo ""
    else
        echo -e "${RED}❌ $filename 执行失败${NC}"
        exit 1
    fi
}

# 按顺序执行迁移
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}开始执行数据库迁移${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

run_migration "$MIGRATION_DIR/001_create_users_and_sessions.sql"
run_migration "$MIGRATION_DIR/002_update_users_for_wechat.sql"
run_migration "$MIGRATION_DIR/003_create_product_tables.sql"
run_migration "$MIGRATION_DIR/004_create_cart_and_favorite.sql"
run_migration "$MIGRATION_DIR/005_create_address_tables.sql"
run_migration "$MIGRATION_DIR/006_create_order_tables.sql"
run_migration "$MIGRATION_DIR/007_create_promotion_tables.sql"
run_migration "$MIGRATION_DIR/009_create_admin_tables.sql"

# 询问是否插入示例数据
echo ""
echo -e "${BLUE}是否插入示例数据？(y/n)${NC}"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    run_migration "$MIGRATION_DIR/008_insert_sample_data.sql"
else
    echo -e "${BLUE}已跳过示例数据插入${NC}"
fi

# 统计表数量
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}所有迁移执行完成！${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

TABLE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")

echo -e "${GREEN}数据库统计信息：${NC}"
echo -e "  数据库名: ${BLUE}$DB_NAME${NC}"
echo -e "  表数量: ${BLUE}$TABLE_COUNT${NC}"
echo ""

# 显示所有表
echo -e "${BLUE}已创建的表：${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
    SELECT 
        schemaname as schema,
        tablename as table_name
    FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename;
"

echo ""
echo -e "${GREEN}✓ 数据库迁移全部完成！${NC}"
echo ""

