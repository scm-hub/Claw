#!/bin/bash
# HRMS 服务启动脚本
# 使用方法: ./start.sh

echo "🛑 停止旧服务..."
pkill -f "node.*hrms/server/src/index" 2>/dev/null
sleep 2

echo "🔄 重新生成 Prisma Client..."
cd "$(dirname "$0")"
npx prisma generate

echo "🚀 启动后端服务..."
node src/index.js &
SERVER_PID=$!

sleep 3

# 验证服务
HEALTH=$(curl -s http://localhost:3001/api/health 2>/dev/null)
if echo "$HEALTH" | grep -q "HRMS API is running"; then
  echo "✅ 后端服务启动成功 (PID: $SERVER_PID)"
  echo "   地址: http://localhost:3001"
else
  echo "❌ 后端服务启动失败"
  exit 1
fi

echo ""
echo "📊 数据库状态:"
mysql -u root -p'Scm@2025!' hrms -e "
  SELECT '用户' AS 表名, COUNT(*) AS 记录数 FROM User
  UNION ALL SELECT '部门', COUNT(*) FROM Department
  UNION ALL SELECT '员工', COUNT(*) FROM Employee;
" 2>/dev/null

echo ""
echo "🟢 HRMS 系统已就绪！"
echo "   后端: http://localhost:3001"
echo "   前端: http://localhost:5173"
