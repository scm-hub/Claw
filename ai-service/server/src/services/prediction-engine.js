/**
 * 预测引擎
 *
 * 基于历史数据的简单预测算法。
 * 后续可接入 ML 模型或 LLM 进行更精准的预测。
 */

/**
 * 简单移动平均预测
 * @param {number[]} history 历史数据
 * @param {number} window 窗口大小
 * @returns {number} 预测值
 */
export function movingAverage(history, window = 3) {
  if (!history || history.length === 0) return 0;
  const data = history.slice(-window);
  return data.reduce((sum, v) => sum + v, 0) / data.length;
}

/**
 * 线性趋势预测
 * 基于最小二乘法
 * @param {number[]} history 历史数据
 * @param {number} periods 预测期数
 * @returns {{ values: number[], slope: number, intercept: number }}
 */
export function linearTrend(history, periods = 3) {
  if (!history || history.length < 2) {
    return { values: Array(periods).fill(history?.[0] || 0), slope: 0, intercept: history?.[0] || 0 };
  }

  const n = history.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = history;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const values = [];
  for (let i = 0; i < periods; i++) {
    values.push(Math.max(0, Math.round(intercept + slope * (n + i))));
  }

  return { values, slope, intercept };
}

/**
 * 库存消耗预测
 * 基于当前库存和预估日消耗量，预测库存耗尽时间
 * @param {number} currentQty 当前库存
 * @param {number} avgDailyConsumption 日均消耗量
 * @returns {{ daysLeft: number, status: string, suggestion: string }}
 */
export function predictStockout(currentQty, avgDailyConsumption) {
  if (avgDailyConsumption <= 0) {
    return { daysLeft: Infinity, status: 'stable', suggestion: '消耗量低，库存稳定' };
  }

  const daysLeft = Math.floor(currentQty / avgDailyConsumption);

  let status, suggestion;
  if (daysLeft <= 3) {
    status = 'critical';
    suggestion = '库存即将耗尽，建议立即补货！';
  } else if (daysLeft <= 7) {
    status = 'warning';
    suggestion = '库存将在一周内耗尽，建议尽快补货';
  } else if (daysLeft <= 14) {
    status = 'caution';
    suggestion = '库存可维持两周，建议关注消耗趋势';
  } else {
    status = 'healthy';
    suggestion = '库存充足';
  }

  return { daysLeft, status, suggestion };
}

/**
 * 销售趋势分析
 * @param {Array} orders 订单列表
 * @returns {{ trend: string, growthRate: number, dailyAvg: number, prediction: number[] }}
 */
export function analyzeSalesTrend(orders) {
  if (!orders || orders.length === 0) {
    return { trend: 'no-data', growthRate: 0, dailyAvg: 0, prediction: [0, 0, 0] };
  }

  // 按日期分组
  const byDate = {};
  for (const order of orders) {
    const date = (order.orderDate || order.createdAt || '').slice(0, 10);
    if (date) {
      byDate[date] = (byDate[date] || 0) + Number(order.totalAmount || 0);
    }
  }

  const dates = Object.keys(byDate).sort();
  const values = dates.map(d => byDate[d]);

  // 线性趋势预测
  const { values: prediction, slope } = linearTrend(values, 3);

  // 增长率
  const recent = values.slice(-3);
  const earlier = values.slice(-6, -3);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / (recent.length || 1);
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / (earlier.length || 1);
  const growthRate = earlierAvg > 0 ? ((recentAvg - earlierAvg) / earlierAvg) * 100 : 0;

  const dailyAvg = values.reduce((a, b) => a + b, 0) / (values.length || 1);

  let trend;
  if (slope > 0.05) trend = 'rising';
  else if (slope < -0.05) trend = 'declining';
  else trend = 'stable';

  return {
    trend,
    growthRate: Math.round(growthRate * 10) / 10,
    dailyAvg: Math.round(dailyAvg),
    prediction: prediction.map(v => Math.round(v)),
    dates,
    values,
  };
}

/**
 * 生成库存补货建议
 * @param {Array} inventoryItems 库存列表
 * @returns {Array} 补货建议列表
 */
export function generateReorderSuggestions(inventoryItems) {
  const suggestions = [];

  for (const item of inventoryItems) {
    const available = item.availableQty ?? (item.qty - (item.lockedQty || 0));
    const material = item.material || {};

    // 简单规则：可用量 <= 10 紧急，<= 30 建议
    if (available <= 10) {
      suggestions.push({
        materialId: material.id,
        materialName: material.name,
        materialCode: material.code,
        unit: material.unit,
        currentQty: item.qty,
        availableQty: available,
        warehouse: item.warehouse?.name || '-',
        priority: 'urgent',
        suggestedQty: Math.max(50, available * 5),
        reason: `库存严重不足（可用 ${available}），建议立即补货 ${Math.max(50, available * 5)} ${material.unit || ''}`,
      });
    } else if (available <= 30) {
      suggestions.push({
        materialId: material.id,
        materialName: material.name,
        materialCode: material.code,
        unit: material.unit,
        currentQty: item.qty,
        availableQty: available,
        warehouse: item.warehouse?.name || '-',
        priority: 'recommended',
        suggestedQty: Math.max(30, available * 3),
        reason: `库存偏低（可用 ${available}），建议补货 ${Math.max(30, available * 3)} ${material.unit || ''}`,
      });
    }
  }

  // 按优先级排序
  suggestions.sort((a, b) => a.availableQty - b.availableQty);
  return suggestions;
}
