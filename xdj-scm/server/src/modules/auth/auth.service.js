import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../shared/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'xdj-scm-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// 登录
export async function login(username, password) {
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      employee: {
        include: {
          department: true,
        },
      },
    },
  });

  if (!user) {
    throw { status: 401, message: '用户名或密码错误' };
  }

  if (user.status !== 'ACTIVE') {
    throw { status: 403, message: '账号已被禁用，请联系管理员' };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw { status: 401, message: '用户名或密码错误' };
  }

  // 更新最后登录时间
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  const token = jwt.sign(
    { userId: user.id, role: user.role, username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      employee: user.employee
        ? {
            id: user.employee.id,
            empNo: user.employee.empNo,
            name: user.employee.name,
            phone: user.employee.phone,
            email: user.employee.email,
            departmentId: user.employee.departmentId,
            department: user.employee.department
              ? { id: user.employee.department.id, name: user.employee.department.name }
              : null,
            position: user.employee.position,
          }
        : null,
    },
  };
}

// 修改密码
export async function changePassword(userId, oldPassword, newPassword) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw { status: 404, message: '用户不存在' };

  const valid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!valid) throw { status: 400, message: '原密码错误' };

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hash },
  });

  return { success: true };
}

// 获取当前用户信息
export async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      employee: {
        include: {
          department: true,
        },
      },
    },
  });

  if (!user) throw { status: 404, message: '用户不存在' };

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    status: user.status,
    lastLogin: user.lastLogin,
    employee: user.employee
      ? {
          id: user.employee.id,
          empNo: user.employee.empNo,
          name: user.employee.name,
          phone: user.employee.phone,
          email: user.employee.email,
          position: user.employee.position,
          departmentId: user.employee.departmentId,
          department: user.employee.department
            ? { id: user.employee.department.id, name: user.employee.department.name }
            : null,
        }
      : null,
  };
}

// 获取所有用户列表（管理员用）
export async function getUserList({ page = 1, pageSize = 20, keyword = '', role = '', status = '' }) {
  page = Number(page); pageSize = Number(pageSize);
  const where = {};
  if (keyword) {
    where.OR = [
      { username: { contains: keyword } },
      { employee: { name: { contains: keyword } } },
      { employee: { empNo: { contains: keyword } } },
    ];
  }
  if (role) where.role = role;
  if (status) where.status = status;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        employee: { include: { department: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    list: users.map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role,
      status: u.status,
      lastLogin: u.lastLogin,
      employee: u.employee
        ? {
            id: u.employee.id,
            name: u.employee.name,
            empNo: u.employee.empNo,
            department: u.employee.department?.name,
          }
        : null,
    })),
    total,
    page,
    pageSize,
  };
}

// 创建用户
export async function createUser({ username, password, employeeId, role }) {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) throw { status: 400, message: '用户名已存在' };

  const hash = await bcrypt.hash(password || '123456', 10);

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: hash,
      employeeId: employeeId || null,
      role: role || 'EMPLOYEE',
    },
  });

  return { id: user.id, username: user.username, role: user.role };
}

// 更新用户
export async function updateUser(id, data) {
  const updateData = {};
  if (data.role) updateData.role = data.role;
  if (data.status) updateData.status = data.status;
  if (data.employeeId !== undefined) updateData.employeeId = data.employeeId || null;
  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, 10);
  }

  return prisma.user.update({ where: { id }, data: updateData });
}

// 重置密码
export async function resetPassword(id) {
  const hash = await bcrypt.hash('123456', 10);
  await prisma.user.update({
    where: { id },
    data: { passwordHash: hash },
  });
  return { success: true, message: '密码已重置为 123456' };
}
