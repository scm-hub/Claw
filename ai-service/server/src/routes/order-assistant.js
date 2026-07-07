import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { scmApi, getSsoToken } from '../services/api-clients.js';
import { chatJSON, hasApiKey } from '../services/deepseek-client.js';

const router = Router();
router.use(authenticate);

const ORDER_PARSE_SYSTEM_PROMPT = `你是"鲜当家食用菌管理平台"的订单解析助手。

你的任务：从用户的自然语言描述中提取订单信息。

## 你需要提取的字段

1. **customerKeyword**: 客户名称或关键词
   - "帮上海餐饮连锁下单" → "上海餐饮连锁"
   - "给杭州鲜味发点货" → "杭州鲜味"
   - "老客户的那个单子" → ""（无法确定具体客户）

2. **items**: 商品列表，每项包含：
   - name: 商品名称（香菇、杏鲍菇、木耳干品等）
   - quantity: 数量（数字）
   - unit: 单位（公斤/箱/件/袋等）
   - 如果用户说"各来点""差不多就行"，quantity 设为 null，notes 中注明

3. **deliveryDate**: 交货日期（YYYY-MM-DD格式）
   - "明天" → 明天的日期
   - "后天" → 后天的日期
   - "下周一" → 估算日期
   - "今天" → 今天的日期
   - 未提到 → ""

4. **notes**: 其他备注信息

## 输出格式（JSON）

{
  "customerKeyword": "",
  "items": [
    { "name": "香菇", "quantity": 50, "unit": "公斤" }
  ],
  "deliveryDate": "",
  "notes": ""
}

## 注意

- 只返回 JSON，不要有其他文字
- 日期请用今天作为基准计算（今天是 ${new Date().toISOString().slice(0, 10)}）
- 如果用户提到多个商品，每个商品一个 item
- 如果没有数量信息，quantity 设为 null
- 理解口语化表达："来点""搞一批""老规矩"等都可能是下单意图`;

/**
 * POST /api/order-assistant/parse
 * 解析自然语言订单请求，返回预填的订单数据
 * body: { message: "帮杭州鲜味下单50公斤香菇明天交货" }
 */
