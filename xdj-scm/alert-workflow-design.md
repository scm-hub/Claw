# 库存预警处理流程设计方案

## 一、现有数据基础

### 已可用 ✅

| 能力 | 对应数据 | 状态 |
|------|---------|------|
| 安全/预警/最高库存阈值 | StockStandard | ✅ 已完成 |
| 每日水位快照 | StockLevel | ✅ 已完成 |
| 基础预警记录 | StockAlert（LOW_STOCK/HIGH_STOCK/APPROACHING） | ✅ 已完成 |
| 保质期数据 | Material.shelfLifeDays | ✅ 字段已有 |
| 批次到期日 | Batch.expiryDate | ✅ 字段已有 |
| 在途采购 | PurchaseOrder.status/expectedDate/receiptStatus | ✅ 字段已有 |
| 库存锁定/预留 | StockLock.lockType/qty | ✅ 字段已有 |
| 仓库外仓标记 | Warehouse.isRemote/transferLeadDays | ✅ 已完成 |
| 预警处理流程 | ACTIVE→PROCESSING→RESOLVED/DISMISSED | ✅ 已完成 |

### 需要扩展 ❌

| 缺口 | 说明 |
|------|------|
| StockAlert 缺少字段 | 预警子类型、根因分析、升级标记、关联单据号、核销验证 |
| 无临期效期预警 | 需要从 Batch.expiryDate 反算剩余保质期 |
| 无「特级红」(库存≈0+无在途) | 需结合 inventory + purchase_orders + stock_locks |
| 无积压分级(80% vs 100%) | 当前只有单档 ORANGE |
| 无预警升级机制 | 超时未处理需自动升级 |
| 无核销验证 | 关闭前需二次确认 |
| 无月度复盘 | 需统计报表 |
| 无推送 | 系统消息 + 群通知 |

---

## 二、Schema 变更清单

### 2.1 StockAlert 表扩展

```
新增字段:
  alertSubType   String?    // YELLOW_LOW(缺货黄) / RED_LOW(缺货红) / CRITICAL(特级红)
                             // ORANGE_80(积压橙>80%) / RED_HIGH(深红积压≥100%)
                             // YELLOW_EXPIRY(临期黄50%) / RED_EXPIRY(临期红30%)
  rootCause      String?    // 根因: INSUFFICIENT_PURCHASE|SALES_SURGE|LOGISTICS_DELAY|FORECAST_BIAS|SLOW_MOVING|EXPIRY_LOSS
  inTransitQty   Decimal?   // 在途库存量(触发时的快照)
  lockedQty      Decimal?   // 锁定/预留量
  batchId        String?    // 关联批次(临期预警专用)
  expiryDate     DateTime?  // 到期日(临期预警专用)
  remainingDays  Int?       // 剩余保质期天数(临期预警专用)
  transferOrderId String?   // 关联调拨单号
  purchaseOrderId String?   // 关联采购单号
  assignedTo     String?    // 指派处理人
  escalatedAt    DateTime?  // 升级时间
  escalatedFrom  String?    // 升级来源(原预警ID)
  deadline       DateTime?  // 处理截止时间
  closureVerifiedBy String? // 核销验证人
  closureVerifiedAt DateTime? // 核销验证时间
  attachments    Json?      // 附件/佐证材料[{name, url}]

修改字段:
  alertType → 扩展枚举: LOW_STOCK | HIGH_STOCK | EXPIRY | APPROACHING
  level → 扩展枚举: YELLOW | RED | CRITICAL | ORANGE | DEEP_RED
  resolution → 更名并扩展为处理记录数组(支持多步骤)
```

### 2.2 流程步骤记录表(新)

```
model AlertStep {
  id          String   @id @default(cuid())
  alertId     String
  step        String   // VERIFY(核查) / DISPOSE(处置) / FOLLOW(跟进) / CLOSE(核销)
  action      String   @db.Text  // 处理动作描述
  handlerId   String?  // 处理人
  handlerRole String?  // 处理人角色
  result      String?  @db.Text  // 处理结果
  files       Json?    // 附件
  createdAt   DateTime @default(now())
}
```

