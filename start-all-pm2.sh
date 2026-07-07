#!/bin/zsh
# 鲜当家全系统启动脚本 (PM2 进程守护版 - 简化可靠版)
# 用法：sh start-all-pm2.sh

BASE=/Users/pukun/WorkBuddy/Claw
NODE=/Users/pukun/.workbuddy/binaries/node/versions/22.22.2/bin/node
PM2_BIN=/Users/pukun/.workbuddy/binaries/node/workspace/node_modules/pm2/bin/pm2
PM2="NODE_PATH=/Users/pukun/.workbuddy/binaries/node/workspace/node_modules $NODE $PM2_BIN"

echo "========================================"
echo "  鲜当家全系统启动 (PM2 进程守护)"
echo "========================================"
echo ""

# 1. 停止旧进程
echo "[1/4] 停止旧进程..."
eval "$PM2 delete all" 2>/dev/null
for PORT in 4001 4002 4003 4004 4005 4011 5174 5175 5176; do
  lsof -ti:$PORT 2>/dev/null | xargs kill -9 2>/dev/null
done
sleep 1

# 2. 检查依赖完整性
echo ""
echo "[2/4] 检查依赖完整性..."
check_deps() {
  local name=$1
  local dir=$2
  if [ ! -f "$dir/node_modules/@prisma/client/package.json" ]; then
    echo "  ⚠️  $name: 依赖不完整，正在修复..."
    cd "$dir"
    npm install --cache /tmp/npm-cache-xdj --no-audit --no-fund 2>&1 | tail -2
    if [ -f "$dir/prisma/schema.prisma" ]; then
      npx prisma generate 2>&1 | tail -1
    fi
    echo "  ✅ $name: 依赖修复完成"
  else
    echo "  ✅ $name: 依赖正常"
  fi
}
check_deps "portal-server" "$BASE/portal/server"
check_deps "hrms-server"  "$BASE/hrms/server"
check_deps "scm-server"   "$BASE/xdj-scm/server"
check_deps "mdm-server"   "$BASE/mdm/server"
check_deps "ai-server"    "$BASE/ai-service/server"
check_deps "workflow"     "$BASE/workflow-engine/server"

# 3. 启动所有服务
echo ""
echo "[3/4] 启动服务..."
start_svc() {
  local name=$1
  local cwd=$2
  local script=$3
  local port=$4
  
  eval "$PM2 start $NODE --name $name --cwd $cwd $script" 2>&1 | tail -1
  
  # Health check: 等待端口监听
  local waited=0
  while [ $waited -lt 10 ]; do
    if lsof -i :$port >/dev/null 2>&1; then
      echo "  ✅ $name: 端口 $port 已监听"
      return 0
    fi
    sleep 1
    waited=$((waited + 1))
  done
  echo "  ⚠️  $name: 端口 $port 未监听，请检查日志"
}

start_svc "portal-server"   "$BASE/portal/server"        "$BASE/portal/server/src/index.js"       4001
start_svc "hrms-server"    "$BASE/hrms/server"          "$BASE/hrms/server/src/index.js"         4002
start_svc "scm-server"     "$BASE/xdj-scm/server"       "$BASE/xdj-scm/server/src/index.js"      4003
start_svc "ai-server"      "$BASE/ai-service/server"    "$BASE/ai-service/server/src/index.js"   4004
start_svc "mdm-server"    "$BASE/mdm/server"           "$BASE/mdm/server/src/index.js"          4005
start_svc "workflow-engine" "$BASE/workflow-engine/server" "$BASE/workflow-engine/server/src/index.js" 4011
start_svc "gateway"        "$BASE"                      "$BASE/gateway.js"                       5174

# 4. 保存配置
echo ""
echo "[4/4] 保存 PM2 配置..."
eval "$PM2 save" 2>/dev/null

echo ""
echo "========================================"
echo "  ✅ 所有服务已启动！"
echo "========================================"
echo "  访问地址: <add> http://localhost:5174"
echo "  PM2 状态: $PM2 list"
echo "========================================"
