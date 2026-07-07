# 培训签到功能实现

## 完成内容
实现了培训当天的扫码/手动签到功能。

## 修改的文件

### 1. Schema (`server/prisma/schema.prisma`)
- `Training` 新增 `signinCode` 字段（唯一签到码）
- `TrainingEnrollment` 新增 `signinTime`（签到时间）和 `signinMethod`（签到方式：QR/MANUAL）

### 2. 后端 Service (`server/src/services/training.service.js`)
- 创建培训时自动生成 8 位随机签到码（`crypto.randomBytes`）
- `signinByCode(signinCode, employeeId, method)` — 通过签到码签到
- `signinByTrainingId(trainingId, employeeId, method)` — 管理员手动签到

### 3. 后端路由 (`server/src/routes/trainings.js`)
- `POST /signin` — 扫码/手动签到（所有用户可用，自动识别当前登录员工）
- `POST /:id/signin` — 管理员手动签到指定员工
- 修复了 `employeeId` 缺失的兜底逻辑

### 4. 前端 (`client/src/pages/training/TrainingList.jsx`)
- **签到二维码**：培训详情弹窗中展示二维码（quickchart.io API）和签到码
- **签到入口**：页面右上角"签到入口"按钮，输入签到码完成签到
- **签到记录**：详情弹窗中显示签到时间、签到方式
- **签到统计**：已签到/未签到人数

## 签到流程
1. 管理员创建培训 → 自动生成签到码（如：A1B2C3D4）
2. 培训现场展示二维码/签到码
3. 员工点击"签到入口"→ 输入签到码 → 完成签到
4. 管理员可查看签到记录

## 关键技术决策
- 二维码使用 `quickchart.io` 免费 API 生成（无需额外 npm 包）
- 签到码为 8 位大写十六进制随机字符串
- 签到后 Enrollment 状态变为 `SIGNED_IN`
