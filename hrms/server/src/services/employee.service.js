import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import XLSX from 'xlsx';
import { AppError } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();

/**
 * 递归获取某个部门及其所有子部门的 ID 列表
 * 用于层级部门筛选：选父部门时自动包含子部门的员工
 */
async function getDepartmentAndDescendants(departmentId) {
  if (!departmentId) return null;
  const allDepts = await prisma.department.findMany({
    select: { id: true, parentId: true },
  });
  const result = [departmentId];
  const queue = [departmentId];
  while (queue.length > 0) {
    const currentId = queue.shift();
    const children = allDepts.filter((d) => d.parentId === currentId);
    for (const child of children) {
      if (!result.includes(child.id)) {
        result.push(child.id);
        queue.push(child.id);
      }
    }
  }
  return result;
}

/**
 * 部门负责人变更时自动调整系统角色：
 * - 新负责人：升级为 MANAGER（除非已是更高级别）
 * - 旧负责人：如果不再管理任何部门，降级为 EMPLOYEE（除非是 SUPER_ADMIN 或 HR_ADMIN）
 */
export const syncManagerRole = async (newManagerId, oldManagerId) => {
  const tasks = [];

  // 升级新负责人
  if (newManagerId) {
    const newUser = await prisma.user.findUnique({ where: { employeeId: newManagerId } });
    if (newUser && (newUser.role === 'EMPLOYEE')) {
      tasks.push(
        prisma.user.update({ where: { id: newUser.id }, data: { role: 'MANAGER' } })
      );
    }
  }

  // 降级旧负责人（如果不再管理任何部门）
  if (oldManagerId && oldManagerId !== newManagerId) {
    const stillManaging = await prisma.department.count({ where: { managerId: oldManagerId } });
    if (stillManaging === 0) {
      const oldUser = await prisma.user.findUnique({ where: { employeeId: oldManagerId } });
      // 仅降级 MANAGER 角色，不影响 SUPER_ADMIN / HR_ADMIN
      if (oldUser && oldUser.role === 'MANAGER') {
        tasks.push(
          prisma.user.update({ where: { id: oldUser.id }, data: { role: 'EMPLOYEE' } })
        );
      }
    }
  }

  if (tasks.length > 0) {
    await prisma.$transaction(tasks);
  }
};

export const listEmployees = async ({ page = 1, pageSize = 10, search, departmentId, status }) => {
  const where = {
    // 只隐藏工号为 XDJ000000 的管理员账号
    NOT: {
      employeeNo: 'XDJ000000',
    },
  };
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { employeeNo: { contains: search } },
      { email: { contains: search } },
    ];
  }
  if (departmentId) {
    const deptIds = await getDepartmentAndDescendants(departmentId);
    where.departmentId = { in: deptIds };
  }
  if (status) where.status = status;

  const [total, data] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      include: { department: true, position: { select: { id: true, name: true, code: true } }, user: { select: { role: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { employeeNo: 'asc' },
    }),
  ]);
  return { page, pageSize, total, data };
};

export const getEmployee = async (id) => {
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      department: true,
      position: { select: { id: true, name: true, code: true, level: true } },
      user: { select: { id: true, email: true, role: true } },
      contracts: true,
      educations: { orderBy: { graduationDate: 'desc' } },
      workExperiences: { orderBy: { startDate: 'desc' } },
      familyMembers: true,
      emergencyContacts: true,
      languages: true,
      certs: { orderBy: { obtainDate: 'desc' } },
      positionRecords: { orderBy: { startDate: 'desc' } },
    },
  });
  if (!employee) throw new Error('员工不存在');
  return employee;
};

