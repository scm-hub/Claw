import mysql from 'mysql2/promise';
import prisma from '../prisma.js';

const SCM_DB_URL = process.env.SCM_DATABASE_URL || 'mysql://root:Scm@2025!@localhost:3306/xdj_scm_db';

async function getScmConnection() {
  return mysql.createConnection(SCM_DB_URL);
}

const SYSTEM_CODE = 'SCM';

/**
 * 推送部门主数据到 SCM
 * 策略：
 *   Pass 1 — 按名称匹配，存在则更新，不存在则创建（同步 name/code/sortOrder/status）
 *   Pass 2 — 全部部门已建好后，回填 parentId（需先确保父部门的 DataMapping 已存在）
 */
export async function pushDepartmentsToScm() {
  const conn = await getScmConnection();
  try {
    const departments = await prisma.masterDepartment.findMany();

    let created = 0;
    let updated = 0;
    let failed = 0;
    const errors = [];

    // ===== Pass 1: 创建/更新基本字段 =====
    for (const dept of departments) {
      try {
        let mapping = await prisma.dataMapping.findUnique({
          where: {
            entityType_masterId_systemCode: {
              entityType: 'DEPARTMENT',
              masterId: dept.id,
              systemCode: SYSTEM_CODE,
            },
          },
        });

        if (mapping && mapping.systemEntityId) {
          await conn.execute(
            'UPDATE departments SET name = ?, sortOrder = ?, status = ? WHERE id = ?',
            [dept.name, dept.sortOrder || 0, dept.status || 'ACTIVE', mapping.systemEntityId]
          );
          await prisma.dataMapping.update({
            where: { id: mapping.id },
            data: { syncStatus: 'SYNCED', lastSyncAt: new Date(), errorMessage: '' },
          });
          updated++;
        } else {
          // 按名称查找 SCM 中是否已存在
          const [existing] = await conn.execute(
            'SELECT id FROM departments WHERE name = ?',
            [dept.name]
          );

          let scmDeptId;
          if (existing.length > 0) {
            scmDeptId = existing[0].id;
            await conn.execute(
              'UPDATE departments SET name = ?, sortOrder = ?, status = ? WHERE id = ?',
              [dept.name, dept.sortOrder || 0, dept.status || 'ACTIVE', scmDeptId]
            );
            updated++;
          } else {
            const code = `MDM_${dept.hrmsId.substring(0, 8).toUpperCase()}`;
            await conn.execute(
              'INSERT INTO departments (id, name, code, sortOrder, status, createdAt, updatedAt) VALUES (UUID(), ?, ?, ?, ?, NOW(), NOW())',
              [dept.name, code, dept.sortOrder || 0, dept.status || 'ACTIVE']
            );
            const [rows] = await conn.execute(
              'SELECT id FROM departments WHERE name = ? AND code = ? ORDER BY createdAt DESC LIMIT 1',
              [dept.name, code]
            );
            scmDeptId = rows[0]?.id;
            created++;
          }

          await prisma.dataMapping.upsert({
            where: {
              entityType_masterId_systemCode: {
                entityType: 'DEPARTMENT',
                masterId: dept.id,
                systemCode: SYSTEM_CODE,
              },
            },
            create: {
              entityType: 'DEPARTMENT',
              masterId: dept.id,
              systemCode: SYSTEM_CODE,
              systemEntityId: scmDeptId,
              syncStatus: 'SYNCED',
              lastSyncAt: new Date(),
            },
            update: {
              systemEntityId: scmDeptId,
              syncStatus: 'SYNCED',
              lastSyncAt: new Date(),
              errorMessage: '',
            },
          });
        }
      } catch (err) {
        failed++;
        errors.push(`部门"${dept.name}": ${err.message}`);
      }
    }

    // ===== Pass 2: 回填 parentId =====
    let parentUpdated = 0;
    for (const dept of departments) {
      if (!dept.parentId) continue;

      try {
        // dept.parentId 是 HRMS 父部门的 ID（hrmsId），需要找到对应的 MDM MasterDepartment
        const parentMaster = await prisma.masterDepartment.findUnique({
          where: { hrmsId: dept.parentId },
        });
        if (!parentMaster) continue;

        // 查找父部门 → SCM 的映射
        const parentMapping = await prisma.dataMapping.findUnique({
          where: {
            entityType_masterId_systemCode: {
              entityType: 'DEPARTMENT',
              masterId: parentMaster.id,
              systemCode: SYSTEM_CODE,
            },
          },
        });
        if (!parentMapping?.systemEntityId) continue;

        // 查找当前部门 → SCM 的映射
        const selfMapping = await prisma.dataMapping.findUnique({
          where: {
            entityType_masterId_systemCode: {
              entityType: 'DEPARTMENT',
              masterId: dept.id,
              systemCode: SYSTEM_CODE,
            },
          },
        });
        if (!selfMapping?.systemEntityId) continue;

        await conn.execute(
          'UPDATE departments SET parentId = ? WHERE id = ?',
          [parentMapping.systemEntityId, selfMapping.systemEntityId]
        );
        parentUpdated++;
      } catch (err) {
        errors.push(`部门"${dept.name}" parentId 回填: ${err.message}`);
      }
    }

    return { total: departments.length, created, updated, parentUpdated, failed, errors };
  } finally {
    await conn.end();
  }
}

