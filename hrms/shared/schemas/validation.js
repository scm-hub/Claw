import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('请输入有效邮箱'),
  password: z.string().min(6, '密码至少6位'),
});

export const employeeSchema = z.object({
  name: z.string().min(1, '姓名不能为空'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  phone: z.string().optional(),
  email: z.string().email('请输入有效邮箱').optional().or(z.literal('')),
  position: z.string().optional(),
  departmentId: z.string().min(1, '请选择部门'),
  hireDate: z.string().min(1, '请选择入职日期'),
  baseSalary: z.number().min(0, '工资不能为负').optional(),
});

export const leaveSchema = z.object({
  type: z.enum(['ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'OTHER']),
  startDate: z.string().min(1, '请选择开始日期'),
  endDate: z.string().min(1, '请选择结束日期'),
  reason: z.string().min(1, '请填写请假事由'),
});

export const jobSchema = z.object({
  title: z.string().min(1, '职位名称不能为空'),
  department: z.string().min(1, '请选择部门'),
  location: z.string().optional(),
  type: z.enum(['FULL_TIME', 'PART_TIME', 'INTERNSHIP']),
  salary: z.string().optional(),
  description: z.string().optional(),
});
