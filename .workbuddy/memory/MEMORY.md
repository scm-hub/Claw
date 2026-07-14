# xdj-scm 项目长期记忆

## ⛔ 数据安全铁律（最高优先级）
- **绝对禁止**对数据库执行任何删除、清空、重置操作。这包括但不限于：
  - `prisma migrate reset --force` ✅ 已禁止
  - `DELETE` / `DROP` / `TRUNCATE` SQL 语句
  - `UPDATE` 批量修改已有数据（除非用户明确指定要修改的具体记录）
- **绝对禁止**删除磁盘上的任何业务文件、日志文件、备份文件
- 仅允许的操作：`SELECT` 查询、`INSERT` 新增、`prisma db push`（仅修改表结构不改数据）、`prisma migrate dev`（仅新增表/字段）
- 违反此规则将导致不可逆的数据丢失，必须**先获得用户明确确认**才能执行任何破坏性操作

## ⛔ 部署发布铁律（最高优先级）
- **所有系统修改（代码、配置、数据库结构变更等）都必须先在测试环境执行**
  - 测试环境：/Users/pukun/WorkBuddy/Claw-test/，端口 +10000，独立数据库
  - 正式环境：/Users/pukun/WorkBuddy/Claw/，标准端口
- **发布到正式环境必须由蒲坤提供单独口令确认**，无口令不得部署到正式环境
- 测试环境验证通过后，需要明确告知蒲坤"测试已验证通过，申请发布正式环境"，等待口令

## 项目概况
- **名称**：xdj-scm（鲜当家供应链管理系统）
- **定位**：食用菌全品类供应链管理系统
- **主体**：杭州鲜当家生物科技
- **数据库**：MySQL `xdj_scm_db`（localhost:3306，密码 Scm@2025!）
- **技术栈**：Node.js + Express + Prisma + MySQL + React + Vite + MUI v6 + Tailwind CSS
- **Node 路径**：/Users/pukun/.workbuddy/binaries/node/versions/22.22.2/bin/node
- **npm cache**：--cache /tmp/npm-cache-xdj
- **进程守护**：pm2（替代裸 node &），安装路径 `/Users/pukun/.workbuddy/binaries/node/workspace/node_modules/pm2`
- **PM2 命令前缀**：`NODE_PATH=/Users/pukun/.workbuddy/binaries/node/workspace/node_modules /Users/pukun/.workbuddy/binaries/node/versions/22.22.2/bin/node .../pm2/bin/pm2`
- **8个 PM2 服务**：portal-server(4001), hrms-server(4002), scm-server(4003), ai-server(4004), mdm-server(4005), workflow-engine(4011), gateway(5174), scm-pc-preview
- **启动脚本**：`start-all-pm2.sh`（替代 `start-all.sh`）

## 服务端口
- Portal 后端：4001
- HRMS 后端：4002
- SCM 后端：4003
- **AI 智能服务后端**：4004
- MDM 主数据后端：4005
- **Workflow 审批引擎后端**：4011
- 统一网关：5174（路径分发：/ → Portal, /scm → SCM, /mobile → 移动端, /hrms → HRMS, /mdm → MDM, /ai → AI服务, /workflow/api → 审批引擎）
- PC 端 Vite Preview：5175（LAN: http://192.168.21.34:5175）
- 移动端 H5 Vite Preview：5176（LAN: http://192.168.21.34:5176）
- **登录方式**：通过 Portal SSO（http://localhost:5174 → 登录 → 点击 SCM 图标），SCM 直接登录已关闭
- Portal 账号：admin@hrms.com / admin123（HRMS 身份源）

## 项目目录
- 根目录：/Users/pukun/WorkBuddy/Claw/xdj-scm/
- 后端：server/
- PC 前端：client/
- 移动端：mobile/
- **Workflow 审批引擎**：/Users/pukun/WorkBuddy/Claw/workflow-engine/server/

