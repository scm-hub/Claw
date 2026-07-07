/**
 * 前端单位换算工具函数（纯 JS 版本，不依赖 Prisma Decimal）
 * 
 * 核心原则：所有内部计算（库存 qty、成本价、出入库）统一用基准单位（最小单位）
 * 界面层按场景转换显示（采购场景显示采购单位，销售场景显示销售单位）
 * 
 * 前端只做显示层转换，不做业务逻辑计算（后端已完成所有业务逻辑转换）
 */

const DECIMAL_PRECISION = 4; // 换算结果保留4位小数

/**
 * 保留指定小数位数，避免浮点数精度问题
 * @param {number} value
 * @param {number} precision
 * @returns {number}
 */
function roundTo(value, precision = DECIMAL_PRECISION) {
  const factor = Math.pow(10, precision);
  return Math.round((value || 0) * factor) / factor;
}

/**
 * 将采购单位数量转换为基准单位数量
 * 例如：采购 2斤 → 基准 1000克（2 × 500 = 1000）
 *
 * @param {number} purchaseQty - 采购单位数量
 * @param {object} material - 物料对象（需含 purchaseConversionFactor 字段）
 * @returns {number} 基准单位数量
 */
export function purchaseQtyToBase(purchaseQty, material) {
  const factor = Number(material.purchaseConversionFactor || 1);
  return roundTo(Number(purchaseQty || 0) * factor);
}

/**
 * 将基准单位数量转换为采购单位数量
 * 例如：基准 1000克 → 采购 2斤（1000 / 500 = 2）
 *
 * @param {number} baseQty - 基准单位数量
 * @param {object} material - 物料对象（需含 purchaseConversionFactor 字段）
 * @returns {number} 采购单位数量
 */
export function baseQtyToPurchase(baseQty, material) {
  const factor = Number(material.purchaseConversionFactor || 1);
  return roundTo(Number(baseQty || 0) / factor);
}

/**
 * 将销售单位数量转换为基准单位数量
 * 例如：销售 10盒 → 基准 500克（10 × 50 = 500）
 *
 * @param {number} salesQty - 销售单位数量
 * @param {object} material - 物料对象（需含 salesConversionFactor 字段）
 * @returns {number} 基准单位数量
 */
export function salesQtyToBase(salesQty, material) {
  const factor = Number(material.salesConversionFactor || 1);
  return roundTo(Number(salesQty || 0) * factor);
}

/**
 * 将基准单位数量转换为销售单位数量
 * 例如：基准 500克 → 销售 10盒（500 / 50 = 10）
 *
 * @param {number} baseQty - 基准单位数量
 * @param {object} material - 物料对象（需含 salesConversionFactor 字段）
 * @returns {number} 销售单位数量
 */
export function baseQtyToSales(baseQty, material) {
  const factor = Number(material.salesConversionFactor || 1);
  return roundTo(Number(baseQty || 0) / factor);
}

/**
 * 将采购单价转换为基准单位单价
 * 例如：采购单价 15元/斤 → 基准单价 0.03元/克（15 / 500 = 0.03）
 *
 * @param {number} purchaseUnitPrice - 采购单位单价
 * @param {object} material - 物料对象
 * @returns {number} 基准单位单价
 */
export function purchaseUnitPriceToBase(purchaseUnitPrice, material) {
  const factor = Number(material.purchaseConversionFactor || 1);
  return roundTo(Number(purchaseUnitPrice || 0) / factor);
}

/**
 * 将基准单位单价转换为采购单位单价
 * 例如：基准单价 0.03元/克 → 采购单价 15元/斤（0.03 × 500 = 15）
 *
 * @param {number} baseUnitPrice - 基准单位单价
 * @param {object} material - 物料对象
 * @returns {number} 采购单位单价
 */
export function baseUnitPriceToPurchase(baseUnitPrice, material) {
  const factor = Number(material.purchaseConversionFactor || 1);
  return roundTo(Number(baseUnitPrice || 0) * factor);
}

