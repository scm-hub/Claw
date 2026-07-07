import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create departments
  const techDept = await prisma.department.create({
    data: { name: '技术部' },
  });
  const hrDept = await prisma.department.create({
    data: { name: '人力资源部' },
  });
  const financeDept = await prisma.department.create({
    data: { name: '财务部' },
  });
  const marketingDept = await prisma.department.create({
    data: { name: '市场部' },
  });
  const productDept = await prisma.department.create({
    data: { name: '产品部' },
  });

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@hrms.com',
      password: adminPassword,
      role: 'SUPER_ADMIN',
    },
  });

  // Create HR user
  const hrPassword = await bcrypt.hash('hr123', 10);
  const hrUser = await prisma.user.create({
    data: {
      email: 'hr@hrms.com',
      password: hrPassword,
      role: 'HR_ADMIN',
    },
  });

  // Create manager user
  const mgrPassword = await bcrypt.hash('mgr123', 10);
  const mgrUser = await prisma.user.create({
    data: {
      email: 'manager@hrms.com',
      password: mgrPassword,
      role: 'MANAGER',
    },
  });

  // Create employees
  const employees = await Promise.all([
    prisma.employee.create({
      data: {
        employeeNo: 'EMP001',
        name: '张三',
        gender: 'MALE',
        phone: '13800000001',
        email: 'zhangsan@hrms.com',
        position: '技术总监',
        status: 'ACTIVE',
        hireDate: new Date('2022-01-15'),
        departmentId: techDept.id,
        user: { connect: { id: adminUser.id } },
        baseSalary: 25000,
      },
    }),
    prisma.employee.create({
      data: {
        employeeNo: 'EMP002',
        name: '李四',
        gender: 'FEMALE',
        phone: '13800000002',
        email: 'lisi@hrms.com',
        position: 'HR经理',
        status: 'ACTIVE',
        hireDate: new Date('2022-03-01'),
        departmentId: hrDept.id,
        user: { connect: { id: hrUser.id } },
        baseSalary: 18000,
      },
    }),
    prisma.employee.create({
      data: {
        employeeNo: 'EMP003',
        name: '王五',
        gender: 'MALE',
        phone: '13800000003',
        email: 'wangwu@hrms.com',
        position: '高级工程师',
        status: 'ACTIVE',
        hireDate: new Date('2022-06-15'),
        departmentId: techDept.id,
        user: { connect: { id: mgrUser.id } },
        baseSalary: 20000,
      },
    }),
    prisma.employee.create({
      data: {
        employeeNo: 'EMP004',
        name: '赵六',
        gender: 'FEMALE',
        phone: '13800000004',
        email: 'zhaoliu@hrms.com',
        position: '财务主管',
        status: 'ACTIVE',
        hireDate: new Date('2023-01-10'),
        departmentId: financeDept.id,
        baseSalary: 16000,
      },
    }),
    prisma.employee.create({
      data: {
        employeeNo: 'EMP005',
        name: '孙七',
        gender: 'MALE',
        phone: '13800000005',
        email: 'sunqi@hrms.com',
        position: '市场专员',
        status: 'ACTIVE',
        hireDate: new Date('2023-04-20'),
        departmentId: marketingDept.id,
        baseSalary: 12000,
      },
    }),
    prisma.employee.create({
      data: {
        employeeNo: 'EMP006',
        name: '周八',
        gender: 'FEMALE',
        phone: '13800000006',
        email: 'zhouba@hrms.com',
        position: '产品经理',
        status: 'ACTIVE',
        hireDate: new Date('2023-08-01'),
        departmentId: productDept.id,
        baseSalary: 18000,
      },
    }),
    prisma.employee.create({
      data: {
        employeeNo: 'EMP007',
        name: '吴九',
        gender: 'MALE',
        phone: '13800000007',
        email: 'wujiu@hrms.com',
        position: '前端工程师',
        status: 'ACTIVE',
        hireDate: new Date('2024-01-15'),
        departmentId: techDept.id,
        baseSalary: 15000,
      },
    }),
    prisma.employee.create({
      data: {
        employeeNo: 'EMP008',
        name: '郑十',
        gender: 'FEMALE',
        phone: '13800000008',
        email: 'zhengshi@hrms.com',
        position: 'HR专员',
        status: 'ACTIVE',
        hireDate: new Date('2024-03-01'),
        departmentId: hrDept.id,
        baseSalary: 10000,
      },
    }),
  ]);

  // Set department managers
  await prisma.department.update({
    where: { id: techDept.id },
    data: { managerId: employees[0].id },
  });
  await prisma.department.update({
    where: { id: hrDept.id },
    data: { managerId: employees[1].id },
  });
  await prisma.department.update({
    where: { id: techDept.id },
    data: { managerId: employees[2].id },
  });

  // Create sample attendance records
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 5; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    for (const emp of employees.slice(0, 4)) {
      const clockIn = new Date(date);
      clockIn.setHours(8, Math.floor(Math.random() * 60), 0);
      const clockOut = new Date(date);
      clockOut.setHours(17, Math.floor(Math.random() * 60), 0);
      const isLate = clockIn.getHours() > 9 || (clockIn.getHours() === 9 && clockIn.getMinutes() > 0);

      await prisma.attendance.create({
        data: {
          employeeId: emp.id,
          date,
          clockIn,
          clockOut,
          status: isLate ? 'LATE' : 'NORMAL',
        },
      });
    }
  }

  // Create sample leave
  await prisma.leave.create({
    data: {
      employeeId: employees[4].id,
      type: 'ANNUAL',
      startDate: new Date('2026-06-05'),
      endDate: new Date('2026-06-06'),
      reason: '个人事务',
      status: 'PENDING',
    },
  });

  // Create sample job
  const job = await prisma.job.create({
    data: {
      title: '高级前端工程师',
      department: '技术部',
      location: '北京',
      type: 'FULL_TIME',
      salary: '20K-30K',
      description: '负责公司核心产品前端开发，要求3年以上React开发经验。',
      status: 'OPEN',
    },
  });

  await prisma.candidate.create({
    data: {
      jobId: job.id,
      name: '候选人甲',
      email: 'candidate1@example.com',
      phone: '13900000001',
      stage: 'SCREENING',
    },
  });

  console.log('✅ Seed data created successfully!');
  console.log('📋 Login credentials:');
  console.log('   Super Admin: admin@hrms.com / admin123');
  console.log('   HR Admin:    hr@hrms.com / hr123');
  console.log('   Manager:     manager@hrms.com / mgr123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
