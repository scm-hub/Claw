#!/bin/zsh
# 鲜当家全系统启动脚本
# 用法：sh start-all.sh

NODE=/Users/pukun/.workbuddy/binaries/node/versions/22.22.2/bin/node
BASE=/Users/pukun/WorkBuddy/Claw

echo "正在停止旧进程..."
# 后端服务 + 网关 + 旧的独立 preview 服务
for PORT in 4001 4002 4003 4004 4005 5174 5175 5176 5177 5178; do
  lsof -ti:$PORT 2>/dev/null | xargs kill -9 2>/dev/null
done
sleep 1

echo "启动后端服务..."
cd $BASE/portal/server   && $NODE src/index.js  > /tmp/portal-server.log  2>&1 &
cd $BASE/hrms/server     && $NODE src/index.js  > /tmp/hrms-server.log    2>&1 &
cd $BASE/xdj-scm/server  && $NODE src/index.js  > /tmp/scm-server.log     2>&1 &
cd $BASE/mdm/server      && $NODE src/index.js  > /tmp/mdm-server.log     2>&1 &

echo "等待后端就绪..."
sleep 3

echo "启动统一网关 (5174)..."
cd $BASE && $NODE gateway.js > /tmp/gateway.log 2>&1 &

echo ""
echo "========================================"
echo "  所有服务已启动！"
echo "========================================"
echo "  外网访问: http://111.17.201.197:5174"
echo "  局域网:   http://192.168.21.34:5174"
echo ""
echo "  路径规则:"
echo "  /         → Portal SSO 登录"
echo "  /scm/*    → SCM 供应链 (PC)"
echo "  /mobile/* → SCM 移动端"
echo "  /hrms/*   → HRMS 人力系统"
echo "  /mdm/*    → MDM 主数据"
echo "========================================"
echo ""
echo "日志查看:"
echo "  tail -f /tmp/gateway.log"
echo "  tail -f /tmp/scm-server.log"
