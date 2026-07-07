/**
 * HRMS → SCM 部门和员工数据同步脚本
 * 
 * 策略：
 * - 部门：按名称匹配，存在则更新，不存在则创建
 * - 员工：按工号匹配，存在则更新，不存在则创建
 * - 部门关联：HRMS 部门 → 按名称在 SCM 中找对应部门 → 关联员工
 * 
 * 用法：node scripts/sync-from-hrms.js
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';
import prisma from '../src/shared/prisma.js';

const HRMS_DB_URL = process.env.HRMS_DATABASE_URL || 'mysql://root:Scm@2025!@localhost:3306/hrms';

async function getHrmsConn() {
  return mysql.createConnection(HRMS_DB_URL);
}

async function syncDepartments() {
  console.log('=== 同步部门 ===');
  const conn = await getHrmsConn();
  try {
    const [rows] = await conn.execute(`
      SELECT d.id, d.name, d.parentId, d.managerId, d.sortOrder, d.createdAt,
             m.employeeNo as managerEmpNo, m.name as managerName,
             (SELECT COUNT(*) FROM Employee e WHERE e.departmentId = d.id) as empCount
      FROM Department d
      LEFT JOIN Employee m ON d.managerId = m.id
      ORDER BY d.sortOrder ASC
    `);
    console.log(`HRMS 部门数: ${rows.length}`);

    let created = 0, updated = 0;
    const deptNameMap = new Map(); // HRMS dept name → SCM dept id

    for (const hd of rows) {
      // 在 SCM 中按名称查找
      let scmDept = await prisma.department.findFirst({ where: { name: hd.name } });

      // 找负责人（按工号在 SCM 中匹配）
      let managerId = null;
      if (hd.managerEmpNo) {
        const scmManager = await prisma.employee.findUnique({
          where: { empNo: hd.managerEmpNo },
        });
        if (scmManager) managerId = scmManager.id;
      }

      // 找上级部门
      let parentId = null;
      if (hd.parentId) {
        const [parentRows] = await conn.execute(
          'SELECT name FROM Department WHERE id = ?',
          [hd.parentId]
        );
        if (parentRows.length > 0) {
          const scmParent = await prisma.department.findFirst({
            where: { name: parentRows[0].name },
          });
          if (scmParent) parentId = scmParent.id;
        }
      }

      if (scmDept) {
        scmDept = await prisma.department.update({
          where: { id: scmDept.id },
          data: { sortOrder: hd.sortOrder, managerId, parentId },
        });
        updated++;
        console.log(`  [更新] ${hd.name} (sortOrder=${hd.sortOrder}, 员工数=${hd.empCount})`);
      } else {
        scmDept = await prisma.department.create({
          data: {
            name: hd.name,
            code: `HRMS_${hd.id.substring(0, 8).toUpperCase()}`,
            sortOrder: hd.sortOrder,
            managerId,
            parentId,
            status: 'ACTIVE',
          },
        });
        created++;
        console.log(`  [新增] ${hd.name} (code=${scmDept.code})`);
      }
      deptNameMap.set(hd.name, scmDept.id);
    }

    console.log(`部门同步完成: 新增 ${created}, 更新 ${updated}\n`);
    return deptNameMap;
  } finally {
    await conn.end();
  }
}

async function syncEmployees(deptNameMap) {
  console.log('=== 同步员工 ===');
  const conn = await getHrmsConn();
  try {
    const [rows] = await conn.execute(`
      SELECT e.id, e.globalId, e.employeeNo, e.name, e.phone, e.email, e.status, e.hireDate,
             e.positionTitle, e.departmentId,
             d.name as departmentName
      FROM Employee e
      LEFT JOIN Department d ON e.departmentId = d.id
      ORDER BY e.employeeNo ASC
    `);
    console.log(`HRMS 员工数: ${rows.length}`);

    let created = 0, updated = 0;

    for (const he of rows) {
      // 在 SCM 中按工号查找
      let scmEmp = await prisma.employee.findUnique({
        where: { empNo: he.employeeNo },
      });

      // 关联 SCM 部门
      let departmentId = null;
      if (he.departmentName) {
        departmentId = deptNameMap.get(he.departmentName);
        if (!departmentId) {
          const scmDept = await prisma.department.findFirst({
            where: { name: he.departmentName },
          });
          if (scmDept) departmentId = scmDept.id;
        }
      }

      const empData = {
        globalId: he.globalId || null,
        name: he.name,
        departmentId,
        position: he.positionTitle || null,
        phone: he.phone || null,
        email: he.email || null,
        status: he.status || 'ACTIVE',
        hireDate: he.hireDate ? new Date(he.hireDate) : null,
      };

      if (scmEmp) {
        scmEmp = await prisma.employee.update({
          where: { id: scmEmp.id },
          data: empData,
        });
        updated++;
        console.log(`  [更新] ${he.employeeNo} ${he.name} → 部门:${he.departmentName || '无'}`);
      } else {
        scmEmp = await prisma.employee.create({
          data: { empNo: he.employeeNo, ...empData },
        });
        created++;
        console.log(`  [新增] ${he.employeeNo} ${he.name} → 部门:${he.departmentName || '无'}`);
      }
    }

    console.log(`员工同步完成: 新增 ${created}, 更新 ${updated}\n`);
  } finally {
    await conn.end();
  }
}

async function cleanupOrphans(hrmsDeptNames, hrmsEmpNos) {
  console.log('=== 清理多余数据 ===');
  const conn = await getHrmsConn();
  try {
    // 1. 删除 SCM 中 HRMS 没有的员工
    const orphanEmps = await prisma.employee.findMany({
      where: { empNo: { notIn: hrmsEmpNos } },
      select: { id: true, empNo: true, name: true },
    });
    if (orphanEmps.length > 0) {
      console.log(`  删除多余员工 ${orphanEmps.length} 人:`);
      for (const e of orphanEmps) {
        console.log(`    - ${e.empNo} ${e.name}`);
        await prisma.employee.delete({ where: { id: e.id } });
      }
    } else {
      console.log('  无多余员工');
    }

    // 2. 删除 SCM 中 HRMS 没有的部门
    const orphanDepts = await prisma.department.findMany({
      where: { name: { notIn: hrmsDeptNames } },
      select: { id: true, name: true, code: true },
    });
    if (orphanDepts.length > 0) {
      console.log(`  删除多余部门 ${orphanDepts.length} 个:`);
      for (const d of orphanDepts) {
        // 先检查有没有外键引用
        const placeholders = [d.id];
        const [refs] = await conn.execute(
          `SELECT
            (SELECT COUNT(*) FROM xdj_scm_db.employees WHERE departmentId = ?) as empRefs,
            (SELECT COUNT(*) FROM xdj_scm_db.customers WHERE departmentId = ?) as custRefs,
            (SELECT COUNT(*) FROM xdj_scm_db.price_lists WHERE departmentId = ?) as priceRefs,
            (SELECT COUNT(*) FROM xdj_scm_db.purchase_plans WHERE departmentId = ?) as purRefs,
            (SELECT COUNT(*) FROM xdj_scm_db.sales_plans WHERE departmentId = ?) as salesRefs`,
          [d.id, d.id, d.id, d.id, d.id]
        );
        const totalRefs = Object.values(refs[0]).reduce((a, b) => a + b, 0);
        if (totalRefs > 0) {
          console.log(`    ⚠️ 跳过 ${d.name} (有 ${totalRefs} 条引用数据)`);
          continue;
        }
        console.log(`    - ${d.name} (${d.code})`);
        await prisma.department.delete({ where: { id: d.id } });
      }
    } else {
      console.log('  无多余部门');
    }
    console.log('');
  } finally {
    await conn.end();
  }
}

async function main() {
  console.log('🚀 开始 HRMS → SCM 数据同步（仅新增/更新，不删除任何数据）\n');

  const deptNameMap = await syncDepartments();
  await syncEmployees(deptNameMap);

  // 验证结果
  const scmDeptCount = await prisma.department.count();
  const scmEmpCount = await prisma.employee.count();

  console.log('=== 同步结果 ===');
  console.log(`SCM 部门数: ${scmDeptCount}`);
  console.log(`SCM 员工数: ${scmEmpCount}`);

  await prisma.$disconnect();
  console.log('\n✅ 同步完成（未删除任何现有数据）');
}

main().catch((err) => {
  console.error('❌ 同步失败:', err);
  process.exit(1);
});
