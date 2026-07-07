/**
 * 响应格式化器
 *
 * 将 API 返回的结构化数据格式化为用户友好的自然语言回答。
 */

/**
 * 格式化库存查询结果
 */
export function formatInventory(data, entities) {
  const { list, total } = data;
  if (!list || list.length === 0) {
    return '未找到库存记录。';
  }

  const lines = [`📊 **库存查询结果**（共 ${total} 条记录）\n`];

  // 显示前 10 条
  const display = list.slice(0, 10);
  for (const item of display) {
    const material = item.material || {};
    const warehouse = item.warehouse || {};
    const available = item.availableQty ?? (item.qty - (item.lockedQty || 0));
    const status = available <= 0 ? '🔴 缺货' : available <= 10 ? '🟡 偏低' : '🟢 正常';
    lines.push(`• **${material.name || '未知'}** (${material.code || '-'})`);
    lines.push(`  库存: ${item.qty} ${material.unit || ''} | 可用: ${available} | 仓库: ${warehouse.name || '-'} ${status}`);
  }

  if (total > 10) {
    lines.push(`\n...还有 ${total - 10} 条记录未显示`);
  }

  return lines.join('\n');
}

/**
 * 格式化低库存预警
 */
export function formatLowStock(data) {
  const { list, total } = data;
  const lowStockItems = (list || []).filter(item => (item.availableQty ?? item.qty) <= 10);

  if (lowStockItems.length === 0) {
    return '✅ 当前没有低库存预警，所有商品库存充足。';
  }

  const lines = [`⚠️ **低库存预警**（${lowStockItems.length} 个商品需要补货）\n`];
  for (const item of lowStockItems.slice(0, 15)) {
    const material = item.material || {};
    const available = item.availableQty ?? item.qty;
    lines.push(`• **${material.name || '未知'}** — 可用: ${available} ${material.unit || ''}（仓库: ${item.warehouse?.name || '-'}）`);
  }

  return lines.join('\n');
}

/**
 * 格式化销售订单查询
 */
export function formatSalesOrders(data, entities) {
  const { list, total } = data;
  if (!list || list.length === 0) {
    return '未找到销售订单记录。';
  }

  const lines = [`📋 **销售订单查询**（共 ${total} 条）\n`];

  for (const order of list.slice(0, 8)) {
    const statusMap = {
      DRAFT: '📝 草稿', PENDING: '⏳ 待审', APPROVED: '✅ 已批',
      CONFIRMED: '✅ 已确认', SHIPPING: '🚚 配送中', DELIVERED: '📦 已送达',
      CLOSED: '🔒 已关闭', CANCELLED: '❌ 已取消',
    };
    lines.push(`• **${order.orderNo || order.id}** — ${order.customer?.name || '未知客户'}`);
    lines.push(`  金额: ¥${Number(order.totalAmount || 0).toLocaleString()} | 状态: ${statusMap[order.status] || order.status}`);
  }

  if (total > 8) {
    lines.push(`\n...还有 ${total - 8} 条订单未显示`);
  }

  return lines.join('\n');
}

/**
 * 格式化采购订单查询
 */
export function formatPurchaseOrders(data) {
  const { list, total } = data;
  if (!list || list.length === 0) {
    return '未找到采购订单记录。';
  }

  const lines = [`📋 **采购订单查询**（共 ${total} 条）\n`];

  for (const order of list.slice(0, 8)) {
    lines.push(`• **${order.orderNo || order.id}** — ${order.supplier?.name || '未知供应商'}`);
    lines.push(`  金额: ¥${Number(order.totalAmount || 0).toLocaleString()} | 状态: ${order.status || '-'}`);
  }

  if (total > 8) {
    lines.push(`\n...还有 ${total - 8} 条订单未显示`);
  }

  return lines.join('\n');
}

/**
 * 格式化员工查询
 */
export function formatEmployees(data) {
  const { list, total, page, pageSize } = data;
  if (!list || list.length === 0) {
    return '未找到员工记录。';
  }

  const lines = [`👥 **员工信息查询**（共 ${total} 人）\n`];

  for (const emp of list.slice(0, 10)) {
    lines.push(`• **${emp.name || '未知'}** (${emp.employeeNo || '-'}) — ${emp.department?.name || emp.departmentName || '未分配部门'} | ${emp.positionTitle || emp.position || '-'}`);
  }

  if (total > 10) {
    lines.push(`\n...还有 ${total - 10} 名员工未显示`);
  }

  return lines.join('\n');
}

/**
 * 格式化部门查询
 */
