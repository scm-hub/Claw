/**
 * 意图识别引擎
 *
 * 双模式：DeepSeek LLM 优先，规则引擎回退。
 * - classifyIntentSmart(): 先尝试 LLM，失败回退规则
 * - classifyIntent(): 纯规则匹配（回退用）
 * - classifyIntentWithLLM(): 纯 LLM 模式
 */

import { chatJSON, hasApiKey } from './deepseek-client.js';

// 意图定义
const INTENTS = {
  // 库存相关
  INVENTORY_QUERY: {
    keywords: ['库存', '存货', 'stock', 'inventory', '仓库存货', '还剩多少', '存量'],
    description: '查询库存信息',
  },
  INVENTORY_LOW_STOCK: {
    keywords: ['低库存', '库存不足', '缺货', '预警', '告警', 'low stock', '安全库存'],
    description: '查询低库存预警',
  },

  // 销售订单相关
  SALES_ORDER_QUERY: {
    keywords: ['销售订单', '订单', '下单', 'sales order', '今日订单', '最近订单', '订单列表'],
    description: '查询销售订单',
  },
  SALES_PLAN_QUERY: {
    keywords: ['销售计划', '计划', '需求汇总', 'demand', '计划列表'],
    description: '查询销售计划/需求汇总',
  },

  // 采购相关
  PURCHASE_ORDER_QUERY: {
    keywords: ['采购订单', '采购单', 'purchase order', '进货单'],
    description: '查询采购订单',
  },
  PURCHASE_PLAN_QUERY: {
    keywords: ['采购计划', '采购建议', '补货建议', '采购需求'],
    description: '查询采购计划',
  },

  // 人员相关
  EMPLOYEE_QUERY: {
    keywords: ['员工', '人员', '人数', '有多少人', 'employee', '职工', '同事'],
    description: '查询员工信息',
  },
  DEPARTMENT_QUERY: {
    keywords: ['部门', '科室', '组织架构', 'department', '团队'],
    description: '查询部门信息',
  },

  // 主数据相关
  MDM_SYNC_STATUS: {
    keywords: ['同步', '同步状态', '主数据', 'sync', '数据同步', '映射'],
    description: '查询主数据同步状态',
  },

  // 订单助手
  ORDER_ASSISTANT: {
    keywords: ['帮我下单', '创建订单', '新建订单', '下个单', '帮我创建', '帮我下一个', '下单给', '帮下单'],
    description: '订单助手 - 辅助创建订单',
  },

  // 数据分析
  SALES_ANALYSIS: {
    keywords: ['销售分析', '销售趋势', '销售统计', '业绩分析', '销售报表'],
    description: '销售数据分析',
  },
  INVENTORY_ANALYSIS: {
    keywords: ['库存分析', '库存统计', '库存趋势', '库存报表', '库存分布'],
    description: '库存数据分析',
  },

  // 预测
  PREDICTION: {
    keywords: ['预测', '预估', 'forecast', '未来', '趋势预测', '库存预测', '销售预测'],
    description: '数据预测',
  },

  // 帮助
  HELP: {
    keywords: ['帮助', 'help', '能做什么', '功能', '怎么用', '你好', 'hello', 'hi'],
    description: '显示帮助信息',
  },
};

/**
 * 意图识别
 * @param {string} text 用户输入
 * @returns {{ intent: string, entities: object, confidence: number }}
 */
export function classifyIntent(text) {
  const lower = text.toLowerCase().trim();

  let bestMatch = { intent: 'UNKNOWN', confidence: 0, entities: {} };

  for (const [intent, config] of Object.entries(INTENTS)) {
    for (const keyword of config.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        // 关键词越长，置信度越高
        const confidence = Math.min(keyword.length / 10 + 0.5, 0.95);
        if (confidence > bestMatch.confidence) {
          bestMatch = { intent, confidence, entities: extractEntities(text, intent) };
        }
      }
    }
  }

  return bestMatch;
}

/**
 * 实体提取
 * 从用户输入中提取关键实体（如商品名、客户名、数量等）
 */
function extractEntities(text, intent) {
  const entities = {};

  // 提取数量
  const qtyMatch = text.match(/(\d+)\s*(个|件|箱|公斤|kg|斤|吨|份|批)/i);
  if (qtyMatch) {
    entities.quantity = parseInt(qtyMatch[1]);
    entities.unit = qtyMatch[2];
  }

  // 提取数字
  const numMatch = text.match(/(\d+)/);
  if (numMatch) {
    entities.number = parseInt(numMatch[1]);
  }

  // 提取商品/物料关键词（"XX的库存"、"XX商品"）
  const materialMatch = text.match(/[查查看]?(.+?)(的)?(库存|存货|stock)/);
  if (materialMatch && materialMatch[1] && materialMatch[1].length > 1) {
    entities.materialKeyword = materialMatch[1].trim();
  }

  // 提取客户名（"XX客户的订单"）
  const customerMatch = text.match(/(.+?)(客户|公司|的订单)/);
  if (customerMatch && customerMatch[1] && customerMatch[1].length > 1) {
    entities.customerKeyword = customerMatch[1].trim();
  }

  // 提取部门名（"XX部门的员工"）
  const deptMatch = text.match(/(.+?)(部门|科室)的?(员工|人员|人数)/);
  if (deptMatch && deptMatch[1] && deptMatch[1].length > 1) {
    entities.departmentKeyword = deptMatch[1].trim();
  }

  // 提取时间范围
  if (text.includes('今天') || text.includes('今日') || text.includes('today')) {
    entities.timeRange = 'today';
  } else if (text.includes('昨天') || text.includes('昨日')) {
    entities.timeRange = 'yesterday';
  } else if (text.includes('本周') || text.includes('这周')) {
    entities.timeRange = 'week';
  } else if (text.includes('本月') || text.includes('这个月')) {
    entities.timeRange = 'month';
  }

  return entities;
}

