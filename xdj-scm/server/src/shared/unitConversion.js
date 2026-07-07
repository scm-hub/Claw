/**
 * 单位换算工具函数
 * 核心原则：所有内部计算（库存 qty、成本价、出入库）统一用基准单位（最小单位）
 * 界面层按场景转换显示（采购场景显示采购单位，销售场景显示销售单位）
 */

import { Decimal } from '@prisma/client/runtime/library';

/**
 * 将采购单位数量转换为基准单位数量
 * 例如：采购 2斤 → 基准 1000克（2 × 500 = 1000）
 *
 * @param {number|Decimal} purchaseQty - 采购单位数量
 * @param {object} material - 物料对象（需含 purchaseConversionFactor 字段）
 * @returns {Decimal} 基准单位数量
 */
function purchaseQtyToBase(purchaseQty, material) {
  const factor = material.purchaseConversionFactor || 1;
  const qty = new Decimal(purchaseQty || 0);
  return qty.mul(new Decimal(factor));
}

/**
 * 将基准单位数量转换为采购单位数量
 * 例如：基准 1000克 → 采购 2斤（1000 / 500 = 2）
 *
 * @param {number|Decimal} baseQty - 基准单位数量
 * @param {object} material - 物料对象（需含 purchaseConversionFactor 字段）
 * @returns {Decimal} 采购单位数量
 */
function baseQtyToPurchase(baseQty, material) {
  const factor = material.purchaseConversionFactor || 1;
  const qty = new Decimal(baseQty || 0);
  return qty.div(new Decimal(factor));
}

/**
 * 将销售单位数量转换为基准单位数量
 * 例如：销售 200克 → 基准 200克（200 × 1 = 200，系数为1时无变化）
 * 例如：销售 10盒 → 基准 500克（10 × 50 = 500）
 *
 * @param {number|Decimal} salesQty - 销售单位数量
 * @param {object} material - 物料对象（需含 salesConversionFactor 字段）
 * @returns {Decimal} 基准单位数量
 */
function salesQtyToBase(salesQty, material) {
  const factor = material.salesConversionFactor || 1;
  const qty = new Decimal(salesQty || 0);
  return qty.mul(new Decimal(factor));
}

/**
 * 将基准单位数量转换为销售单位数量
 * 例如：基准 200克 → 销售 200克（200 / 1 = 200）
 * 例如：基准 500克 → 销售 10盒（500 / 50 = 10）
 *
 * @param {number|Decimal} baseQty - 基准单位数量
 * @param {object} material - 物料对象（需含 salesConversionFactor 字段）
 * @returns {Decimal} 销售单位数量
 */
function baseQtyToSales(baseQty, material) {
  const factor = material.salesConversionFactor || 1;
  const qty = new Decimal(baseQty || 0);
  return qty.div(new Decimal(factor));
}

/**
 * 将采购单价转换为基准单位单价
 * 例如：采购单价 15元/斤 → 基准单价 0.03元/克（15 / 500 = 0.03）
 *
 * @param {number|Decimal} purchaseUnitPrice - 采购单位单价
 * @param {object} material - 物料对象
 * @returns {Decimal} 基准单位单价
 */
function purchaseUnitPriceToBase(purchaseUnitPrice, material) {
  const factor = material.purchaseConversionFactor || 1;
  const price = new Decimal(purchaseUnitPrice || 0);
  return price.div(new Decimal(factor));
}

/**
 * 将基准单位单价转换为采购单位单价
 * 例如：基准单价 0.03元/克 → 采购单价 15元/斤（0.03 × 500 = 15）
 *
 * @param {number|Decimal} baseUnitPrice - 基准单位单价
 * @param {object} material - 物料对象
 * @returns {Decimal} 采购单位单价
 */
function baseUnitPriceToPurchase(baseUnitPrice, material) {
  const factor = material.purchaseConversionFactor || 1;
  const price = new Decimal(baseUnitPrice || 0);
  return price.mul(new Decimal(factor));
}

/**
 * 将基准单位单价转换为销售单位单价
 * 例如：基准单价 0.03元/克 → 销售单价 0.03元/克（系数1，无变化）
 * 例如：基准单价 10元/克 → 销售单价 500元/盒（10 × 50 = 500）
 *
 * @param {number|Decimal} baseUnitPrice - 基准单位单价
 * @param {object} material - 物料对象
 * @returns {Decimal} 销售单位单价
 */
