# 产品组（MaterialGroup）功能实现 Overview

## 完成内容

### 1. Schema 设计（Task #381）
- 新增 `MaterialGroup` 模型（映射 `material_groups` 表）
  - 字段：id, code, name, category, description, status, createdAt, updatedAt
  - 索引：code, name, category
- Material 新增 `groupId` 外键关联 MaterialGroup（可选，ON DELETE SET NULL）
- 数据库通过手动 SQL 创建表和外键约束，Prisma diff 验证 schema 与 DB 完全同步

### 2. 后端 API（Task #382）
- `/api/master/material-groups` CRUD 5个接口：
  - GET 列表（含 `_count.materials` 统计物料数）
  - GET 详情（含关联物料列表）
  - POST 创建（自动生成编码 MG+YYYYMMDD+3位序号）
  - PUT 更新
  - DELETE 删除（需确认无关联物料）
- 物料列表 API 新增 `groupId` 筛选参数，返回 `group` 关联信息
- 物料创建/更新 API 支持 `groupId` 字段

### 3. 前端产品组管理页面（Task #383）
- `MaterialGroupList.jsx` 新页面：
  - 列表展示（含规格变体数 Chip）
  - 展开行查看关联物料详情（Collapse + 异步加载）
  - 新增/编辑弹窗（名称、分类、描述、状态）
  - 删除确认弹窗（提示需先解除物料关联）
- 菜单注册（"基础数据"→"产品组管理"，排在"产品管理"之前）
- App.jsx 路由注册

### 4. 现有页面适配（Task #384）
- MaterialList.jsx：
  - 新增产品组筛选下拉（Autocomplete）
  - 表格新增"产品组"列（Chip + Tooltip）
  - 编辑弹窗新增"所属产品组"选择
  - 表单默认值加入 groupId
  - colSpan 从14改为15
- PrintTemplateList.jsx：模块列表新增"产品组管理"

### 5. 构建验证（Task #385）
- 前端构建成功
- Prisma client 重新生成
- SCM 后端重启成功，API 正常响应
- Prisma 直接查询验证 MaterialGroup 模型工作正常

## 设计原则
- **每规格独立物料**：库存追踪、成本价、批次追溯全链路独立
- **产品组仅做分组关联**：groupId 可选（null = 独立物料），不破坏现有逻辑
- **ON DELETE SET NULL**：删除产品组时物料自动解除关联，不会阻塞