/**
 * 推送员工主数据到 SCM
 * 策略：按工号匹配，存在则更新，不存在则创建
 * 同步字段：name, empNo, email, phone, departmentId, position, status, hireDate
 */
export async function pushEmployeesToScm() {
  const conn = await getScmConnection();
  try {
    const employees = await prisma.masterEmployee.findMany({
      where: { status: { in: ['ACTIVE', 'INACTIVE', 'RESIGNED'] } },
    });

    let created = 0;
    let updated = 0;
    let failed = 0;
    const errors = [];

    for (const emp of employees) {
      try {
        let mapping = await prisma.dataMapping.findUnique({
          where: {
            entityType_masterId_systemCode: {
              entityType: 'EMPLOYEE',
              masterId: emp.id,
              systemCode: SYSTEM_CODE,
            },
          },
        });

        // 查找部门映射
        let scmDeptId = null;
        if (emp.departmentHrmsId) {
          const masterDept = await prisma.masterDepartment.findUnique({
            where: { hrmsId: emp.departmentHrmsId },
          });
          if (masterDept) {
            const deptMapping = await prisma.dataMapping.findUnique({
              where: {
                entityType_masterId_systemCode: {
                  entityType: 'DEPARTMENT',
                  masterId: masterDept.id,
                  systemCode: SYSTEM_CODE,
                },
              },
            });
            if (deptMapping?.systemEntityId) {
              scmDeptId = deptMapping.systemEntityId;
            }
          }
        }

        if (mapping && mapping.systemEntityId) {
          await conn.execute(
            `UPDATE employees SET name = ?, empNo = ?, email = ?, phone = ?,
             departmentId = ?, position = ?, status = ?, hireDate = ? WHERE id = ?`,
            [emp.name, emp.employeeNo, emp.email, emp.phone, scmDeptId,
             emp.positionTitle || null, emp.status || 'ACTIVE',
             emp.hireDate || null, mapping.systemEntityId]
          );
          await prisma.dataMapping.update({
            where: { id: mapping.id },
            data: { syncStatus: 'SYNCED', lastSyncAt: new Date(), errorMessage: '' },
          });
          updated++;
        } else {
          const [existing] = await conn.execute(
            'SELECT id FROM employees WHERE empNo = ?',
            [emp.employeeNo]
          );

          let scmEmpId;
          if (existing.length > 0) {
            scmEmpId = existing[0].id;
            await conn.execute(
              `UPDATE employees SET name = ?, empNo = ?, email = ?, phone = ?,
               departmentId = ?, position = ?, status = ?, hireDate = ? WHERE id = ?`,
              [emp.name, emp.employeeNo, emp.email, emp.phone, scmDeptId,
               emp.positionTitle || null, emp.status || 'ACTIVE',
               emp.hireDate || null, scmEmpId]
            );
            updated++;
          } else {
            await conn.execute(
              `INSERT INTO employees (id, name, empNo, email, phone, departmentId, position, status, hireDate, createdAt, updatedAt)
               VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
              [emp.name, emp.employeeNo, emp.email, emp.phone, scmDeptId,
               emp.positionTitle || null, emp.status || 'ACTIVE', emp.hireDate || null]
            );
            const [rows] = await conn.execute(
              'SELECT id FROM employees WHERE empNo = ? ORDER BY createdAt DESC LIMIT 1',
              [emp.employeeNo]
            );
            scmEmpId = rows[0]?.id;
            created++;
          }

          await prisma.dataMapping.upsert({
            where: {
              entityType_masterId_systemCode: {
                entityType: 'EMPLOYEE',
                masterId: emp.id,
                systemCode: SYSTEM_CODE,
              },
            },
            create: {
              entityType: 'EMPLOYEE',
              masterId: emp.id,
              systemCode: SYSTEM_CODE,
              systemEntityId: scmEmpId,
              syncStatus: 'SYNCED',
              lastSyncAt: new Date(),
            },
            update: {
              systemEntityId: scmEmpId,
              syncStatus: 'SYNCED',
              lastSyncAt: new Date(),
              errorMessage: '',
            },
          });
        }
      } catch (err) {
        failed++;
        errors.push(`员工"${emp.name}"(${emp.employeeNo}): ${err.message}`);
        await prisma.dataMapping.upsert({
          where: {
            entityType_masterId_systemCode: {
              entityType: 'EMPLOYEE',
              masterId: emp.id,
              systemCode: SYSTEM_CODE,
            },
          },
          create: {
            entityType: 'EMPLOYEE',
            masterId: emp.id,
            systemCode: SYSTEM_CODE,
            syncStatus: 'FAILED',
            errorMessage: err.message,
          },
          update: {
            syncStatus: 'FAILED',
            errorMessage: err.message,
          },
        }).catch(() => {});
      }
    }

    return { total: employees.length, created, updated, failed, errors };
  } finally {
    await conn.end();
  }
}

/**
 * 回填部门负责人到 SCM
 * 必须在员工推送之后执行（需先有员工 DataMapping）
 */
export async function updateDepartmentManagersInScm() {
  const conn = await getScmConnection();
  try {
    const departments = await prisma.masterDepartment.findMany({
      where: { managerHrmsId: { not: null } },
    });

    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const dept of departments) {
      try {
        // managerHrmsId 是 HRMS 员工 ID，找到对应的 MDM MasterEmployee
        const managerEmp = await prisma.masterEmployee.findUnique({
          where: { hrmsId: dept.managerHrmsId },
        });
        if (!managerEmp) { skipped++; continue; }

        // 找到员工 → SCM 的映射
        const empMapping = await prisma.dataMapping.findUnique({
          where: {
            entityType_masterId_systemCode: {
              entityType: 'EMPLOYEE',
              masterId: managerEmp.id,
              systemCode: SYSTEM_CODE,
            },
          },
        });
        if (!empMapping?.systemEntityId) { skipped++; continue; }

        // 找到部门 → SCM 的映射
        const deptMapping = await prisma.dataMapping.findUnique({
          where: {
            entityType_masterId_systemCode: {
              entityType: 'DEPARTMENT',
              masterId: dept.id,
              systemCode: SYSTEM_CODE,
            },
          },
        });
        if (!deptMapping?.systemEntityId) { skipped++; continue; }

        await conn.execute(
          'UPDATE departments SET managerId = ? WHERE id = ?',
          [empMapping.systemEntityId, deptMapping.systemEntityId]
        );
        updated++;
      } catch (err) {
        errors.push(`部门"${dept.name}" managerId 回填: ${err.message}`);
      }
    }

    return { total: departments.length, updated, skipped, errors };
  } finally {
    await conn.end();
  }
}

/**
 * 完整推送：部门 → 员工 → 部门负责人回填
 */
export async function pushAllToScm() {
  const deptResult = await pushDepartmentsToScm();
  const empResult = await pushEmployeesToScm();
  const mgrResult = await updateDepartmentManagersInScm();
  return { departments: deptResult, employees: empResult, managers: mgrResult };
}