export const createEmployee = async (data) => {
  // Only allow valid scalar fields to prevent Prisma errors from extra fields
  const allowedFields = ['name', 'gender', 'idCard', 'birthday', 'ethnicity', 'politicalStatus', 'maritalStatus', 'education', 'school', 'major', 'phone', 'email', 'emergencyContact', 'emergencyPhone', 'currentAddress', 'permanentAddress', 'positionTitle', 'positionId', 'status', 'hireDate', 'leaveDate', 'baseSalary', 'departmentId', 'photo', 'hasPrivateCar', 'carPlate', 'jobLevel', 'rank', 'isAccommodated', 'accommodationStartDate', 'criminalRecordUrl', 'tempContractUrl', 'hasGroupInsurance', 'hasSignedContract'];
  const empData = {};
  for (const key of allowedFields) {
    if (data[key] !== undefined && data[key] !== '') {
      empData[key] = data[key];
    }
  }

  // 校验必填字段
  if (!empData.name || !empData.name.trim()) {
    throw new AppError('员工姓名不能为空', 400);
  }
  if (!empData.departmentId) {
    throw new AppError('请选择所属部门', 400);
  }
  // 身份证号重复验证
  if (empData.idCard) {
    const existing = await prisma.employee.findFirst({ where: { idCard: empData.idCard }, select: { id: true, name: true } });
    if (existing) {
      throw new AppError(`身份证号「${empData.idCard}」已被员工「${existing.name}」使用，不能重复`, 400);
    }
  }

  // 类型转换
  empData.baseSalary = Number(empData.baseSalary) || 0;
  empData.phone = empData.phone || '';
  empData.email = empData.email || '';
  empData.positionTitle = empData.positionTitle || '';
  empData.positionId = empData.positionId || null;
  // 日期字段：空字符串转 null，有效字符串转 Date
  if (empData.birthday) {
    empData.birthday = new Date(empData.birthday);
  } else {
    empData.birthday = null;
  }
  if (empData.leaveDate) {
    empData.leaveDate = new Date(empData.leaveDate);
  } else {
    delete empData.leaveDate;
  }
  // 新字段类型转换
  empData.hasPrivateCar = empData.hasPrivateCar === true || empData.hasPrivateCar === 'true';
  empData.isAccommodated = empData.isAccommodated === true || empData.isAccommodated === 'true';
  empData.hasGroupInsurance = empData.hasGroupInsurance === true || empData.hasGroupInsurance === 'true';
  empData.hasSignedContract = empData.hasSignedContract === true || empData.hasSignedContract === 'true';
  if (empData.accommodationStartDate) {
    empData.accommodationStartDate = new Date(empData.accommodationStartDate);
  } else {
    delete empData.accommodationStartDate;
  }

  const { password, accountPassword: reqAccountPassword, accountRole: reqAccountRole } = data;
  // Auto-generate employee number
  const count = await prisma.employee.count();
  const employeeNo = `XDJ${String(count + 1).padStart(6, '0')}`;

  const emp = await prisma.employee.create({
    data: {
      ...empData,
      employeeNo,
      hireDate: empData.hireDate ? new Date(empData.hireDate) : new Date(),
    },
    include: { department: true },
  });

  // 自动创建登录账号
  const accountEmail = emp.email || `${employeeNo}@hrms.internal`;
  const accountPassword = reqAccountPassword || password || (empData.idCard ? empData.idCard.slice(-6) : '123456');
  const accountRole = reqAccountRole || 'EMPLOYEE';
  const hashedPassword = await bcrypt.hash(accountPassword, 10);
  const user = await prisma.user.create({
    data: {
      email: accountEmail,
      password: hashedPassword,
      role: accountRole,
      employeeId: emp.id,
    },
    select: { id: true, email: true, role: true },
  });

  return { ...emp, account: { email: accountEmail, password: accountPassword, role: accountRole } };
};