function baseUnitPriceToSales(baseUnitPrice, material) {
  const factor = material.salesConversionFactor || 1;
  const price = new Decimal(baseUnitPrice || 0);
  return price.mul(new Decimal(factor));
}

/**
 * 将销售单位单价转换为基准单位单价
 * 例如：销售单价 500元/盒 → 基准单价 10元/克（500 / 50 = 10）
 *
 * @param {number|Decimal} salesUnitPrice - 销售单位单价
 * @param {object} material - 物料对象
 * @returns {Decimal} 基准单位单价
 */
function salesUnitPriceToBase(salesUnitPrice, material) {
  const factor = material.salesConversionFactor || 1;
  const price = new Decimal(salesUnitPrice || 0);
  return price.div(new Decimal(factor));
}

/**
 * 获取显示单位名称（根据场景）
 * @param {object} material - 物料对象
 * @param {'purchase'|'sales'|'base'} scenario - 场景
 * @returns {string} 单位名称
 */
function getDisplayUnit(material, scenario = 'base') {
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
function getConversionFactor(material, scenario) {
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
function needsConversion(material) {
  const pf = Number(material.purchaseConversionFactor || 1);
  const sf = Number(material.salesConversionFactor || 1);
  return pf !== 1 || sf !== 1;
}

/**
 * 通用数量转换：场景单位 → 基准单位
 * @param {number|Decimal} qty - 场景单位数量
 * @param {object} material - 物料对象
 * @param {'purchase'|'sales'} scenario - 场景
 * @returns {Decimal} 基准单位数量
 */
function toBaseQty(qty, material, scenario) {
  if (scenario === 'purchase') return purchaseQtyToBase(qty, material);
  if (scenario === 'sales') return salesQtyToBase(qty, material);
  return new Decimal(qty || 0);
}

/**
 * 通用数量转换：基准单位 → 场景单位
 * @param {number|Decimal} baseQty - 基准单位数量
 * @param {object} material - 物料对象
 * @param {'purchase'|'sales'} scenario - 场景
 * @returns {Decimal} 场景单位数量
 */
function fromBaseQty(baseQty, material, scenario) {
  if (scenario === 'purchase') return baseQtyToPurchase(baseQty, material);
  if (scenario === 'sales') return baseQtyToSales(baseQty, material);
  return new Decimal(baseQty || 0);
}

/**
 * 通用单价转换：场景单价 → 基准单价
 * @param {number|Decimal} unitPrice - 场景单位单价
 * @param {object} material - 物料对象
 * @param {'purchase'|'sales'} scenario - 场景
 * @returns {Decimal} 基准单位单价
 */
function unitPriceToBase(unitPrice, material, scenario) {
  if (scenario === 'purchase') return purchaseUnitPriceToBase(unitPrice, material);
  if (scenario === 'sales') return salesUnitPriceToBase(unitPrice, material);
  return new Decimal(unitPrice || 0);
}

/**
 * 通用单价转换：基准单价 → 场景单价
 * @param {number|Decimal} baseUnitPrice - 基准单位单价
 * @param {object} material - 物料对象
 * @param {'purchase'|'sales'} scenario - 场景
 * @returns {Decimal} 场景单位单价
 */
function unitPriceFromBase(baseUnitPrice, material, scenario) {
  if (scenario === 'purchase') return baseUnitPriceToPurchase(baseUnitPrice, material);
  if (scenario === 'sales') return baseUnitPriceToSales(baseUnitPrice, material);
  return new Decimal(baseUnitPrice || 0);
}

export {
  purchaseQtyToBase,
  baseQtyToPurchase,
  salesQtyToBase,
  baseQtyToSales,
  purchaseUnitPriceToBase,
  baseUnitPriceToPurchase,
  baseUnitPriceToSales,
  salesUnitPriceToBase,
  getDisplayUnit,
  getConversionFactor,
  needsConversion,
  toBaseQty,
  fromBaseQty,
  unitPriceToBase,
  unitPriceFromBase,
};