/**
 * 将基准单位单价转换为销售单位单价
 * 例如：基准单价 10元/克 → 销售单价 500元/盒（10 × 50 = 500）
 *
 * @param {number} baseUnitPrice - 基准单位单价
 * @param {object} material - 物料对象
 * @returns {number} 销售单位单价
 */
export function baseUnitPriceToSales(baseUnitPrice, material) {
  const factor = Number(material.salesConversionFactor || 1);
  return roundTo(Number(baseUnitPrice || 0) * factor);
}

/**
 * 将销售单位单价转换为基准单位单价
 * 例如：销售单价 500元/盒 → 基准单价 10元/克（500 / 50 = 10）
 *
 * @param {number} salesUnitPrice - 销售单位单价
 * @param {object} material - 物料对象
 * @returns {number} 基准单位单价
 */
export function salesUnitPriceToBase(salesUnitPrice, material) {
  const factor = Number(material.salesConversionFactor || 1);
  return roundTo(Number(salesUnitPrice || 0) / factor);
}

/**
 * 获取显示单位名称（根据场景）
 * @param {object} material - 物料对象
 * @param {'purchase'|'sales'|'base'} scenario - 场景
 * @returns {string} 单位名称
 */
export function getDisplayUnit(material, scenario = 'base') {
  if (scenario === 'purchase') {
    return material.purchaseUnit || material.unit || '';
  }
  if (scenario === 'sales') {
    return material.salesUnit || material.unit || '';
  }
  return material.unit || '';
}

/**
 * 获取换算系数（根据场景）
 * @param {object} material - 物料对象
 * @param {'purchase'|'sales'} scenario - 场景
 * @returns {number} 换算系数（1个场景单位=?个基准单位）
 */
export function getConversionFactor(material, scenario) {
  if (scenario === 'purchase') {
    return Number(material.purchaseConversionFactor || 1);
  }
  if (scenario === 'sales') {
    return Number(material.salesConversionFactor || 1);
  }
  return 1;
}

/**
 * 判断物料是否需要单位换算（采购单位或销售单位与基准单位不同）
 * @param {object} material - 物料对象
 * @returns {boolean}
 */
export function needsConversion(material, scenario) {
  if (scenario === 'purchase') {
    const pf = Number(material.purchaseConversionFactor || 1);
    return pf !== 1;
  }
  if (scenario === 'sales') {
    const sf = Number(material.salesConversionFactor || 1);
    return sf !== 1;
  }
  const pf = Number(material.purchaseConversionFactor || 1);
  const sf = Number(material.salesConversionFactor || 1);
  return pf !== 1 || sf !== 1;
}

/**
 * 通用数量转换：场景单位 → 基准单位
 * @param {number} qty - 场景单位数量
 * @param {object} material - 物料对象
 * @param {'purchase'|'sales'} scenario - 场景
 * @returns {number} 基准单位数量
 */
export function toBaseQty(qty, material, scenario) {
  if (scenario === 'purchase') return purchaseQtyToBase(qty, material);
  if (scenario === 'sales') return salesQtyToBase(qty, material);
  return Number(qty || 0);
}

/**
 * 通用数量转换：基准单位 → 场景单位
 * @param {number} baseQty - 基准单位数量
 * @param {object} material - 物料对象
 * @param {'purchase'|'sales'} scenario - 场景
 * @returns {number} 场景单位数量
 */
export function fromBaseQty(baseQty, material, scenario) {
  if (scenario === 'purchase') return baseQtyToPurchase(baseQty, material);
  if (scenario === 'sales') return baseQtyToSales(baseQty, material);
  return Number(baseQty || 0);
}

/**
 * 通用单价转换：场景单价 → 基准单价
 * @param {number} unitPrice - 场景单位单价
 * @param {object} material - 物料对象
 * @param {'purchase'|'sales'} scenario - 场景
 * @returns {number} 基准单位单价
 */