export const updateEmployee = async (id, data) => {
  // Only allow updatable scalar fields to prevent Prisma errors from relation fields
  const allowedFields = ['name', 'gender', 'idCard', 'birthday', 'ethnicity', 'politicalStatus', 'maritalStatus', 'education', 'school', 'major', 'phone', 'email', 'emergencyContact', 'emergencyPhone', 'currentAddress', 'permanentAddress', 'positionTitle', 'positionId', 'status', 'hireDate', 'leaveDate', 'baseSalary', 'departmentId', 'handoverNote', 'photo', 'hasPrivateCar', 'carPlate', 'jobLevel', 'rank', 'isAccommodated', 'accommodationStartDate', 'criminalRecordUrl', 'tempContractUrl', 'hasGroupInsurance', 'hasSignedContract'];
  const updateData = {};
  for (const key of allowedFields) {
    if (data[key] !== undefined) {
      updateData[key] = data[key];
    }
  }
  // 类型转换
  if (updateData.baseSalary !== undefined) updateData.baseSalary = Number(updateData.baseSalary) || 0;
  // 日期字段：空字符串转 null，有效字符串转 Date
  if (updateData.hireDate !== undefined) {
    updateData.hireDate = updateData.hireDate ? new Date(updateData.hireDate) : new Date();
  }
  if (updateData.leaveDate !== undefined) {
    updateData.leaveDate = updateData.leaveDate || null;
    if (updateData.leaveDate) updateData.leaveDate = new Date(updateData.leaveDate);
  }
  if (updateData.birthday !== undefined) {
    updateData.birthday = updateData.birthday || null;
    if (updateData.birthday) updateData.birthday = new Date(updateData.birthday);
  }
  // 身份证号重复验证（排除自己）
  if (updateData.idCard) {
    const existing = await prisma.employee.findFirst({
      where: { idCard: updateData.idCard, id: { not: id } },
      select: { id: true, name: true },
    });
    if (existing) {
      throw new AppError(`身份证号「${updateData.idCard}」已被员工「${existing.name}」使用，不能重复`, 400);
    }
  }
  // 新字段类型转换
  if (updateData.hasPrivateCar !== undefined) {
    updateData.hasPrivateCar = updateData.hasPrivateCar === true || updateData.hasPrivateCar === 'true';
  }
  if (updateData.isAccommodated !== undefined) {
    updateData.isAccommodated = updateData.isAccommodated === true || updateData.isAccommodated === 'true';
  }
  if (updateData.hasGroupInsurance !== undefined) {
    updateData.hasGroupInsurance = updateData.hasGroupInsurance === true || updateData.hasGroupInsurance === 'true';
  }
  if (updateData.hasSignedContract !== undefined) {
    updateData.hasSignedContract = updateData.hasSignedContract === true || updateData.hasSignedContract === 'true';
  }
  if (updateData.accommodationStartDate !== undefined) {
    updateData.accommodationStartDate = updateData.accommodationStartDate || null;
    if (updateData.accommodationStartDate) updateData.accommodationStartDate = new Date(updateData.accommodationStartDate);
  }

  // 离职交接检查：状态改为 RESIGNED 时
  if (updateData.status === 'RESIGNED') {
    // 自动设置离职日期
    if (!updateData.leaveDate) {
      updateData.leaveDate = new Date();
    }

    // 检查是否是部门负责人
    const managedDepts = await prisma.department.findMany({
      where: { managerId: id },
    });

    if (managedDepts.length > 0) {
      const newManagerId = data.newManagerId;
      if (!newManagerId) {
        const deptNames = managedDepts.map(d => d.name).join('、');
        throw new AppError(`该员工是【${deptNames}】的负责人，请先指定新的部门负责人`, 400);
      }

      // 验证新负责人是在职员工
      const newManager = await prisma.employee.findUnique({
        where: { id: newManagerId },
      });
      if (!newManager || newManager.status !== 'ACTIVE') {
        throw new AppError('新负责人必须是在职员工', 400);
      }

      // 更新所有管理的部门
      await prisma.department.updateMany({
        where: { managerId: id },
        data: { managerId: newManagerId },
      });

      // 新负责人升级经理角色，离职者降级
      await syncManagerRole(newManagerId, id);
    } else {
      // 没有管理部门但角色是 MANAGER，降级为 EMPLOYEE
      const user = await prisma.user.findUnique({ where: { employeeId: id } });
      if (user && user.role === 'MANAGER') {
        await prisma.user.update({ where: { id: user.id }, data: { role: 'EMPLOYEE' } });
      }
    }
  }

  // ── 子表同步（replace 策略：先删后建）──
  const subEntities = ['educations', 'workExperiences', 'familyMembers', 'emergencyContacts', 'languages', 'certs', 'positionRecords'];
  const subData = {};
  for (const key of subEntities) {
    if (data[key] !== undefined) {
      subData[key] = data[key];
    }
  }

  // 如果有子表数据需要同步，使用事务
  if (Object.keys(subData).length > 0) {
    await prisma.$transaction(async (tx) => {
      // 先删除旧数据
      if (subData.educations !== undefined) {
        await tx.employeeEducation.deleteMany({ where: { employeeId: id } });
      }
      if (subData.workExperiences !== undefined) {
        await tx.employeeWorkExperience.deleteMany({ where: { employeeId: id } });
      }
      if (subData.familyMembers !== undefined) {
        await tx.employeeFamilyMember.deleteMany({ where: { employeeId: id } });
      }
      if (subData.emergencyContacts !== undefined) {
        await tx.employeeEmergencyContact.deleteMany({ where: { employeeId: id } });
      }
      if (subData.languages !== undefined) {
        await tx.employeeLanguage.deleteMany({ where: { employeeId: id } });
      }
      if (subData.certs !== undefined) {
        await tx.employeeCert.deleteMany({ where: { employeeId: id } });
      }
      if (subData.positionRecords !== undefined) {
        await tx.internalPositionRecord.deleteMany({ where: { employeeId: id } });
      }

      // 更新主表
      await tx.employee.update({ where: { id }, data: updateData });

      // 创建新数据
      if (subData.educations?.length > 0) {
        await tx.employeeEducation.createMany({
          data: subData.educations.map(r => ({
            employeeId: id,
            schoolName: r.schoolName || '',
            major: r.major || '',
            graduationDate: r.graduationDate ? new Date(r.graduationDate) : null,
            degreeCertNo: r.degreeCertNo || '',
            diplomaCertNo: r.diplomaCertNo || '',
            attachment: r.attachment || '',
          })),
        });
      }
      if (subData.workExperiences?.length > 0) {
        await tx.employeeWorkExperience.createMany({
          data: subData.workExperiences.map(r => ({
            employeeId: id,
            companyName: r.companyName || '',
            industry: r.industry || '',
            position: r.position || '',
            startDate: r.startDate ? new Date(r.startDate) : null,
            endDate: r.endDate ? new Date(r.endDate) : null,
            leaveReason: r.leaveReason || '',
            leaveCertUrl: r.leaveCertUrl || '',
            lastSalary: Number(r.lastSalary) || 0,
            attachment: r.attachment || '',
          })),
        });
      }
      if (subData.familyMembers?.length > 0) {
        await tx.employeeFamilyMember.createMany({
          data: subData.familyMembers.map(r => ({
            employeeId: id,
            name: r.name || '',
            idCard: r.idCard || '',
            age: Number(r.age) || 0,
            relationship: r.relationship || '',
            phone: r.phone || '',
            workUnit: r.workUnit || '',
            workPosition: r.workPosition || '',
          })),
        });
      }
      if (subData.emergencyContacts?.length > 0) {
        await tx.employeeEmergencyContact.createMany({
          data: subData.emergencyContacts.map(r => ({
            employeeId: id,
            name: r.name || '',
            relationship: r.relationship || '',
            phone: r.phone || '',
            address: r.address || '',
          })),
        });
      }
      if (subData.languages?.length > 0) {
        await tx.employeeLanguage.createMany({
          data: subData.languages.map(r => ({
            employeeId: id,
            language: r.language || '',
            listeningSpeaking: r.listeningSpeaking || '',
            readingWriting: r.readingWriting || '',
            attachment: r.attachment || '',
          })),
        });
      }
      if (subData.certs?.length > 0) {
        await tx.employeeCert.createMany({
          data: subData.certs.map(r => ({
            employeeId: id,
            certName: r.certName || '',
            certLevel: r.certLevel || '',
            certNo: r.certNo || '',
            issuingAuthority: r.issuingAuthority || '',
            obtainDate: r.obtainDate ? new Date(r.obtainDate) : null,
            attachment: r.attachment || '',
          })),
        });
      }
      if (subData.positionRecords?.length > 0) {
        await tx.internalPositionRecord.createMany({
          data: subData.positionRecords.map(r => ({
            employeeId: id,
            positionTitle: r.positionTitle || '',
            departmentName: r.departmentName || '',
            startDate: r.startDate ? new Date(r.startDate) : null,
            endDate: r.endDate ? new Date(r.endDate) : null,
            changeType: r.changeType || '',
            remark: r.remark || '',
          })),
        });
      }
    });
  } else {
    // 没有子表数据，直接更新主表
    await prisma.employee.update({ where: { id }, data: updateData });
  }

  return prisma.employee.findUnique({
    where: { id },
    include: {
      department: true,
      position: { select: { id: true, name: true, code: true } },
      educations: { orderBy: { graduationDate: 'desc' } },
      workExperiences: { orderBy: { startDate: 'desc' } },
      familyMembers: true,
      emergencyContacts: true,
      languages: true,
      certs: { orderBy: { obtainDate: 'desc' } },
      positionRecords: { orderBy: { startDate: 'desc' } },
    },
  });
};

