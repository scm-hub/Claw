#!/bin/zsh
# 鲜当家系统健康检查脚本
# 用法：sh health-check.sh
# 功能：检查所有核心服务是否正常，如果发现问题自动尝试修复

BASE=/Users/pukun/WorkBuddy/Claw
NODE=/Users/pukun/.workbuddy/binaries/node/versions/22.22.2/bin/node
PM2="NODE_PATH=/Users/pukun/.workbuddy/binaries/node/workspace/node_modules $NODE /Users/pukun/.workbuddy/binaries/node/workspace/node_modules/pm2/bin/pm2"

echo "========================================"
echo "  鲜当家系统健康检查"
echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"
echo ""

# 检查端口监听
check_port() {
  local svc=$1
  local port=$2
  if lsof -i :$port >/dev/null 2>&1; then
    echo "✅ $svc (端口 $port): 正常监听"
    return 0
  else
    echo "❌ $svc (端口 $port): 未监听！"
    return 1
  fi
}

# 检查 PM2 进程状态
check_pm2() {
  local svc=$1
  local status=$($PM2 list 2>/dev/null | grep "$svc" | awk '{print $11}')
  if [ "$status" = "online" ]; then
    echo "✅ $svc: PM2 状态正常"
    return 0
  else
    echo "⚠️  $svc: PM2 状态异常 ($status)"
    return 1
  fi
}

# 检查 node_modules 完整性
check_deps() {
  local svc=$1
  local dir=$2
  if [ ! -f "$dir/node_modules/@prisma/client/package.json" ]; then
    echo "⚠️  $svc: node_modules 不完整"
    return 1
  else
    echo "✅ $svc: node_modules 完整"
    return 0
  fi
}

echo "[1/3] 检查端口监听..."
check_port "portal-server"   4001
check_port "hrms-server"    4002
check_port "scm-server"     4003
check_port "ai-server"      4004
check_port "mdm-server"     4005
check_port "workflow"       4011
check_port "gateway"        5174

echo ""
echo "[2/3] 检查 PM2 进程状态..."
$PM2 list 2>/dev/null | grep -E "portal|hrms|scm|ai|mdm|workflow|gateway" | while read line; do
  svc=$(echo $line | awk '{print $3}')
  status=$(echo $line | awk '{print $11}')
  if [ "$status" = "online" ]; then
    echo "✅ $svc: $status"
  else
    echo "⚠️  $svc: $status"
  fi
done

echo ""
echo "[3/3] 检查依赖完整性..."
check_deps "portal-server" "$BASE/portal/server"
check_deps "hrms-server"  "$BASE/hrms/server"
check_deps "scm-server"   "$BASE/xdj-scm/server"

echo ""
echo "========================================"
echo "  健康检查完成"
echo "========================================"

# 如果发现服务挂了，尝试重启
if ! lsof -i :4001 >/dev/null 2>&1; then
  echo ""
  echo "⚠️  发现服务异常，尝试自动修复..."
  sh $BASE/start-all-pm2.sh
fi