export function unitPriceToBase(unitPrice, material, scenario) {
  if (scenario === 'purchase') return purchaseUnitPriceToBase(unitPrice, material);
  if (scenario === 'sales') return salesUnitPriceToBase(unitPrice, material);
  return Number(unitPrice || 0);
}

/**
 * 通用单价转换：基准单价 → 场景单价
 * @param {number} baseUnitPrice - 基准单位单价
 * @param {object} material - 物料对象
 * @param {'purchase'|'sales'} scenario - 场景
 * @returns {number} 场景单位单价
 */
export function unitPriceFromBase(baseUnitPrice, material, scenario) {
  if (scenario === 'purchase') return baseUnitPriceToPurchase(baseUnitPrice, material);
  if (scenario === 'sales') return baseUnitPriceToSales(baseUnitPrice, material);
  return Number(baseUnitPrice || 0);
}

/**
 * 格式化数量+单位（前端专用显示函数）
 * 将基准单位数量转换为场景单位数量并附上单位名称
 * 例如：formatQtyWithUnit(1000, {unit:'克', purchaseUnit:'斤', purchaseConversionFactor:500}, 'purchase')
 *       → "2 斤"
 * 
 * @param {number} baseQty - 基准单位数量
 * @param {object} material - 物料对象
 * @param {'purchase'|'sales'|'base'} scenario - 场景
 * @param {number} displayPrecision - 显示精度（默认2位小数）
 * @returns {string} 格式化后的数量+单位字符串
 */
export function formatQtyWithUnit(baseQty, material, scenario = 'base', displayPrecision = 2) {
  const displayQty = scenario === 'base'
    ? Number(baseQty || 0)
    : fromBaseQty(baseQty, material, scenario);
  const unit = getDisplayUnit(material, scenario);
  // 去掉不必要的尾零
  const formatted = displayQty.toFixed(displayPrecision).replace(/\.?0+$/, '');
  return `${formatted} ${unit}`;
}

/**
 * 格式化单价+单位（前端专用显示函数）
 * 将基准单位单价转换为场景单位单价并附上单位名称
 * 例如：formatUnitPriceWithUnit(0.03, {unit:'克', purchaseUnit:'斤', purchaseConversionFactor:500}, 'purchase')
 *       → "15 元/斤"
 *
 * @param {number} baseUnitPrice - 基准单位单价
 * @param {object} material - 物料对象
 * @param {'purchase'|'sales'|'base'} scenario - 场景
 * @param {number} displayPrecision - 显示精度（默认2位小数）
 * @returns {string} 格式化后的单价+单位字符串
 */
export function formatUnitPriceWithUnit(baseUnitPrice, material, scenario = 'base', displayPrecision = 2) {
  const displayPrice = scenario === 'base'
    ? Number(baseUnitPrice || 0)
    : unitPriceFromBase(baseUnitPrice, material, scenario);
  const unit = getDisplayUnit(material, scenario);
  const formatted = displayPrice.toFixed(displayPrecision).replace(/\.?0+$/, '');
  return `${formatted} 元/${unit}`;
}

/**
 * 获取换算描述文本（用于表格/弹窗提示）
 * 例如：getConversionDesc({unit:'克', purchaseUnit:'斤', purchaseConversionFactor:500}, 'purchase')
 *       → "1斤=500克"
 *
 * @param {object} material - 物料对象
 * @param {'purchase'|'sales'} scenario - 场景
 * @returns {string} 换算描述
 */
export function getConversionDesc(material, scenario) {
  if (scenario === 'purchase') {
    const factor = Number(material.purchaseConversionFactor || 1);
    if (factor === 1) return '';
    return `1${material.purchaseUnit || material.unit}=${factor}${material.unit}`;
  }
  if (scenario === 'sales') {
    const factor = Number(material.salesConversionFactor || 1);
    if (factor === 1) return '';
    return `1${material.salesUnit || material.unit}=${factor}${material.unit}`;
  }
  return '';
}
