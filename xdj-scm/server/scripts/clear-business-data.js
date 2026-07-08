import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearBusinessData() {
  console.log('开始清空业务数据...\n');
  
  // 禁用外键检查
  await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 0`;
  
  try {
    // 使用正确的表名（snake_case）
    const tables = [
      // 采购相关
      'purchase_receipt_items',
      'purchase_receipts',
      'purchase_order_items', 
      'purchase_orders',
      'purchase_plan_items',
      'purchase_plans',
      
      // 销售相关
      'sales_order_items',
      'sales_orders',
      'sales_plan_items',
      'sales_plans',
      
      // 发货/物流相关
      'shipping_order_items',
      'shipping_orders',
      'waybills',
      'vehicles',
      
      // 库存相关
      'stock_movements',
      'stock_locks',
      'stock_take_items',
      'stock_takes',
      'batch_tracking',
      'batches',
      'inventory',
      
      // 财务相关
      'accounts_payable',
      'accounts_receivable',
      'payments',
      'invoices',
      'freight_settlements',
      
      // 成本相关
      'cost_price_records',
      'cost_snapshots',
      'standard_costs',
      'product_loss_records',
      'fee_records',
      
      // 合同/售后
      'contracts',
      'after_sales_records',
      'recall_orders',
      
      // 审批/预警
      'approval_flows',
      'alert_records',
      'temperature_alerts',
      'temperature_records',
      'sensors',
      
      // 其他
      'barcode_records',
      'purchaser_assignments',
      'purchaser_material_items',
      'kingdee_sync_logs',
      'data_centers',
    ];
    
    for (const tableName of tables) {
      try {
        // 使用 Prisma 的 $executeRaw 模板标签（自动参数化，安全）
        const result = await prisma.$executeRaw`DELETE FROM ${prisma.$raw(tableName)}`;
        console.log(`✓ 已清空 ${tableName}: ${result} 条记录`);
      } catch (e) {
        console.log(`⚠ ${tableName}: ${e.message}`);
      }
    }
    
    // 重置自增ID
    console.log('\n重置自增ID...');
    for (const tableName of tables) {
      try {
        await prisma.$executeRaw`ALTER TABLE ${prisma.$raw(tableName)} AUTO_INCREMENT = 1`;
      } catch (e) {
        // 忽略错误（有些表可能没有自增ID）
      }
    }
    
    console.log('\n✅ 业务数据清空完成！');
    console.log('\n保留的数据：');
    console.log('- 用户/员工/部门');
    console.log('- 物料/客户/供应商/仓库');
    console.log('- 系统配置/打印模板');
    
  } catch (error) {
    console.error('❌ 删除过程中出错:', error);
    throw error;
  } finally {
    // 重新启用外键检查
    await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 1`;
    await prisma.$disconnect();
  }
}

clearBusinessData();