/**
 * 获取所有支持的意图列表
 */
export function getSupportedIntents() {
  return Object.entries(INTENTS).map(([key, config]) => ({
    intent: key,
    description: config.description,
    keywords: config.keywords.slice(0, 3),
  }));
}

// ============================================================
// DeepSeek LLM 意图识别
// ============================================================

const LLM_SYSTEM_PROMPT = `你是"鲜当家食用菌管理平台"的AI助手意图识别模块。

你的任务：分析用户输入，识别意图并提取关键实体。

## 支持的意图

| 意图 | 说明 |
|------|------|
| INVENTORY_QUERY | 查询库存信息 |
| INVENTORY_LOW_STOCK | 低库存预警/缺货 |
| SALES_ORDER_QUERY | 查询销售订单 |
| SALES_PLAN_QUERY | 查询销售计划/需求汇总 |
| PURCHASE_ORDER_QUERY | 查询采购订单 |
| PURCHASE_PLAN_QUERY | 查询采购计划/补货建议 |
| EMPLOYEE_QUERY | 查询员工信息 |
| DEPARTMENT_QUERY | 查询部门信息 |
| MDM_SYNC_STATUS | 查询主数据同步状态 |
| ORDER_ASSISTANT | 用户想要创建/下订单 |
| SALES_ANALYSIS | 销售数据分析/统计/报表 |
| INVENTORY_ANALYSIS | 库存数据分析/统计 |
| PREDICTION | 预测/预估/未来趋势 |
| HELP | 帮助/问候/能做什么 |

## 实体提取规则

- materialKeyword: 商品名称（如"香菇""杏鲍菇""木耳"）
- customerKeyword: 客户名称或关键词
- departmentKeyword: 部门名称
- quantity: 数量（数字）
- unit: 单位（公斤/箱/件/袋等）
- timeRange: 时间范围（today/yesterday/week/month/last_week/last_month）
- deliveryDate: 交货日期（YYYY-MM-DD）
- text: 用户原始输入

## 输出格式

返回 JSON：
{
  "intent": "意图名称",
  "confidence": 0.0-1.0,
  "entities": {
    "materialKeyword": "",
    "customerKeyword": "",
    "departmentKeyword": "",
    "quantity": null,
    "unit": "",
    "timeRange": "",
    "deliveryDate": "",
    "text": "用户原始输入"
  }
}

## 注意

- 只有用户明确想"下单""创建订单""买"时才用 ORDER_ASSISTANT
- 查询订单用 SALES_ORDER_QUERY，不是 ORDER_ASSISTANT
- 如果无法匹配任何意图，返回 "UNKNOWN"
- confidence 低于 0.5 时也返回 "UNKNOWN"
- 必须返回纯 JSON，不要有其他文字`;

/**
 * 使用 DeepSeek 进行意图识别
 * @param {string} text 用户输入
 * @param {Array} history 对话历史（可选）
 * @returns {{ intent: string, entities: object, confidence: number, source: 'llm' }}
 */
export async function classifyIntentWithLLM(text, history) {
  const historyMessages = (history || []).slice(-6).map(h => ({
    role: h.role || 'user',
    content: h.content,
  }));

  const result = await chatJSON(
    LLM_SYSTEM_PROMPT,
    `用户输入: "${text}"`,
    { history: historyMessages, maxTokens: 500, temperature: 0.1 }
  );

  return {
    intent: result.intent || 'UNKNOWN',
    entities: { ...result.entities, text },
    confidence: result.confidence || 0.8,
    source: 'llm',
  };
}

/**
 * 智能意图识别 — LLM 优先，规则回退
 * @param {string} text 用户输入
 * @param {Array} history 对话历史（可选）
 * @returns {{ intent: string, entities: object, confidence: number, source: string }}
 */
export async function classifyIntentSmart(text, history) {
  // 如果配置了 API Key，优先用 LLM
  if (hasApiKey()) {
    try {
      const llmResult = await classifyIntentWithLLM(text, history);
      if (llmResult.intent !== 'UNKNOWN' && llmResult.confidence >= 0.5) {
        return llmResult;
      }
      // LLM 返回 UNKNOWN 或低置信度，尝试规则补充
      const ruleResult = classifyIntent(text);
      if (ruleResult.intent !== 'UNKNOWN') {
        return { ...ruleResult, source: 'rule-fallback' };
      }
      return llmResult;
    } catch (e) {
      console.error('[IntentEngine] LLM 识别失败，回退规则:', e.message);
      return { ...classifyIntent(text), source: 'rule-error' };
    }
  }

  // 无 API Key，纯规则
  return { ...classifyIntent(text), source: 'rule' };
}

export { INTENTS };
