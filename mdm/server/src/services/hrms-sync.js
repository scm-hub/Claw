import mysql from 'mysql2/promise';
import prisma from '../prisma.js';

const HRMS_DB_URL = process.env.HRMS_DATABASE_URL || 'mysql://root:Scm@2025!@localhost:3306/hrms';

async function getHrmsConnection() {
  return mysql.createConnection(HRMS_DB_URL);
}

/**
 * 从 HRMS 拉取部门数据到 MDM 主表
 */
export async function syncDepartmentsFromHrms() {
  const conn = await getHrmsConnection();
  try {
    const [rows] = await conn.execute(
      'SELECT id, name, parentId, managerId, sortOrder FROM Department'
    );

    let created = 0;
    let updated = 0;

    for (const row of rows) {
      const existing = await prisma.masterDepartment.findUnique({
        where: { hrmsId: row.id },
      });

      const data = {
        name: row.name,
        parentId: row.parentId,
        managerHrmsId: row.managerId || null,
        sortOrder: row.sortOrder || 0,
        lastSyncAt: new Date(),
      };

      if (existing) {
        await prisma.masterDepartment.update({
          where: { hrmsId: row.id },
          data,
        });
        updated++;
      } else {
        await prisma.masterDepartment.create({
          data: { hrmsId: row.id, ...data },
        });
        created++;
      }
    }

    return { total: rows.length, created, updated };
  } finally {
    await conn.end();
  }
}

/**
 * 从 HRMS 拉取员工数据到 MDM 主表
 */
export async function syncEmployeesFromHrms() {
  const conn = await getHrmsConnection();
  try {
    const [rows] = await conn.execute(
      `SELECT e.id, e.employeeNo, e.name, e.gender, e.phone, e.email, e.status,
              e.hireDate, e.departmentId, e.positionTitle, d.name as deptName
       FROM Employee e
       LEFT JOIN Department d ON e.departmentId = d.id`
    );

    let created = 0;
    let updated = 0;

    for (const row of rows) {
      const existing = await prisma.masterEmployee.findUnique({
        where: { hrmsId: row.id },
      });

      const data = {
        employeeNo: row.employeeNo,
        name: row.name,
        gender: row.gender || 'MALE',
        phone: row.phone || '',
        email: row.email || '',
        status: row.status || 'ACTIVE',
        hireDate: row.hireDate ? new Date(row.hireDate) : null,
        departmentHrmsId: row.departmentId,
        departmentName: row.deptName || '',
        positionTitle: row.positionTitle || '',
        lastSyncAt: new Date(),
      };

      if (existing) {
        await prisma.masterEmployee.update({
          where: { hrmsId: row.id },
          data,
        });
        updated++;
      } else {
        await prisma.masterEmployee.create({
          data: { hrmsId: row.id, ...data },
        });
        created++;
      }
    }

    return { total: rows.length, created, updated };
  } finally {
    await conn.end();
  }
}

/**
 * 完整拉取：部门 + 员工
 */
export async function pullAllFromHrms() {
  const deptResult = await syncDepartmentsFromHrms();
  const empResult = await syncEmployeesFromHrms();
  return { departments: deptResult, employees: empResult };
}