---

## 三、引擎升级

### 3.1 在途库存计算

```
inTransitQty = SUM(
  所有 status IN ('ORDERED','SHIPPING','IN_TRANSIT') 的 PurchaseOrderItem.qty
  - 对应 receivedQty
) WHERE purchaseOrder.warehouseId = targetWarehouse
```

### 3.2 临期效期预警算法

```
对每个仓库×物料的活跃批次:
  remainingDays = Batch.expiryDate - today
  shelfLife = Material.shelfLifeDays

  IF remainingDays <= shelfLife × 30%:
    → 生成 RED_EXPIRY 预警，等级=RED
  ELSE IF remainingDays <= shelfLife × 50%:
    → 生成 YELLOW_EXPIRY 预警，等级=RED
```

### 3.3 缺货预警分级升级

```
原 YELLOW (库存≤预警库存): → alertSubType='YELLOW_LOW', 截止时间=24h
原 RED (库存<安全库存):   → alertSubType='RED_LOW', 截止时间=1h

新增 CRITICAL (库存≤0 且 inTransitQty=0):
  → level='CRITICAL', deadline=now()
```

### 3.4 积压预警分级

```
原 ORANGE 拆为两档:
  库存 ≥ 最高库存 × 100%: level='DEEP_RED', deadline=3天
  库存 ≥ 最高库存 × 80%:  level='ORANGE', 不设硬性截止
```

### 3.5 预警升级规则

```
定时任务（每小时检查一次）:
  对 status IN ('ACTIVE','PROCESSING') 的预警:
    IF now() > deadline AND escalatedAt IS NULL:
      → 创建升级预警记录(escalatedFrom=原ID)
      → 等级提升一档
      → assignedTo 改为上级角色
```

---

## 四、前后端功能清单

### 4.1 后端新增 API

| 接口 | 用途 |
|------|------|
| PUT /stock-alerts/:id/verify | 核查确认（仓库/计划提交核查结果） |
| PUT /stock-alerts/:id/dispose | 处置方案记录 |
| PUT /stock-alerts/:id/transfer | 生成调拨单并关联 |
| PUT /stock-alerts/:id/close-verify | 核销验证 |
| GET /stock-alerts/review?month=2026-07 | 月度复盘汇总 |
| POST /stock-alerts/daily-report | 生成每日预警清单 |

### 4.2 前端页面增强

**StockAlertList 增强**：
- 多维度筛选：预警类型 + 子类型 + 等级 + 仓库 + 状态
- 处理截止倒计时（超时红色闪烁）
- 详情面板：核查→处置→跟进→核销 四步时间线
- 关联单据快速跳转

**StockMonitor 增强**：
- 新增「临期预警」卡片
- 在途库存显示
- 按仓库/品类维度汇总

---

## 五、实施计划

| 阶段 | 内容 | 预估 |
|------|------|------|
| P0-1 | StockAlert 表字段扩展 + Schema 推送 | 数据库 |
| P0-2 | 临期效期预警引擎 + 在途计算 + 分级升级 | 后端 |
| P0-3 | 预警升级定时任务 + 每日清单生成 | 后端 |
| P1-1 | StockAlertList 增强（多步流程 + 时间线） | 前端 |
| P1-2 | StockMonitor 增强（临期+在途） | 前端 |
| P2 | 月度复盘 + 推送机制 | 后端+前端 |

---

## 六、关键决策

| # | 问题 | 建议 |
|---|------|------|
| 1 | 批次数据是否已录入？ | Batch表字段齐全但需确认是否有实际数据 |
| 2 | 推送渠道 | 先做系统消息（Notification表已有），群通知后续 |
| 3 | 预警升级角色 | 用 Portal 角色体系，SUPER_ADMIN/WAREHOUSE_MANAGER/PURCHASE_MANAGER |
| 4 | 月度复盘 | 先做统计报表页，自动分析建议后续 |
