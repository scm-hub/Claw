/**
 * DeepSeek API 客户端
 *
 * DeepSeek API 兼容 OpenAI 格式：
 *   Base URL: https://api.deepseek.com/v1
 *   Endpoint: /chat/completions
 *   Models: deepseek-chat (V3), deepseek-reasoner (R1)
 *
 * 支持 function calling（仅 deepseek-chat 模型）
 */

const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

/**
 * 检查是否配置了 API Key
 */
export function hasApiKey() {
  return !!DEEPSEEK_API_KEY;
}

/**
 * 调用 DeepSeek Chat Completion
 *
 * @param {Array} messages - 消息数组 [{role, content}]
 * @param {Object} options - 可选参数 { temperature, maxTokens, responseFormat, tools, toolChoice }
 * @returns {Object} API 响应
 */
export async function chatCompletion(messages, options = {}) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DeepSeek API Key 未配置');
  }

  const body = {
    model: options.model || DEEPSEEK_MODEL,
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens || 2000,
  };

  // JSON 输出模式
  if (options.responseFormat === 'json') {
    body.response_format = { type: 'json_object' };
  }

  // Function calling
  if (options.tools && options.tools.length > 0) {
    body.tools = options.tools;
    body.tool_choice = options.toolChoice || 'auto';
  }

  const resp = await fetch(`${DEEPSEEK_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    let errMsg = errText;
    try {
      const errJson = JSON.parse(errText);
      errMsg = errJson.error?.message || errText;
    } catch (_) {
      // keep raw text
    }
    throw new Error(`DeepSeek API 错误 (${resp.status}): ${errMsg}`);
  }

  const data = await resp.json();
  return data;
}

/**
 * 简单对话 — 返回纯文本回复
 *
 * @param {string} systemPrompt - 系统提示词
 * @param {string} userMessage - 用户消息
 * @param {Object} options - 可选参数
 * @returns {string} 回复文本
 */
export async function chat(systemPrompt, userMessage, options = {}) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  // 如果有对话历史，插入到 user 消息前面
  if (options.history && options.history.length > 0) {
    messages.splice(1, 0, ...options.history);
  }

  const resp = await chatCompletion(messages, options);
  return resp.choices[0]?.message?.content || '';
}

/**
 * JSON 对话 — 返回解析后的 JSON 对象
 *
 * @param {string} systemPrompt - 系统提示词
 * @param {string} userMessage - 用户消息
 * @param {Object} options - 可选参数
 * @returns {Object} 解析后的 JSON
 */
export async function chatJSON(systemPrompt, userMessage, options = {}) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  if (options.history && options.history.length > 0) {
    messages.splice(1, 0, ...options.history);
  }

  const resp = await chatCompletion(messages, {
    ...options,
    responseFormat: 'json',
  });

  const content = resp.choices[0]?.message?.content || '{}';
  try {
    return JSON.parse(content);
  } catch (e) {
    // 尝试从文本中提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error(`DeepSeek 返回的不是有效 JSON: ${content.substring(0, 200)}`);
  }
}

/**
 * 带上下文的对话 — 支持多轮对话
 *
 * @param {Array} messages - 完整的消息数组
 * @param {Object} options - 可选参数
 * @returns {string} 回复文本
 */
export async function chatWithMessages(messages, options = {}) {
  const resp = await chatCompletion(messages, options);
  return resp.choices[0]?.message?.content || '';
}

export { DEEPSEEK_API_URL, DEEPSEEK_API_KEY, DEEPSEEK_MODEL };
