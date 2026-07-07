import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { classifyIntentSmart, getSupportedIntents } from '../services/intent-engine.js';
import * as formatter from '../services/response-formatter.js';
import { hrmsApi, scmApi, mdmApi, getSsoToken } from '../services/api-clients.js';
import { chat, hasApiKey } from '../services/deepseek-client.js';

const router = Router();
router.use(authenticate);

/**
 * POST /api/chat
 * body: { message: "用户输入", history: [{role, content}] }
 */
router.post('/', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: '请输入问题' });
    }

    const ssoToken = getSsoToken(req);
    if (!ssoToken) {
      return res.status(401).json({ success: false, message: 'SSO 令牌缺失' });
    }

    // 1. 智能意图识别（LLM 优先，规则回退）
    const { intent, entities, confidence, source } = await classifyIntentSmart(message, history);

    // 2. 根据意图执行查询，获取原始数据
    const queryResult = await executeQuery(intent, entities, ssoToken);

    // 3. 生成回复（LLM 自然语言 or 模板回退）
    let reply;
    let replySource = source;

    if (hasApiKey() && queryResult.rawData) {
      // 有 API Key 且有原始数据 → LLM 生成自然语言回复
      try {
        reply = await generateLLMResponse(message, intent, queryResult.rawData, history);
        replySource = 'llm';
      } catch (e) {
        console.error('[Chat] LLM 回复生成失败，回退模板:', e.message);
        reply = queryResult.formatted;
        replySource = 'template-fallback';
      }
    } else {
      // 无 API Key → 使用模板格式化
      reply = queryResult.formatted;
    }

    res.json({
      success: true,
      data: {
        intent,
        confidence,
        entities,
        source: replySource,
        reply,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[Chat Error]', err.message);
    res.json({
      success: true,
      data: {
        intent: 'ERROR',
        reply: `查询出错: ${err.message}\n\n请稍后重试，或尝试其他问题。`,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * GET /api/chat/suggestions
 */
router.get('/suggestions', (req, res) => {
  const suggestions = [
    { text: '查看库存', category: '库存' },
    { text: '低库存预警', category: '库存' },
    { text: '今天的销售订单', category: '订单' },
    { text: '采购订单列表', category: '采购' },
    { text: '有多少员工', category: '人员' },
    { text: '部门列表', category: '人员' },
    { text: '同步状态', category: '主数据' },
    { text: '帮我下一个订单', category: '订单助手' },
    { text: '销售分析', category: '分析' },
    { text: '库存预测', category: '预测' },
  ];
  res.json({ success: true, data: suggestions });
});

/**
 * GET /api/chat/intents
 */
router.get('/intents', (req, res) => {
  res.json({ success: true, data: getSupportedIntents() });
});

// ============================================================
// LLM 回复生成
// ============================================================

const RESPONSE_SYSTEM_PROMPT = `你是"鲜当家食用菌管理平台"的AI助手。

你的任务：根据系统查询返回的数据，用自然、友好的中文回答用户的问题。

## 回答要求

1. 语言简洁明了，像同事之间的对话
2. 重要数据用**粗体**标注
3. 如果数据为空，友好地告知用户
4. 如果数据有异常（如低库存），主动提醒
5. 可以适当给出建议，但不要编造数据中不存在的信息
6. 金额用 ¥ 符号，数字用千分位
7. 不要提及"系统返回""API""数据库"等技术词汇
8. 保持回复简短，不要啰嗦`;

/**
 * 用 DeepSeek 生成自然语言回复
 */
async function generateLLMResponse(userMessage, intent, rawData, history) {
  const contextMessage = `用户问题: "${userMessage}"
意图: ${intent}

系统查询结果（JSON）:
${JSON.stringify(rawData).substring(0, 4000)}

请根据以上数据，用自然语言回答用户的问题。`;

  const historyMessages = (history || []).slice(-6).map(h => ({
    role: h.role === 'assistant' ? 'assistant' : 'user',
    content: h.content,
  }));

  return await chat(RESPONSE_SYSTEM_PROMPT, contextMessage, {
    history: historyMessages,
    maxTokens: 800,
    temperature: 0.4,
  });
}

// ============================================================
// 查询执行器 — 同时返回原始数据和模板格式化结果
// ============================================================

/**
 * 根据意图执行查询
 * @returns {{ formatted: string, rawData: object|null }}
 */
async function executeQuery(intent, entities, ssoToken) {
  switch (intent) {
    // ========== 库存 ==========
    case 'INVENTORY_QUERY': {
      const keyword = entities.materialKeyword || '';
      const data = await scmApi(ssoToken, `/api/wms/inventory?keyword=${encodeURIComponent(keyword)}&pageSize=50`);
      return { formatted: formatter.formatInventory(data, entities), rawData: { type: 'inventory', data } };
    }

    case 'INVENTORY_LOW_STOCK': {
      const data = await scmApi(ssoToken, '/api/wms/inventory?pageSize=200');
      return { formatted: formatter.formatLowStock(data), rawData: { type: 'low_stock', data } };
    }

    // ========== 销售订单 ==========
    case 'SALES_ORDER_QUERY': {
      const data = await scmApi(ssoToken, '/api/sales/orders?pageSize=20');
      return { formatted: formatter.formatSalesOrders(data, entities), rawData: { type: 'sales_orders', data } };
    }

    case 'SALES_PLAN_QUERY': {
      const data = await scmApi(ssoToken, '/api/sales/plans?pageSize=20');
      return { formatted: formatter.formatSalesPlans(data), rawData: { type: 'sales_plans', data } };
    }

    // ========== 采购 ==========
    case 'PURCHASE_ORDER_QUERY': {
      const data = await scmApi(ssoToken, '/api/purchase/orders?pageSize=20');
      return { formatted: formatter.formatPurchaseOrders(data), rawData: { type: 'purchase_orders', data } };
    }

    case 'PURCHASE_PLAN_QUERY': {
      const data = await scmApi(ssoToken, '/api/purchase/plans?pageSize=20');
      return { formatted: formatter.formatPurchaseOrders(data), rawData: { type: 'purchase_plans', data } };
    }

    // ========== 人员 ==========
    case 'EMPLOYEE_QUERY': {
      const search = entities.departmentKeyword || '';
      const data = await hrmsApi(ssoToken, `/api/employees?search=${encodeURIComponent(search)}&pageSize=20`);
      const normalized = { list: data.data || data.list || [], total: data.total || 0 };
      return { formatted: formatter.formatEmployees(normalized), rawData: { type: 'employees', data: normalized } };
    }

    case 'DEPARTMENT_QUERY': {
      const data = await hrmsApi(ssoToken, '/api/departments');
      return { formatted: formatter.formatDepartments(data), rawData: { type: 'departments', data } };
    }

    // ========== 主数据 ==========
    case 'MDM_SYNC_STATUS': {
      const data = await mdmApi(ssoToken, '/api/dashboard');
      return { formatted: formatter.formatMdmSync(data), rawData: { type: 'mdm_sync', data } };
    }

    // ========== 订单助手 ==========
    case 'ORDER_ASSISTANT': {
      const msg = '🤖 订单助手已启动！\n\n请告诉我：\n1. 客户名称\n2. 商品名称和数量\n3. 期望交货日期\n\n例如："帮杭州鲜味食品有限公司下单 50公斤香菇，明天交货"';
      return { formatted: msg, rawData: null };
    }

    // ========== 数据分析 ==========
    case 'SALES_ANALYSIS': {
      const [orders, inventory] = await Promise.all([
        scmApi(ssoToken, '/api/sales/orders?pageSize=100'),
        scmApi(ssoToken, '/api/wms/inventory/stats'),
      ]);
      const analysis = buildSalesAnalysisData(orders, inventory);
      return { formatted: formatSalesAnalysis(orders, inventory), rawData: analysis };
    }

    case 'INVENTORY_ANALYSIS': {
      const data = await scmApi(ssoToken, '/api/wms/inventory/stats');
      return { formatted: formatter.formatInventoryStats(data), rawData: { type: 'inventory_stats', data } };
    }

    // ========== 预测 ==========
    case 'PREDICTION': {
      const data = await scmApi(ssoToken, '/api/wms/inventory?pageSize=100');
      const prediction = buildPredictionData(data);
      return { formatted: formatPrediction(data), rawData: prediction };
    }

    // ========== 帮助 ==========
    case 'HELP': {
      return { formatted: formatter.formatHelp(), rawData: null };
    }

    default:
      return { formatted: formatter.formatUnknown(entities.text || ''), rawData: null };
  }
}

/**
 * 构建销售分析数据（供 LLM 使用）
 */
function buildSalesAnalysisData(ordersData, inventoryData) {
  const orders = ordersData.list || [];
  const total = ordersData.total || 0;
  const totalAmount = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const statusCount = {};
  for (const o of orders) {
    statusCount[o.status] = (statusCount[o.status] || 0) + 1;
  }

  return {
    type: 'sales_analysis',
    data: {
      orderCount: total,
      totalAmount,
      avgOrderAmount: total > 0 ? Math.round(totalAmount / total) : 0,
      statusDistribution: statusCount,
      inventory: {
        totalSKUs: inventoryData.totalSKUs || 0,
        lowStock: inventoryData.lowStock || 0,
      },
    },
  };
}

/**
 * 构建预测数据（供 LLM 使用）
 */
function buildPredictionData(inventoryData) {
  const items = inventoryData.list || [];
  const lowStock = items.filter(i => (i.availableQty ?? i.qty) <= 10);
  const midStock = items.filter(i => {
    const avail = i.availableQty ?? i.qty;
    return avail > 10 && avail <= 50;
  });
  const healthy = items.filter(i => (i.availableQty ?? i.qty) > 50);

  return {
    type: 'prediction',
    data: {
      totalSKUs: items.length,
      urgent: lowStock.length,
      warning: midStock.length,
      healthy: healthy.length,
      urgentItems: lowStock.slice(0, 8).map(i => ({
        name: i.material?.name || '未知',
        available: i.availableQty ?? i.qty,
        unit: i.material?.unit || '',
      })),
      warningItems: midStock.slice(0, 5).map(i => ({
        name: i.material?.name || '未知',
        available: i.availableQty ?? i.qty,
        unit: i.material?.unit || '',
      })),
    },
  };
}

/**
 * 销售分析（模板格式化）
 */
function formatSalesAnalysis(ordersData, inventoryData) {
  const orders = ordersData.list || [];
  const total = ordersData.total || 0;
  const totalAmount = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const statusCount = {};
  for (const o of orders) {
    statusCount[o.status] = (statusCount[o.status] || 0) + 1;
  }

  const lines = [
    '📊 **销售数据分析**\n',
    `订单总数: ${total}`,
    `订单总金额: ¥${totalAmount.toLocaleString()}`,
    `平均订单金额: ¥${total > 0 ? Math.round(totalAmount / total).toLocaleString() : 0}`,
    '',
    '**订单状态分布:**',
  ];

  for (const [status, count] of Object.entries(statusCount)) {
    lines.push(`  ${status}: ${count} 单 (${Math.round(count / total * 100)}%)`);
  }

  lines.push(`\n**库存概览:**`);
  lines.push(`  SKU 总数: ${inventoryData.totalSKUs || 0}`);
  lines.push(`  低库存: ${inventoryData.lowStock || 0}`);

  return lines.join('\n');
}

/**
 * 简单库存预测（模板格式化）
 */
function formatPrediction(inventoryData) {
  const items = inventoryData.list || [];
  const lowStock = items.filter(i => (i.availableQty ?? i.qty) <= 10);
  const midStock = items.filter(i => {
    const avail = i.availableQty ?? i.qty;
    return avail > 10 && avail <= 50;
  });
  const healthy = items.filter(i => (i.availableQty ?? i.qty) > 50);

  const lines = [
    '🔮 **库存预测分析**\n',
    `基于当前 ${items.length} 个SKU的库存状态：\n`,
    `🔴 紧急补货（≤10）: ${lowStock.length} 个`,
    `🟡 需关注（11-50）: ${midStock.length} 个`,
    `🟢 库存充足（>50）: ${healthy.length} 个`,
  ];

  if (lowStock.length > 0) {
    lines.push('\n**建议立即补货的商品:**');
    for (const item of lowStock.slice(0, 8)) {
      lines.push(`  • ${item.material?.name || '未知'} — 当前可用: ${item.availableQty ?? item.qty} ${item.material?.unit || ''}`);
    }
  }

  if (midStock.length > 0) {
    lines.push('\n**建议近期补货的商品:**');
    for (const item of midStock.slice(0, 5)) {
      lines.push(`  • ${item.material?.name || '未知'} — 当前可用: ${item.availableQty ?? item.qty} ${item.material?.unit || ''}`);
    }
  }

  lines.push('\n💡 建议：结合销售订单趋势，对低库存商品优先安排采购。');

  return lines.join('\n');
}

export default router;
