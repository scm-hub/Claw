import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

const generateToken = (user) => {
  return jwt.sign(
    { userId: user.id, employeeId: user.employee?.id || null, role: user.role, email: user.email, departmentId: user.employee?.departmentId || null },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

export const login = async (identifier, password) => {
  // 支持工号、手机号、邮箱三种方式登录
  let user = null;

  // 1. 先尝试邮箱直接查 User 表
  user = await prisma.user.findUnique({
    where: { email: identifier },
    include: { employee: { include: { department: { select: { id: true, name: true } } } } },
  });

  // 2. 如果没找到，尝试通过员工工号或手机号找到关联用户
  if (!user) {
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { employeeNo: identifier },
          { phone: identifier },
        ],
      },
      include: { user: true },
    });

    if (employee?.user) {
      user = await prisma.user.findUnique({
        where: { id: employee.user.id },
        include: { employee: { include: { department: { select: { id: true, name: true } } } } },
      });
    }
  }

  if (!user) {
    throw new Error('账号不存在，请检查工号、手机号或邮箱');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('密码错误');
  }

  const token = generateToken(user);
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      employee: user.employee
        ? {
            id: user.employee.id,
            globalId: user.employee.globalId,
            name: user.employee.name,
            employeeNo: user.employee.employeeNo,
            email: user.employee.email,
            phone: user.employee.phone,
            positionTitle: user.employee.positionTitle,
            positionId: user.employee.positionId,
            departmentId: user.employee.departmentId,
            departmentName: user.employee.department?.name || '',
            status: user.employee.status,
          }
        : null,
    },
  };
};

export const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      employee: {
        include: { department: true },
      },
    },
  });
  if (!user) throw new Error('用户不存在');
  const { password, ...userInfo } = user;
  return userInfo;
};
