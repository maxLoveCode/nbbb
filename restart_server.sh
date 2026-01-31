#!/bin/bash
# NBBB服务器重启脚本

echo "========================================="
echo "NBBB 服务器重启脚本"
echo "========================================="

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 1. 查找并停止现有进程
echo "1. 查找现有服务器进程..."
PID=$(ps aux | grep "node.*server.js" | grep -v grep | awk '{print $2}')

if [ -n "$PID" ]; then
    echo "   找到进程 PID: $PID"
    echo "2. 停止现有服务器..."
    kill $PID
    sleep 2
    
    # 强制杀死如果还在运行
    if ps -p $PID > /dev/null 2>&1; then
        echo "   强制停止进程..."
        kill -9 $PID
        sleep 1
    fi
    echo "   ✓ 服务器已停止"
else
    echo "   未找到运行中的服务器进程"
fi

# 3. 检查端口是否释放
echo "3. 检查端口 3000..."
sleep 2
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "   警告: 端口3000仍被占用"
    echo "   尝试释放端口..."
    fuser -k 3000/tcp 2>/dev/null || true
    sleep 2
else
    echo "   ✓ 端口3000已释放"
fi

# 4. 启动服务器
echo "4. 启动服务器..."
nohup node backend/server.js > backend.out.log 2>&1 &

# 5. 等待启动
sleep 3

# 6. 检查是否启动成功
NEW_PID=$(ps aux | grep "node.*server.js" | grep -v grep | awk '{print $2}')
if [ -n "$NEW_PID" ]; then
    echo "   ✓ 服务器启动成功"
    echo "   进程 PID: $NEW_PID"
    echo "   日志文件: backend.out.log"
else
    echo "   ✗ 服务器启动失败"
    echo "   查看日志: tail -50 backend.out.log"
    exit 1
fi

# 7. 测试服务器
echo "5. 测试服务器..."
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✓ 服务器响应正常 (HTTP $HTTP_CODE)"
else
    echo "   ⚠ 服务器响应异常 (HTTP $HTTP_CODE)"
fi

echo ""
echo "========================================="
echo "服务器重启完成！"
echo "========================================="
echo ""
echo "访问地址:"
echo "  Web首页: http://localhost:3000/"
echo "  API信息: http://localhost:3000/api/info"
echo "  健康检查: http://localhost:3000/health"
echo ""
echo "查看日志: tail -f backend.out.log"
echo "停止服务: pkill -f 'node.*server.js'"
echo ""