export function formatDepartments(data) {
  const list = Array.isArray(data) ? data : data?.list || [];
  if (!list || list.length === 0) {
    return '未找到部门记录。';
  }

  const lines = [`🏢 **部门信息**（共 ${list.length} 个部门）\n`];
  for (const dept of list) {
    const empCount = dept._count?.employees || dept.employeeCount || 0;
    lines.push(`• **${dept.name}** — 负责人: ${dept.manager?.name || dept.managerName || '-'} | 人数: ${empCount}`);
  }

  return lines.join('\n');
}

/**
 * 格式化 MDM 同步状态
 */
export function formatMdmSync(data) {
  const { masterData, scmSync, recentLogs } = data;
  const lines = ['🔄 **主数据同步状态**\n'];

  lines.push(`**主数据统计:**`);
  lines.push(`  部门: ${masterData?.departments || 0} | 员工: ${masterData?.employees || 0}`);

  lines.push(`\n**SCM 同步状态:**`);
  lines.push(`  部门映射: ${scmSync?.deptMappings || 0} | 员工映射: ${scmSync?.empMappings || 0}`);
  lines.push(`  待同步: ${scmSync?.pending || 0} | 失败: ${scmSync?.failed || 0}`);

  if (recentLogs && recentLogs.length > 0) {
    lines.push(`\n**最近同步记录:**`);
    for (const log of recentLogs.slice(0, 5)) {
      const status = log.status === 'SUCCESS' ? '✅' : log.status === 'FAILED' ? '❌' : '⏳';
      lines.push(`  ${status} ${log.syncType} — ${log.successCount || 0} 成功 / ${log.failedCount || 0} 失败`);
    }
  }

  return lines.join('\n');
}

/**
 * 格式化销售计划/需求汇总
 */
export function formatSalesPlans(data) {
  const { list, total } = data;
  if (!list || list.length === 0) {
    return '未找到销售计划记录。';
  }

  const lines = [`📋 **销售计划查询**（共 ${total} 条）\n`];
  for (const plan of list.slice(0, 8)) {
    lines.push(`• **${plan.planNo || plan.id}** — ${plan.title || '无标题'}`);
    lines.push(`  状态: ${plan.status || '-'} | 销售员: ${plan.salesRep?.name || '-'}`);
  }

  if (total > 8) {
    lines.push(`\n...还有 ${total - 8} 条计划未显示`);
  }

  return lines.join('\n');
}

/**
 * 格式化库存统计
 */
export function formatInventoryStats(data) {
  const lines = ['📊 **库存统计概览**\n'];
  lines.push(`SKU 总数: ${data.totalSKUs || 0}`);
  lines.push(`低库存预警: ${data.lowStock || 0}`);
  lines.push(`活跃批次: ${data.totalBatches || 0}`);

  if (data.warehouses && data.warehouses.length > 0) {
    lines.push('\n**仓库分布:**');
    for (const wh of data.warehouses) {
      lines.push(`  • ${wh.name} (${wh.code}) — ${wh._count?.inventory || 0} 个SKU`);
    }
  }

  return lines.join('\n');
}

/**
 * 格式化帮助信息
 */
export function formatHelp() {
  const lines = [
    '🤖 **AI 智能助手 — 您的食用菌管理平台助手**\n',
    '我可以帮您查询和分析以下信息：\n',
    '**📦 库存查询：**',
    '  • "查看库存" — 查看所有库存',
    '  • "香菇的库存" — 查看特定商品库存',
    '  • "低库存预警" — 查看需要补货的商品',
    '',
    '**📋 订单查询：**',
    '  • "今天的销售订单" — 查看销售订单',
    '  • "采购订单" — 查看采购订单',
    '  • "销售计划" — 查看销售计划/需求汇总',
    '',
    '**👥 人员查询：**',
    '  • "有多少员工" — 查询员工信息',
    '  • "部门列表" — 查看部门信息',
    '',
    '**🔄 主数据：**',
    '  • "同步状态" — 查看主数据同步情况',
    '',
    '**🤖 智能助手：**',
    '  • "帮我下一个订单" — 订单助手',
    '  • "销售分析" — 销售数据分析',
    '  • "库存预测" — 库存预测',
    '',
    '请直接输入您的问题，我会尽力为您解答！',
  ];
  return lines.join('\n');
}

/**
 * 格式化未知意图
 */
export function formatUnknown(text) {
  return `抱歉，我暂时无法理解「${text}」的含义。\n\n您可以试试：\n• "查看库存"\n• "今天的订单"\n• "有多少员工"\n• "同步状态"\n• 输入"帮助"查看更多功能`;
}
