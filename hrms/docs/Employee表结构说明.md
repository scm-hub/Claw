# 人力资源管理系统 - 员工信息表（Employee）结构

> 数据库：MySQL hrms · 生成时间：2026-06-04

## 一、字段明细

| # | 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|--------|------|------|--------|------|
| 1 | id | String (cuid) | ✅ | 自动生成 | 主键 |
| 2 | employeeNo | String | ✅ | — | 工号（唯一） |
| 3 | name | String | ✅ | — | 姓名 |
| 4 | gender | String | ❌ | MALE | 性别（MALE=男, FEMALE=女, OTHER=其他） |
| 5 | idCard | String | ❌ | "" | 身份证号（18位） |
| 6 | birthday | DateTime? | ❌ | null | 出生日期 |
| 7 | ethnicity | String | ❌ | "" | 民族 |
| 8 | politicalStatus | String | ❌ | "" | 政治面貌 |
| 9 | maritalStatus | String | ❌ | "" | 婚姻状况 |
| 10 | education | String | ❌ | "" | 学历 |
| 11 | school | String | ❌ | "" | 毕业院校 |
| 12 | major | String | ❌ | "" | 专业 |
| 13 | phone | String | ❌ | "" | 手机号 |
| 14 | email | String | ❌ | "" | 邮箱 |
| 15 | emergencyContact | String | ❌ | "" | 紧急联系人 |
| 16 | emergencyPhone | String | ❌ | "" | 紧急联系电话 |
| 17 | currentAddress | String | ❌ | "" | 现住址 |
| 18 | permanentAddress | String | ❌ | "" | 户籍地址 |
| 19 | position | String | ❌ | "" | 职位 |
| 20 | status | String | ❌ | ACTIVE | 在职状态（ACTIVE=在职, INACTIVE=停职, RESIGNED=离职） |
| 21 | hireDate | DateTime | ✅ | — | 入职日期 |
| 22 | leaveDate | DateTime? | ❌ | null | 离职日期 |
| 23 | departmentId | String | ✅ | — | 所属部门ID（外键 → Department.id） |
| 24 | baseSalary | Float | ❌ | 0 | 基本工资 |
| 25 | createdAt | DateTime | ❌ | now() | 创建时间 |
| 26 | updatedAt | DateTime | ❌ | 自动更新 | 更新时间 |

## 二、字段分类

### 基本信息板块
- employeeNo（工号）、name（姓名）、gender（性别）、idCard（身份证号）

### 个人信息板块
- birthday（出生日期）、ethnicity（民族）、politicalStatus（政治面貌）、maritalStatus（婚姻状况）

### 教育信息板块
- education（学历）、school（毕业院校）、major（专业）

### 联系信息板块
- phone（手机号）、email（邮箱）、emergencyContact（紧急联系人）、emergencyPhone（紧急联系电话）、currentAddress（现住址）、permanentAddress（户籍地址）

### 工作信息板块
- position（职位）、status（在职状态）、hireDate（入职日期）、leaveDate（离职日期）、departmentId（所属部门）、baseSalary（基本工资）

## 三、关联关系

| 关联名 | 目标表 | 关系类型 | 说明 |
|--------|--------|----------|------|
| department | Department | 多对一 | 所属部门（外键：departmentId） |
| managedDept | Department | 一对一 | 担任负责人的部门 |
| user | User | 一对一 | 关联系统登录账号（User.employeeId） |
| attendances | Attendance | 一对多 | 考勤汇总记录 |
| clockRecords | ClockRecord | 一对多 | 每次打卡明细 |
| leaves | Leave | 一对多 | 请假记录 |
| approvedLeaves | Leave | 一对多 | 作为审批人的请假记录 |
| salaries | SalaryRecord | 一对多 | 薪资记录 |
| performances | Performance | 一对多 | 绩效记录 |
| contracts | Contract | 一对多 | 合同记录 |
| trainings | TrainingEnrollment | 一对多 | 培训记录 |

## 四、唯一约束

- `employeeNo` — 工号全局唯一
- `departmentId` — 与 Department 形成外键约束

## 五、枚举值参考

| 字段 | 值 | 中文 |
|------|-----|------|
| gender | MALE | 男 |
| gender | FEMALE | 女 |
| gender | OTHER | 其他 |
| status | ACTIVE | 在职 |
| status | INACTIVE | 停职 |
| status | RESIGNED | 离职 |
