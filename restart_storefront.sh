#!/bin/bash

echo "========================================="
echo "NBBB Storefront 重启脚本"
echo "========================================="

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
STOREFRONT_DIR="$SCRIPT_DIR/storefront"
LOG_FILE="$SCRIPT_DIR/storefront.out.log"
PORT=3001

cd "$STOREFRONT_DIR" || exit 1

echo "1. 查找现有 storefront 进程..."
PID=$(ps aux | grep -E "npm run start -H 0.0.0.0 -p $PORT|next start -H 0.0.0.0 -p $PORT|next/dist/bin/next.*-p $PORT" | grep -v grep | awk '{print $2}')

if [ -n "$PID" ]; then
    echo "   找到进程 PID: $PID"
    kill $PID
    sleep 2
    if ps -p $PID > /dev/null 2>&1; then
        echo "   强制停止进程..."
        kill -9 $PID
        sleep 1
    fi
    echo "   ✓ 已停止旧 storefront"
else
    echo "   未找到运行中的 storefront 进程"
fi

echo "2. 构建 storefront..."
npm run build
if [ $? -ne 0 ]; then
    echo "   ✗ 构建失败"
    exit 1
fi

echo "3. 启动 storefront..."
nohup npm run start -- -H 0.0.0.0 -p $PORT > "$LOG_FILE" 2>&1 &

sleep 5

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT")
if [ "$HTTP_CODE" = "200" ]; then
    NEW_PID=$(ps aux | grep -E "npm run start -H 0.0.0.0 -p $PORT|next start -H 0.0.0.0 -p $PORT|next/dist/bin/next.*-p $PORT" | grep -v grep | awk '{print $2}')
    echo "   ✓ storefront 启动成功"
    if [ -n "$NEW_PID" ]; then
        echo "   进程 PID: $NEW_PID"
    fi
    echo "   日志文件: $LOG_FILE"
    echo "4. 健康检查通过 (HTTP $HTTP_CODE)"
else
    echo "4. 健康检查异常 (HTTP $HTTP_CODE)"
    exit 1
fi

echo ""
echo "访问地址:"
echo "  Storefront: http://127.0.0.1:$PORT"
