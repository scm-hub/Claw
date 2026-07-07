import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化种子数据...');

  // 1. 创建部门
  const rootDept = await prisma.department.create({
    data: { name: '鲜当家总部', code: 'HQ', sortOrder: 0 },
  });
  const salesDept = await prisma.department.create({
    data: { name: '销售部', code: 'SALES', parentId: rootDept.id, sortOrder: 1 },
  });
  const purchaseDept = await prisma.department.create({
    data: { name: '采购部', code: 'PURCHASE', parentId: rootDept.id, sortOrder: 2 },
  });
  const warehouseDept = await prisma.department.create({
    data: { name: '仓储部', code: 'WH', parentId: rootDept.id, sortOrder: 3 },
  });
  const financeDept = await prisma.department.create({
    data: { name: '财务部', code: 'FIN', parentId: rootDept.id, sortOrder: 4 },
  });
  const qualityDept = await prisma.department.create({
    data: { name: '品控部', code: 'QC', parentId: rootDept.id, sortOrder: 5 },
  });
  const logisticsDept = await prisma.department.create({
    data: { name: '物流部', code: 'LOG', parentId: rootDept.id, sortOrder: 6 },
  });
  console.log('  部门已创建');

  // 2. 创建员工
  const admin = await prisma.employee.create({
    data: { empNo: 'EMP001', name: '系统管理员', departmentId: rootDept.id, position: 'IT管理员', phone: '13800000001', email: 'admin@hrms.com', hireDate: new Date('2026-01-01') },
  });
  const salesManager = await prisma.employee.create({
    data: { empNo: 'EMP002', name: '张销售', departmentId: salesDept.id, position: '销售经理', phone: '13800000002', email: 'sales@xdj.com', hireDate: new Date('2026-01-01') },
  });
  const purchaseStaff = await prisma.employee.create({
    data: { empNo: 'EMP003', name: '李采购', departmentId: purchaseDept.id, position: '采购员', phone: '13800000003', email: 'purchase@xdj.com', hireDate: new Date('2026-01-01') },
  });
  const warehouseStaff = await prisma.employee.create({
    data: { empNo: 'EMP004', name: '王仓库', departmentId: warehouseDept.id, position: '仓库管理员', phone: '13800000004', email: 'wh@xdj.com', hireDate: new Date('2026-01-01') },
  });
  const financeStaff = await prisma.employee.create({
    data: { empNo: 'EMP005', name: '赵财务', departmentId: financeDept.id, position: '财务员', phone: '13800000005', email: 'fin@xdj.com', hireDate: new Date('2026-01-01') },
  });
  console.log('  员工已创建');

  // 3. 更新部门负责人
  await prisma.department.update({ where: { id: salesDept.id }, data: { managerId: salesManager.id } });
  await prisma.department.update({ where: { id: purchaseDept.id }, data: { managerId: purchaseStaff.id } });
  await prisma.department.update({ where: { id: warehouseDept.id }, data: { managerId: warehouseStaff.id } });
  await prisma.department.update({ where: { id: financeDept.id }, data: { managerId: financeStaff.id } });

  // 4. 创建用户账号
  const hash = await bcrypt.hash('123456', 10);
  await prisma.user.create({ data: { username: 'admin', passwordHash: hash, employeeId: admin.id, role: 'SUPER_ADMIN' } });
  await prisma.user.create({ data: { username: 'sales', passwordHash: hash, employeeId: salesManager.id, role: 'SALES_MANAGER' } });
  await prisma.user.create({ data: { username: 'purchase', passwordHash: hash, employeeId: purchaseStaff.id, role: 'PURCHASE_STAFF' } });
  await prisma.user.create({ data: { username: 'warehouse', passwordHash: hash, employeeId: warehouseStaff.id, role: 'WAREHOUSE_STAFF' } });
  await prisma.user.create({ data: { username: 'finance', passwordHash: hash, employeeId: financeStaff.id, role: 'FINANCE_STAFF' } });
  console.log('  用户账号已创建（密码均为 123456）');

  // 5. 创建仓库
  const wh = await prisma.warehouse.create({
    data: { name: '杭州总仓', code: 'WH01', address: '杭州市余杭区', managerId: warehouseStaff.id, isColdStorage: true },
  });
  // 6. 创建库区
  const coldZone = await prisma.warehouseZone.create({ data: { warehouseId: wh.id, name: '冷链区', code: 'COLD', zoneType: 'COLD', sortOrder: 1 } });
  const normalZone = await prisma.warehouseZone.create({ data: { warehouseId: wh.id, name: '常温区', code: 'NORMAL', zoneType: 'STORAGE', sortOrder: 2 } });
  await prisma.warehouseLocation.create({ data: { zoneId: coldZone.id, warehouseId: wh.id, name: 'C-01-01', code: 'C-01-01', barcode: 'C0101' } });
  await prisma.warehouseLocation.create({ data: { zoneId: normalZone.id, warehouseId: wh.id, name: 'N-01-01', code: 'N-01-01', barcode: 'N0101' } });
  console.log('  仓库和库区已创建');

  // 7. 创建示例产品组
  const xbgGroup = await prisma.materialGroup.create({ data: { code: 'XBG', name: '杏鲍菇', category: '鲜品', description: '杏鲍菇系列产品' } });
  const xgGroup = await prisma.materialGroup.create({ data: { code: 'XG', name: '香菇', category: '鲜品', description: '香菇系列产品' } });
  const gjzGroup = await prisma.materialGroup.create({ data: { code: 'JZG', name: '金针菇', category: '鲜品', description: '金针菇系列产品' } });
  const gxgGroup = await prisma.materialGroup.create({ data: { code: 'GXG', name: '干香菇', category: '干品', description: '干香菇系列产品' } });
  const mGroup = await prisma.materialGroup.create({ data: { code: 'ME', name: '木耳', category: '干品', description: '木耳系列产品' } });
  console.log('  示例产品组已创建');

  // 8. 创建示例产品（关联产品组）
  await prisma.material.create({ data: { code: 'M001', name: '香菇鲜品', spec: '500g/盒', unit: '盒', category: '鲜品', shelfLifeDays: 7, storageTempMin: 2, storageTempMax: 6, archivePurchasePrice: 8.5, groupId: xgGroup.id } });
  await prisma.material.create({ data: { code: 'M002', name: '金针菇鲜品', spec: '200g/袋', unit: '袋', category: '鲜品', shelfLifeDays: 10, storageTempMin: 2, storageTempMax: 6, archivePurchasePrice: 3.5, groupId: gjzGroup.id } });
  await prisma.material.create({ data: { code: 'M003', name: '杏鲍菇鲜品', spec: '500g/袋', unit: '袋', category: '鲜品', shelfLifeDays: 10, storageTempMin: 2, storageTempMax: 6, archivePurchasePrice: 6.0, groupId: xbgGroup.id } });
  await prisma.material.create({ data: { code: 'M004', name: '干香菇', spec: '500g/袋', unit: '袋', category: '干品', shelfLifeDays: 365, archivePurchasePrice: 35.0, groupId: gxgGroup.id } });
  await prisma.material.create({ data: { code: 'M005', name: '木耳干品', spec: '250g/袋', unit: '袋', category: '干品', shelfLifeDays: 365, archivePurchasePrice: 28.0, groupId: mGroup.id } });
  console.log('  示例产品已创建');

  // 8. 创建示例客户和供应商
  await prisma.customer.create({ data: { code: 'C001', name: '杭州生鲜超市', contactPerson: '周经理', contactPhone: '13900000001', address: '杭州市西湖区', salesRepId: salesManager.id, creditLimit: 500000, creditPeriod: 30 } });
  await prisma.customer.create({ data: { code: 'C002', name: '上海餐饮连锁', contactPerson: '吴总', contactPhone: '13900000002', address: '上海市浦东新区', salesRepId: salesManager.id, creditLimit: 1000000, creditPeriod: 45 } });
  await prisma.supplier.create({ data: { code: 'S001', name: '山东食用菌种植基地', contactPerson: '刘经理', contactPhone: '13700000001', address: '山东省淄博市', bankAccount: '6222000000000001' } });
  await prisma.supplier.create({ data: { code: 'S002', name: '河南食用菌合作社', contactPerson: '陈经理', contactPhone: '13700000002', address: '河南省郑州市', bankAccount: '6222000000000002' } });
  console.log('  示例客户和供应商已创建');

  // 9. 创建数据中心
  await prisma.dataCenter.create({ data: { name: '杭州数据中心', dbHost: 'localhost', dbName: 'xdj_scm_db', apiUrl: 'http://localhost:4003' } });
  console.log('  数据中心已创建');

  console.log('\n种子数据初始化完成！');
  console.log('  管理员账号: admin / 123456');
  console.log('  销售经理:  sales / 123456');
  console.log('  采购员:    purchase / 123456');
  console.log('  仓库管理:  warehouse / 123456');
  console.log('  财务员:    finance / 123456');
}

main()
  .catch((e) => { console.error('种子数据初始化失败:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