router.post('/parse', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: '请输入订单描述' });
    }

    const ssoToken = getSsoToken(req);

    // 1. 解析订单信息（LLM 优先，规则回退）
    let parsed;
    if (hasApiKey()) {
      try {
        parsed = await parseOrderWithLLM(message);
      } catch (e) {
        console.error('[OrderAssistant] LLM 解析失败，回退规则:', e.message);
        parsed = parseOrderMessage(message);
      }
    } else {
      parsed = parseOrderMessage(message);
    }

    // 2. 从 SCM 查找匹配的客户
    let matchedCustomer = null;
    if (parsed.customerKeyword) {
      try {
        const customersData = await scmApi(ssoToken, '/api/master/customers?keyword=' + encodeURIComponent(parsed.customerKeyword));
        const customers = customersData?.list || customersData || [];
        if (Array.isArray(customers) && customers.length > 0) {
          matchedCustomer = customers[0];
        }
      } catch (e) {
        console.log('[OrderAssistant] 客户查询失败:', e.message);
      }
    }

    // 3. 从 SCM 查找匹配的物料（可能多个）
    let allMatchedMaterials = [];
    const materialKeywords = parsed.items?.map(i => i.name).filter(Boolean) || [parsed.materialKeyword];

    for (const keyword of materialKeywords) {
      if (!keyword) continue;
      try {
        const materialsData = await scmApi(ssoToken, '/api/master/materials?keyword=' + encodeURIComponent(keyword));
        const materials = materialsData?.list || materialsData || [];
        if (Array.isArray(materials)) {
          // 将解析的数量关联到匹配的物料
          const parsedItem = parsed.items?.find(i => i.name === keyword);
          for (const m of materials.slice(0, 3)) {
            allMatchedMaterials.push({
              materialId: m.id,
              materialName: m.name,
              materialCode: m.code,
              unit: m.unit,
              qty: parsedItem?.quantity || parsed.quantity || 0,
              price: m.defaultPrice || m.price || 0,
              amount: (parsedItem?.quantity || parsed.quantity || 0) * (m.defaultPrice || m.price || 0),
            });
          }
        }
      } catch (e) {
        console.log('[OrderAssistant] 物料查询失败:', e.message);
      }
    }

    // 如果 LLM 没有返回 items 但规则引擎有 materialKeyword
    if (allMatchedMaterials.length === 0 && parsed.materialKeyword) {
      try {
        const materialsData = await scmApi(ssoToken, '/api/master/materials?keyword=' + encodeURIComponent(parsed.materialKeyword));
        const materials = materialsData?.list || materialsData || [];
        allMatchedMaterials = materials.slice(0, 3).map(m => ({
          materialId: m.id,
          materialName: m.name,
          materialCode: m.code,
          unit: m.unit,
          qty: parsed.quantity || 0,
          price: m.defaultPrice || m.price || 0,
          amount: (parsed.quantity || 0) * (m.defaultPrice || m.price || 0),
        }));
      } catch (e) {
        console.log('[OrderAssistant] 物料查询失败:', e.message);
      }
    }

    // 4. 构建预填订单
    const prefill = {
      customer: matchedCustomer ? {
        id: matchedCustomer.id,
        name: matchedCustomer.name,
        code: matchedCustomer.code,
      } : null,
      customerKeyword: parsed.customerKeyword || parsed.customerKeyword || '',
      items: allMatchedMaterials,
      materialKeyword: parsed.materialKeyword || materialKeywords[0] || '',
      quantity: parsed.quantity,
      unit: parsed.unit,
      deliveryDate: parsed.deliveryDate,
      notes: parsed.notes || '',
      rawMessage: message,
    };

    // 5. 生成确认消息
    let confirmMessage = '🤖 **订单助手解析结果**\n\n';
    confirmMessage += `**客户:** ${matchedCustomer ? matchedCustomer.name : `未匹配到「${parsed.customerKeyword || '未知'}」，请手动选择`}\n`;
    confirmMessage += `**商品:** ${allMatchedMaterials.length > 0 ? allMatchedMaterials.map(m => `${m.materialName} ×${m.qty || '?'}${m.unit || ''}`).join(', ') : parsed.materialKeyword || '未识别'}\n`;
    confirmMessage += `**数量:** ${parsed.quantity || '未指定'} ${parsed.unit || ''}\n`;
    confirmMessage += `**交货日期:** ${parsed.deliveryDate || '未指定'}\n`;
    if (parsed.notes) {
      confirmMessage += `**备注:** ${parsed.notes}\n`;
    }

    if (matchedCustomer && allMatchedMaterials.length > 0) {
      confirmMessage += '\n✅ 已识别关键信息，请确认后创建订单。';
    } else {
      confirmMessage += '\n⚠️ 部分信息未识别，请手动补充后创建订单。';
    }

    res.json({
      success: true,
      data: {
        prefill,
        confirmMessage,
        needsConfirmation: true,
        parseSource: hasApiKey() ? 'llm' : 'rule',
      },
    });
  } catch (err) {
    console.error('[OrderAssistant Parse Error]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/order-assistant/create
 * 确认后创建销售订单
 * body: { orderData: {...} }
 */
router.post('/create', async (req, res) => {
  try {
    const { orderData } = req.body;
    if (!orderData) {
      return res.status(400).json({ success: false, message: '缺少订单数据' });
    }

    const ssoToken = getSsoToken(req);

    // 调用 SCM API 创建销售订单
    const result = await scmApi(ssoToken, '/api/sales/orders', 'POST', orderData);

    res.json({
      success: true,
      data: result,
      message: `✅ 订单创建成功！订单号: ${result.orderNo || result.id}`,
    });
  } catch (err) {
    console.error('[OrderAssistant Create Error]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/order-assistant/customers
 */
router.get('/customers', async (req, res) => {
  try {
    const { keyword } = req.query;
    const ssoToken = getSsoToken(req);
    const data = await scmApi(ssoToken, '/api/master/customers?keyword=' + encodeURIComponent(keyword || ''));
    res.json({ success: true, data: data?.list || data || [] });
  } catch (err) {
    res.json({ success: true, data: [] });
  }
});

/**
 * GET /api/order-assistant/materials
 */
router.get('/materials', async (req, res) => {
  try {
    const { keyword } = req.query;
    const ssoToken = getSsoToken(req);
    const data = await scmApi(ssoToken, '/api/master/materials?keyword=' + encodeURIComponent(keyword || ''));
    res.json({ success: true, data: data?.list || data || [] });
  } catch (err) {
    res.json({ success: true, data: [] });
  }
});

// ============================================================
// LLM 订单解析
// ============================================================

/**
 * 使用 DeepSeek 解析订单消息
 */
async function parseOrderWithLLM(text) {
  const result = await chatJSON(
    ORDER_PARSE_SYSTEM_PROMPT,
    `用户输入: "${text}"`,
    { maxTokens: 500, temperature: 0.1 }
  );

  // 兼容 LLM 和规则引擎的输出格式
  const items = result.items || [];
  const firstItem = items[0] || {};

  return {
    customerKeyword: result.customerKeyword || '',
    materialKeyword: firstItem.name || '',
    items: items,
    quantity: firstItem.quantity || null,
    unit: firstItem.unit || '',
    deliveryDate: result.deliveryDate || '',
    notes: result.notes || '',
  };
}

// ============================================================
// 规则引擎订单解析（回退用）
// ============================================================

/**
 * 解析自然语言订单消息（规则引擎）
 */
function parseOrderMessage(text) {
  const result = {
    customerKeyword: '',
    materialKeyword: '',
    items: [],
    quantity: null,
    unit: '',
    deliveryDate: '',
    notes: '',
  };

  // 提取数量和单位
  const qtyMatch = text.match(/(\d+)\s*(公斤|kg|斤|箱|件|个|份|吨|包|袋)/i);
  if (qtyMatch) {
    result.quantity = parseInt(qtyMatch[1]);
    result.unit = qtyMatch[2];
  }

  // 提取客户名
  const customerPatterns = [
    /帮(.+?)[下创建]/,
    /给(.+?)[下创建]/,
    /(.+?)下单/,
    /(.+?)的订单/,
  ];
  for (const pattern of customerPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].length >= 2 && match[1].length <= 20) {
      let name = match[1].trim();
      if (!name.match(/^\d/) && !name.includes('公斤') && !name.includes('箱')) {
        result.customerKeyword = name;
        break;
      }
    }
  }

  // 提取物料名
  const mushroomKeywords = ['香菇', '平菇', '金针菇', '杏鲍菇', '黑木耳', '银耳', '茶树菇', '猴头菇', '白玉菇', '蟹味菇', '海鲜菇', '双孢菇', '草菇', '松茸', '羊肚菌', '虫草花', '鹿茸菇', '秀珍菇', '毛木耳', '竹荪', '木耳干品', '木耳'];
  for (const mushroom of mushroomKeywords) {
    if (text.includes(mushroom)) {
      result.materialKeyword = mushroom;
      result.items = [{ name: mushroom, quantity: result.quantity, unit: result.unit }];
      break;
    }
  }

  if (!result.materialKeyword) {
    const materialMatch = text.match(/(\d+\s*(?:公斤|kg|斤|箱|件|个|份|吨|包|袋))\s*(.+?)(?:，|,|明天|今天|后天|交货|$)/);
    if (materialMatch && materialMatch[2] && materialMatch[2].length >= 2) {
      result.materialKeyword = materialMatch[2].trim();
      result.items = [{ name: result.materialKeyword, quantity: result.quantity, unit: result.unit }];
    }
  }

  // 提取交货日期
  if (text.includes('明天') || text.includes('tomorrow')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    result.deliveryDate = tomorrow.toISOString().slice(0, 10);
  } else if (text.includes('后天')) {
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    result.deliveryDate = dayAfter.toISOString().slice(0, 10);
  } else if (text.includes('今天') || text.includes('today')) {
    result.deliveryDate = new Date().toISOString().slice(0, 10);
  } else {
    const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      result.deliveryDate = dateMatch[1];
    }
  }

  return result;
}

export default router;