## 关键约定
- PC 端 token key：`xdj_token`，移动端 token key：`xdj_m_token`（互不干扰）
- 前端 API 使用相对路径 `/api`，Vite proxy 转发到 localhost:4003
- Vite preview 模式也需配置 proxy（否则 API 不可用）
- MUI v6 的 Timeline 组件需从 @mui/lab 导入
- **成本价算法**：加权平均法（期初→入库→出库→结存→成本价）；salesCostPrice=(期初金额+入库金额)/(期初数量+入库数量)；最终costPrice=加权平均价（不再加费用合计，费用仅记录供参考）
- **销售订单成本价**：combinedCostPrice = costPrice(加权平均价) + lossAmount(最新损耗金额) + feesTotal(启用费用合计)；后端 `/cost-price/latest` 返回 combinedCostPrice
- **指导价算法**：指导价=成本价×(1+指导百分比%)；Material.guidePercent默认30；销售订单毛利率=(售价-成本价)/成本价×100%
- **销售订单库存验证**：编辑模式验证增量（新数量-原数量）vs 可用库存，新增模式验证总量；可用库存的lockedQty已包含当前订单锁的数量
- RBAC 角色：SUPER_ADMIN/HR_ADMIN/HR/SALES_MANAGER/SALES_STAFF/PURCHASE_MANAGER/PURCHASE_STAFF/WAREHOUSE_MANAGER/WAREHOUSE_STAFF/FINANCE_MANAGER/QUALITY_STAFF/LOGISTICS_STAFF/CONTRACT_MANAGER
- **authorize 双重判断**：角色匹配 OR 模块权限匹配；Portal deriveScmRole 按优先级只推导单角色（finance>purchase），但 authorize 通过 MODULE_ROLE_MAP 允许有模块权限的用户操作对应功能（如 FINANCE_MANAGER+有purchase权限→可操作采购功能）；SCM JWT 含 permissions 字段；提示改为中文角色名
- **打印管理**：PrintTemplate 模型（moduleType/templateContent/paperSize/orientation/margins/headerContent/footerContent）；通用组件 PrintDialog + usePrint hook；模板引擎 {{变量}} + {{#数组}}循环
- **统一认证**：SCM 关闭直接登录，只走 Portal SSO；SSO 登录自动创建用户；角色从 SSO 令牌的 `systemRoles.scm` 读取
- **统一权限管理**：Portal 权限管理（可展开分组）下含「用户管理」和「角色管理」两个子模块；角色管理权限配置为三级树状结构（系统→模块→子功能点），不再需要手动配置 SCM/HRMS 角色映射；systemRoles 由后端根据模块权限自动推导；超级管理员 isSystem=true 不可编辑；用户管理数据只读来源于 HRMS 在职员工，不可新增用户
- **HRMS 统一认证**：HRMS 前端跳转 Portal 登录，SSO 读取 systemRoles.hrms；HRMS 系统设置菜单移除（统一到 Portal）；HRMS 菜单按 permissions.hrms 过滤；HRMS /api/auth/login 保留供 Portal 服务端调用（Portal 认证依赖 HRMS login API）
- **Portal DB 新增表**：role、role_permission、user_role（Portal DB: portal_db）
- **SCM 菜单权限过滤**：MainLayout 菜单组绑定 module code，hasModule(user, moduleCode) 检查权限；MODULE_ALIASES 双向别名映射（warehouse→['warehouse','wh'], finance→['finance','fin'], logistics→['logistics','log'], dashboard→['dashboard','dash']）解决 Portal 缩写前缀与 SCM 完整英文名不一致问题
- **采购员下拉数据源**：`/purchaser-users` 接口从 Portal DB 查有 SCM 采购模块权限的用户邮箱，多策略匹配 SCM 用户（email/username/email前缀/empNo/角色兜底），不再返回所有 ACTIVE 用户
- **Portal DB 跨库查询工具**：`xdj-scm/server/src/shared/portalDb.js` — mysql2 连接池，`getScmModuleUserEmails(['purchase'])` 获取有指定 SCM 模块权限的用户邮箱
- **SCM 员工管理与部门管理**：数据来源于综合平台（HRMS），**SCM 端只读不可编辑**。同步方式：1）手动点击"从综合平台同步"按钮触发 `POST /master/sync-from-hrms`（SUPER_ADMIN only）；2）也可直接运行 `node scripts/sync-from-hrms.js`。同步策略：部门按名称匹配（存在更新/不存在创建），员工按工号匹配，同步后清理 HRMS 中已不存在的部门/员工。SSO 登录时按 SCM 本地 employee 数据匹配（globalId/email/empNo）
- **网关**：gateway.js 监听 5174，路径分发：/ → Portal, /scm → SCM, /hrms → HRMS, /mdm → MDM
- **Portal 前端**：vite preview 需配置 preview.proxy（与 server.proxy 分开配置）
- **成本价算法**：加权平均法（期初→入库→出库→损耗→结存→成本价），salesCostPrice=(期初金额+入库金额)÷(期初数量+入库数量)，结存数量=期初+入库-出库-损耗(最新盘点|diffQty|)，成本价=结存金额÷结存数量；CostPriceRecord字段：beginningQty/Price/Amount + inboundQty/Amount + salesCostPrice + outboundQty/Amount + lossQty(最新盘点损耗) + endingQty/Amount + weightedAvgPrice + feesTotal(参考) + costPrice + periodStart/periodEnd
- **StockMovement无unitPrice**：入库单价需通过refId→PurchaseReceiptItem.unitPrice关联获取
- **产品组+规格变体（父子物料）**：MaterialGroup模型(code/name/category/description/status)，Material通过groupId外键关联MaterialGroup（可选，ON DELETE SET NULL）；产品组管理页面MaterialGroupList.jsx，物料管理页面新增产品组筛选和显示；设计原则：每规格独立物料（库存/成本价/批次独立追踪），产品组仅做分组关联

## 开发阶段
- Phase 1：基础数据 + 认证 ✅
- Phase 2：采购管理 + WMS + 批次追溯 ✅
- Phase 3：销售管理 + 财务结算 ✅
- Phase 4：成本引擎 + 物流冷链 + 扫码作业 + 合同/售后/审批 + 数据分析/预警/供应商评估 ✅
- 采购应付 + 发货管理 ✅
- **移动端 H5（P0-3/4/5）✅
- **移动端 App（Capacitor 原生壳）✅**：iOS+Android 原生项目已初始化；角色差异化导航（navConfig.js 13角色→7角色组）；指纹/生物认证登录（@aparajita/capacitor-biometric-auth v10.0.0）；后端新增 /auth/mobile-login 接口绕过 SSO 直接登录；Vite 三模式构建（dev/gw/native）；admin 密码重置为 admin123 供 App 登录
- P1 补全（库龄分析/Excel导入/采购智能建议/客户信用管控）✅
- 统一认证 + 集中权限管理（SCM SSO-only + Portal 统一用户/权限管理）✅
- 成本价算法重写（加权平均法）✅
- **打印管理完善**（状态按钮对齐、适用模块改为二级菜单分组、发货管理接入PrintDialog、预设模板补全、InputLabel裁切修复skill）✅
- **当前阶段**：SCM 采购入库 → 金蝶采购订单+入库单推送（阶段3完成）、SCM销售订单审批流对接完成
- **审批流引擎**：workflow-engine(4011) 已搭建，8个预置模板，Portal前端工作台+流程管理页面已完成，**已支持条件分支节点**
- **FlowTemplate 三级级联**：system→module→businessType，全部中文显示+英文code存储；MODULE_BUSINESS_TYPES 映射22个模块共38种业务类型；后端 /system-modules API 返回含 businessTypes 的级联数据；businessType 是模板唯一键，不需要再加 subModule 层级
- **审批流条件分支**：节点类型 `condition` 支持按表达式（如 `marginRate >= 25`）自动路由；表达式安全求值器仅允许字母数字/比较/逻辑运算符；变量来自子系统提交时传入的 `objectData`；condition 节点不创建审批任务，自动跳过；支���链式条件；Portal 模板编辑器可图形化配置分支规则
- **SCM 销售订单审批流对接**：submit-approval→workflow-engine→callback回SCM；状态增加IN_APPROVAL('审批中')/REJECTED('已拒绝');workflowInstanceId记录审批实例;回调密钥xdj-internal-api-secret-2026
- **采购计划智能建议定时任务**：purchase-plan.scheduler.js，cron 0 6 * * * (Asia/Shanghai)，流程：generateSuggestions→创建父计划(APPROVED)→allocatePlan→按采购员绑定创建子计划(APPROVED+assigneeId)；index.js 注册启动
- **采购计划数据隔离（方案三：混合隔离+部门负责人判断）**：SUPER_ADMIN看全部/无过滤；**PURCHASE_MANAGER：部门负责人看departmentId=自己部门的所有计划，非负责人只看assigneeId=自己的子计划+creatorId=自己的草稿父计划**；PURCHASE_STAFF看assigneeId=自己的子计划+creatorId=自己的草稿父计划；**非采购角色有PurchaserAssignment绑定的：部门负责人(Department.managerId===User.employeeId)看同部门所有子计划，非负责人只看assigneeId=自己的子计划**；无绑定的其他角色返回空数据。`getPlanDataFilter(user)`返回Prisma where条件（async），`hasPlanViewAccess(user)`返回boolean（async），`isPurchaserAssignee(userId)`查PurchaserAssignment表判断绑定（5分钟缓存），`isDepartmentManager(userId)`查Department.managerId===Employee.id（5分钟缓存）
- **子计划departmentId取采购员部门**：分配/转发/定时任务创建子计划时，departmentId取采购员(assigneeId)的employee.departmentId而非继承父计划部门；fallback到父/源计划departmentId防止空值；历史数据已按采购员部门修正
- **采购计划确认流程**：PurchasePlanItem新增unitPrice(Decimal(12,2))/actualQty(Int)字段；PurchasePlan状态新增CONFIRMED；流程：父计划审批→分配子计划(APPROVED)→采购员填写supplierId/unitPrice/actualQty→确认(CONFIRMED)→出现在采购订单新增列表；后端两个路由：PUT /plans/:id/confirm（校验三字段完整+assigneeId=当前用户）和PUT /plans/:id/items（保存明细三字段）；available-plans只查CONFIRMED状态；remainingQty=actualQty-orderedQty
- **SCM→金蝶采购入库推送（阶段3已完成）**：确认入库后异步推送到金蝶
  - **关键F前缀规则**：PUR_PurchaseOrder Save 明细用 `FPOOrderEntry`，STK_InStock Save 明细用 `FInStockEntry`（不用不带F前缀的）
  - **入库单类型**：RKD02_SYS（不要求关联源单），RKD01_SYS 会报「至少要有一行分录是关联生成」
  - **必填字段**：F_VIIH_Base={FNumber:'004'}（收发类别=物料入库）
  - **单位映射**：斤→jin、千克→kg、磅→lb
  - **采购组织**：FPurchaseOrgId={FNumber:'10001'}（山东七河生物科技股份有限公司）
  - **PurchaseReceipt 新增字段**：kingdeeOrderNo/kingdeeInboundNo/kingdeeSyncStatus
  - **适配器方法**：adapter.createPurchaseOrder(params)、adapter.createInboundReceipt(params)（自动Save+Submit+Audit）
  - **Push API不可用**：转换规则 PUR_PurchaseOrder-STK_InStock 未映射 F_VIIH_Base，走直接Save替代

## 用户偏好
- **任务完成后报告剩余积分**：蒲坤要求每次执行完任务后，把剩余积分数发给他

## 待开发
- 方向3：生产部署 + 数据备份（用户未确认）
- 方向4：金蝶云星空 WebAPI 对接（用户未确认）