export const deleteEmployee = async (id) => {
  return prisma.employee.update({
    where: { id },
    data: { status: 'RESIGNED', leaveDate: new Date() },
  });
};

/* ========= 查询员工管理的部门 ========= */
export const getManagedDepartments = async (employeeId) => {
  return prisma.department.findMany({
    where: { managerId: employeeId },
    select: { id: true, name: true },
  });
};

/* ========= 导出员工为 Excel ========= */
export const exportEmployees = async ({ search, departmentId, status, ids } = {}) => {
  const where = {
    // 只隐藏工号为 XDJ000000 的管理员账号
    NOT: {
      employeeNo: 'XDJ000000',
    },
  };
  if (ids) {
    // 按指定 ID 列表导出
    const idArr = typeof ids === 'string' ? ids.split(',').filter(Boolean) : ids;
    if (idArr.length > 0) {
      where.id = { in: idArr };
    }
  } else {
    // 按筛选条件导出
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { employeeNo: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (departmentId) {
      const deptIds = await getDepartmentAndDescendants(departmentId);
      where.departmentId = { in: deptIds };
    }
    if (status) where.status = status;
  }

  const employees = await prisma.employee.findMany({
    where,
    include: { department: true, position: { select: { id: true, name: true, code: true } } },
    orderBy: { employeeNo: 'asc' },
  });

  const genderMap = { MALE: '男', FEMALE: '女' };
  const statusMap = { ACTIVE: '在职', INACTIVE: '停职', RESIGNED: '离职' };

  const rows = employees.map((emp) => ({
    '工号': emp.employeeNo,
    '姓名': emp.name,
    '性别': genderMap[emp.gender] || emp.gender,
    '身份证号': emp.idCard || '',
    '出生日期': emp.birthday ? new Date(emp.birthday).toLocaleDateString('zh-CN') : '',
    '民族': emp.ethnicity || '',
    '政治面貌': emp.politicalStatus || '',
    '婚姻状况': emp.maritalStatus || '',
    '学历': emp.education || '',
    '毕业院校': emp.school || '',
    '专业': emp.major || '',
    '手机号': emp.phone,
    '邮箱': emp.email,
    '部门': emp.department?.name || '',
    '岗位': emp.positionTitle || (emp.position?.name || ''),
    '岗位级别': emp.jobLevel || '',
    '职级': emp.rank || '',
    '是否有私家车': emp.hasPrivateCar ? '是' : '否',
    '车牌号': emp.carPlate || '',
    '是否住宿': emp.isAccommodated ? '是' : '否',
    '住宿开始日期': emp.accommodationStartDate ? new Date(emp.accommodationStartDate).toLocaleDateString('zh-CN') : '',
    '是否缴纳团险': emp.hasGroupInsurance ? '是' : '否',
    '是否签订合同': emp.hasSignedContract ? '是' : '否',
    '状态': statusMap[emp.status] || emp.status,
    '入职日期': emp.hireDate ? new Date(emp.hireDate).toLocaleDateString('zh-CN') : '',
    '基本薪资': emp.baseSalary,
    '现住址': emp.currentAddress || '',
    '户籍地址': emp.permanentAddress || '',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  // 列宽
  ws['!cols'] = [
    { wch: 10 }, { wch: 10 }, { wch: 6 }, { wch: 20 }, { wch: 14 },
    { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 16 },
    { wch: 14 }, { wch: 14 }, { wch: 22 },
    { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
    { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 14 },
    { wch: 12 }, { wch: 12 },
    { wch: 8 }, { wch: 14 }, { wch: 12 },
    { wch: 24 }, { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, '员工列表');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

/* ========= 生成导入模板 ========= */
export const generateImportTemplate = () => {
  const headers = [
    '姓名*', '性别(男/女)', '身份证号', '出生日期(YYYY-MM-DD)', '民族', '政治面貌',
    '婚姻状况', '学历', '毕业院校', '专业', '手机号', '邮箱',
    '部门*', '岗位', '岗位级别', '职级',
    '是否有私家车(是/否)', '车牌号', '是否住宿(是/否)', '住宿开始日期(YYYY-MM-DD)',
    '是否缴纳团险(是/否)', '是否签订合同(是/否)',
    '入职日期(YYYY-MM-DD)', '基本薪资', '现住址', '户籍地址',
  ];
  const example1 = ['张三', '男', '110101199001011234', '1990-01-01', '汉族', '群众', '未婚', '本科', '北京大学', '计算机科学', '13800138001', 'zhangsan@example.com', '技术部', '工程师', 'P5', '中级', '是', '鲁A12345', '否', '', '是', '是', '2026-01-15', '10000', '北京市海淀区xxx', '北京市东城区xxx'];
  const example2 = ['李四', '女', '310101199501011234', '1995-01-01', '汉族', '团员', '已婚', '硕士', '清华大学', '软件工程', '13800138002', 'lisi@example.com', '销售部', '销售员', 'P4', '初级', '否', '', '是', '2026-02-01', '否', '否', '2026-03-01', '8000', '上海市浦东新区xxx', '上海市黄浦区xxx'];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, example1, example2]);
  ws['!cols'] = [
    { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 8 }, { wch: 10 },
    { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 22 },
    { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
    { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 20 },
    { wch: 16 }, { wch: 16 },
    { wch: 22 }, { wch: 12 }, { wch: 24 }, { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, '员工导入');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

/* ========= 从 Excel 批量导入员工 ========= */
export const importEmployees = async (buffer) => {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws);

  if (!rows.length) {
    throw new AppError('Excel 文件为空', 400);
  }

  // 获取所有部门，建立 名称→id 映射
  const departments = await prisma.department.findMany();
  const deptNameMap = {};
  departments.forEach((d) => { deptNameMap[d.name] = d.id; });

  const genderMap = { '男': 'MALE', '女': 'FEMALE', 'MALE': 'MALE', 'FEMALE': 'FEMALE' };
  const results = { success: 0, failed: 0, errors: [] };

  // 获取当前最大工号
  const lastEmp = await prisma.employee.findFirst({ orderBy: { employeeNo: 'desc' } });
  let nextNo = lastEmp ? parseInt(lastEmp.employeeNo.replace('XDJ', ''), 10) + 1 : 1;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // Excel 行号（1 是表头）
    try {
      const name = String(row['姓名*'] || row['姓名'] || '').trim();
      const deptName = String(row['部门*'] || row['部门'] || '').trim();

      if (!name) {
        results.errors.push({ row: rowNum, error: '姓名不能为空' });
        results.failed++;
        continue;
      }
      if (!deptName) {
        results.errors.push({ row: rowNum, error: '部门不能为空' });
        results.failed++;
        continue;
      }

      const departmentId = deptNameMap[deptName];
      if (!departmentId) {
        results.errors.push({ row: rowNum, error: `部门「${deptName}」不存在` });
        results.failed++;
        continue;
      }

      const genderRaw = String(row['性别(男/女)'] || row['性别'] || '男').trim();
      const gender = genderMap[genderRaw] || 'MALE';
      const idCard = String(row['身份证号'] || '').trim();

      // 身份证号重复验证
      if (idCard) {
        const existing = await prisma.employee.findFirst({ where: { idCard }, select: { id: true, name: true } });
        if (existing) {
          results.errors.push({ row: rowNum, error: `身份证号「${idCard}」已被员工「${existing.name}」使用` });
          results.failed++;
          continue;
        }
      }
      const birthdayRaw = String(row['出生日期(YYYY-MM-DD)'] || row['出生日期'] || '').trim();
      const ethnicity = String(row['民族'] || '').trim();
      const politicalStatus = String(row['政治面貌'] || '').trim();
      const maritalStatus = String(row['婚姻状况'] || '').trim();
      const education = String(row['学历'] || '').trim();
      const school = String(row['毕业院校'] || '').trim();
      const major = String(row['专业'] || '').trim();
      const phone = String(row['手机号'] || '').trim();
      const email = String(row['邮箱'] || '').trim();
      const positionTitle = String(row['岗位'] || '').trim();
      const jobLevel = String(row['岗位级别'] || '').trim();
      const rank = String(row['职级'] || '').trim();
      const hasPrivateCar = String(row['是否有私家车(是/否)'] || row['是否有私家车'] || '否').trim() === '是';
      const carPlate = String(row['车牌号'] || '').trim();
      const isAccommodated = String(row['是否住宿(是/否)'] || row['是否住宿'] || '否').trim() === '是';
      const accommodationStartDateRaw = String(row['住宿开始日期(YYYY-MM-DD)'] || row['住宿开始日期'] || '').trim();
      const hasGroupInsurance = String(row['是否缴纳团险(是/否)'] || row['是否缴纳团险'] || '否').trim() === '是';
      const hasSignedContract = String(row['是否签订合同(是/否)'] || row['是否签订合同'] || '否').trim() === '是';
      const hireDateRaw = String(row['入职日期(YYYY-MM-DD)'] || row['入职日期'] || '').trim();
      const baseSalary = Number(row['基本薪资'] || 0) || 0;
      const currentAddress = String(row['现住址'] || '').trim();
      const permanentAddress = String(row['户籍地址'] || '').trim();

      let hireDate = new Date();
      if (hireDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(hireDateRaw)) {
        hireDate = new Date(hireDateRaw);
      }

      let birthday = null;
      if (birthdayRaw && /^\d{4}-\d{2}-\d{2}$/.test(birthdayRaw)) {
        birthday = new Date(birthdayRaw);
      }

      let accommodationStartDate = null;
      if (accommodationStartDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(accommodationStartDateRaw)) {
        accommodationStartDate = new Date(accommodationStartDateRaw);
      }

      const employeeNo = `XDJ${String(nextNo).padStart(6, '0')}`;
      nextNo++;

      await prisma.employee.create({
        data: {
          employeeNo,
          name,
          gender,
          idCard,
          birthday,
          ethnicity,
          politicalStatus,
          maritalStatus,
          education,
          school,
          major,
          phone,
          email,
          positionTitle,
          jobLevel,
          rank,
          hasPrivateCar,
          carPlate,
          isAccommodated,
          accommodationStartDate,
          hasGroupInsurance,
          hasSignedContract,
          status: 'ACTIVE',
          departmentId,
          hireDate,
          baseSalary,
          currentAddress,
          permanentAddress,
        },
      });

      // 自动创建登录账号
      const accountEmail = email || `${employeeNo}@hrms.internal`;
      const existingUser = await prisma.user.findUnique({ where: { email: accountEmail } });
      if (!existingUser) {
        const importPassword = idCard ? idCard.slice(-6) : '123456';
        const hashedPassword = await bcrypt.hash(importPassword, 10);
        await prisma.user.create({
          data: {
            email: accountEmail,
            password: hashedPassword,
            role: 'EMPLOYEE',
            employee: { connect: { employeeNo } },
          },
        });
      }

      results.success++;
    } catch (err) {
      results.errors.push({ row: rowNum, error: err.message });
      results.failed++;
    }
  }

  return results;
};
