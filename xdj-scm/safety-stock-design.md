# SCM 供应链菌菇品类安全库存管理系统设计方案

## 一、系统架构概览

```
┌─────────────────────────────────────────────────────┐
│                   前端配置界面                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐│
│  │库存标准配置│ │波动系数管理│ │库存监控看板│ │预警推送  ││
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘│
├─────────────────────────────────────────────────────┤
│                   后端服务层                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │库存规则引擎│ │定时计算任务│ │预警服务   │            │
│  └──────────┘ └──────────┘ └──────────┘            │
├─────────────────────────────────────────────────────┤
│                      DB 层                           │
│  ┌────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │Material│ │StockStandard│ │StockLevel │ │StockAlert│ │
│  │(品类属性)│ │(库存标准)   │ │(水位快照) │ │(预警记录) │ │
│  └────────┘ └──────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────────────────────────────┘
```

## 二、新增数据模型

### 2.1 Material 表新增字段（品类属性）

```prisma
model Material {
  // ... 现有字段 ...

  // ── 安全库存基础参数 ──
  stockCategory     String?      // A/B/C/D 品类分级，对应 A类鲜菌/B类珍稀/C类预制/D类耗材
  shelfLifeDays     Int?         // 保质期天数（如鲜菌 3-7 天）
  procurementDays   Int?         // 采购提前期天数（下单→入库完整周期）
  maxStorageDays    Int?         // 品类最大存储天数（取保质期 60%）
  approxVolumePerUnit Decimal?   // 单位体积 m³（已有字段）
  approxWeightPerUnit Decimal?   // 单位重量 kg（已有字段）
}
```

### 2.2 新增 StockStandard 表（库存标准配置）

存储每种物料在不同仓库下的安全/预警/最高库存标准，支持定期修订。

```prisma
model StockStandard {
  id              String   @id @default(cuid())
  materialId      String   // 物料ID
  warehouseId     String   // 仓库ID
  // 日均需求量
  dailySales      Decimal? @db.Decimal(10, 2)  // 日均销量（近30天平均）
  // 三个水位
  safetyStock     Decimal  @db.Decimal(10, 2)  // 安全库存（最低）
  warningStock    Decimal  @db.Decimal(10, 2)  // 预警库存（= 安全 × 1.8）
  maxStock        Decimal  @db.Decimal(10, 2)  // 最高库存
  // 计算参数
  fluctuationCoef Decimal  @default(1.0) @db.Decimal(3, 1) // 波动调节系数（1.0/1.3/1.6/2.0）
  // 特殊调整标记
  isExternalWarehouse  Boolean @default(false) // 是否外仓
  transferAvailable    Boolean @default(false) // 是否有调拨渠道
  adjustReason     String?      // 调整原因备注
  seasonType       String?      // 当前季节档位: NORMAL/PROMOTION/PEAK/EXTREME
  // 修订记录
  lastRevisedAt    DateTime @default(now())  // 最后修订时间
  revisedBy        String?      // 修订人
  nextReviewDate   DateTime?    // 下次复核日期
  // 版本
  version          Int      @default(1)       // 版本号，每年修订递增
  year             Int                       // 适用年份
  status           String   @default("ACTIVE")

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  material     Material  @relation(fields: [materialId], references: [id])
  warehouse    Warehouse @relation(fields: [warehouseId], references: [id])

  @@unique([materialId, warehouseId, year, version])
  @@index([materialId])
  @@index([warehouseId])
  @@map("stock_standards")
}
```

### 2.3 新增 StockLevel 表（库存水位快照）

每日定时任务生成，记录当天各物料在各仓库的水位状态，用于监控看板。

```prisma
model StockLevel {
  id              String   @id @default(cuid())
  materialId      String
  warehouseId     String
  snapshotDate    DateTime // 快照日期
  // 实时数据
  currentStock    Decimal  @db.Decimal(10, 2)  // 当前库存
  // 标准水位
  safetyStock     Decimal  @db.Decimal(10, 2)  // 安全库存标准
  warningStock    Decimal  @db.Decimal(10, 2)  // 预警库存标准
  maxStock        Decimal  @db.Decimal(10, 2)  // 最高库存标准
  // 水位状态
  levelStatus     String   // 状态: SAFE/WARNING/DANGER/OVERSTOCK
  // 距安全线差距
  gapToSafety     Decimal? @db.Decimal(10, 2)  // 距安全库存差（负值=缺货风险）
  gapToMax        Decimal? @db.Decimal(10, 2)  // 距最高库存差（负值=超储）

  createdAt       DateTime @default(now())

  material     Material  @relation(fields: [materialId], references: [id])
  warehouse    Warehouse @relation(fields: [warehouseId], references: [id])

  @@unique([materialId, warehouseId, snapshotDate])
  @@index([snapshotDate])
  @@index([levelStatus])
  @@map("stock_levels")
}
```

### 2.4 新增 StockAlert 表（预警记录）

记录每次触发预警的详情和处置过程。

```prisma
model StockAlert {
  id              String   @id @default(cuid())
  materialId      String
  warehouseId     String
  alertType       String   // 预警类型: LOWER_THAN_SAFETY(红)/REACH_WARNING(黄)/OVER_MAX(橙)
  alertLevel      String   // RED / YELLOW / ORANGE
  currentStock    Decimal  @db.Decimal(10, 2)
  thresholdStock  Decimal  @db.Decimal(10, 2)  // 触发阈值
  gap             Decimal  @db.Decimal(10, 2)  // 差值
  status          String   @default("ACTIVE")  // ACTIVE/PROCESSING/RESOLVED/ACKNOWLEDGED
  handledBy       String?   // 处理人
  handledAt       DateTime? // 处理时间
  handleNote      String?   // 处理备注
  resolvedAt      DateTime? // 解决时间

  createdAt       DateTime @default(now())

  material     Material  @relation(fields: [materialId], references: [id])
  warehouse    Warehouse @relation(fields: [warehouseId], references: [id])

  @@index([status])
  @@index([alertLevel])
  @@map("stock_alerts")
}
```

### 2.5 新增 SeasonConfig 表（波动系数档位配置）

```prisma
model SeasonConfig {
  id              String   @id @default(cuid())
  name            String   // 档位名称: 常规淡季/促销旺季/节假日旺季/极端行情
  code            String   @unique  // NORMAL/PROMOTION/PEAK/EXTREME
  coefficient    Decimal  @db.Decimal(3, 1)  // 波动系数 1.0/1.3/1.6/2.0
  description    String?
  isActive       Boolean  @default(true)
  sortOrder      Int      @default(0)

  createdAt      DateTime @default(now())
  @@map("season_configs")
}
```

## 三、核心算法引擎

### 3.1 安全库存计算

```
计算输入:
  material: { stockCategory, shelfLifeDays, procurementDays, maxStorageDays }
  dailySales: 近30天平均出库销量
  coef:       波动调节系数
  isExternal: 是否外仓
  transferAvailable: 是否有调拨能力

计算流程:
  1. 基础安全库存 = dailySales × procurementDays × coef
  2. 品类特殊规则:
      A类: 安全库存 = dailySales × 1~2天（procurementDays带入实际天数）
      B类: 安全库存 = 近15天日均 × 3天（鲜品）/ 日均 × 7天（冻品）
      D类: 安全库存 = 15天使用量
  3. 外仓调整:
      调拨<24h:  安全库存 × 0.8
      调拨>3天:  安全库存 × 1.3
      单仓周销<50: 安全库存 = 0（以销定采）
  4. 最终结果:
     warningStock = 安全库存 × 1.8
     maxStock = dailySales × maxStorageDays
     特殊调整: 夏季高温 maxStock × 0.8
```

### 3.2 水位判定

```
levelStatus:
  currentStock < safetyStock   → DANGER  (红色预警)
  safetyStock ≤ currentStock < warningStock  → WARNING (黄色提醒)
  warningStock ≤ currentStock ≤ maxStock     → SAFE    (安全)
  currentStock > maxStock      → OVERSTOCK     (橙色管控)
```

### 3.3 定时任务调度

| 任务 | 频率 | 时间 |
|------|------|------|
| A类鲜菌每日快照+预警 | 每日 | 08:00 |
| B/C类菌菇快照+预警 | 每周一 | 08:00 |
| D类耗材快照+预警 | 每月1日 | 08:00 |
| 库存标准年度修订提醒 | 每年12月1日 | 09:00 |

## 四、前端功能模块

### 4.1 库存标准配置页

路径: `/inventory/safety-stock-config`

**功能**:
- 按品类筛选（A/B/C/D）
- 按仓库筛选（总部仓/外仓）
- 列表展示：物料名、仓库、品类、日均销量、安全/预警/最高库存、波动系数、上次修订时间
- 编辑弹窗：可手动调整三个水位、波动系数、特殊调整标记、下次复核日期
- 批量导入：Excel 导入库存标准
- 年度修订：一键生成下一年度版本（复制当年数据，标记待审核）

### 4.2 库存监控看板

路径: `/inventory/safety-stock-dashboard`

**功能**:
- 统计卡片：红色预警数 / 黄色提醒数 / 橙色超储数 / 安全数
- 按仓库/品类切换
- 预警列表：物料名、仓库、当前水位、安全水位、差值、状态、操作
- 水位进度条：可视化当前库存占最高库存比例
- 处置按钮：确认/处理，联动 StockAlert 表状态变更

### 4.3 预警推送

| 触发条件 | 动作 |
|----------|------|
| 低于安全库存（红） | 消息推送给计划专员 + 采购部；弹窗提示限制大额临时订单 |
| 达预警库存（黄） | 消息推送给计划专员，启动采购流程 |
| 超最高库存（橙） | 消息推送给计划 + 国内贸易部；禁用该物料新增采购订单 |

### 4.4 波动系数管理（管理员专用）

路径: `/inventory/season-config`

四档预设（NORMAL/PROMOTION/PEAK/EXTREME），管理员可切换当前生效档位，或批量设置所有物料。

## 五、与现有模块的联动

| 联动点 | 说明 |
|--------|------|
| **采购计划** | 当预警提醒触发后，`智能建议`模块自动推送采购需求；超储时自动禁用该物料的新增采购单 |
| **销售订单** | 低于安全库存时，新增订单弹窗提示"当前库存紧张，确认下单？" |
| **仓库管理** | 每个仓库页面显示该仓各物料实时水位 |
| **入库/出库** | 每一笔出入库后，异步更新 `StockLevel` 表水位快照 |
| **库存盘点** | 盘点后强制更新对应物料的 `safetyStock` 基准 |

## 六、实施路线

| 阶段 | 内容 | 优先级 |
|------|------|--------|
| **P0-1** | Schema变更 + StockStandard/SeasonConfig CRUD + 配置页面 | 🔴 |
| **P0-2** | 安全库存计算引擎 + 定时快照任务 + StockLevel 表 | 🔴 |
| **P0-3** | 监控看板 + 预警记录 + 消息推送 | 🟡 |
| **P1** | 与采购计划/销售订单联动 | 🟢 |

## 七、关键边界情况处理

1. **无销售记录的新品**：`dailySales = 0` → 手动设置预估日销量，安全库存 = 预估 × 采购周期 × 1.3（默认偏高防缺货）
2. **A类鲜菌季节切换**：夏季 `maxStock × 0.8`，冬季恢复；由定时任务按日期自动判断
3. **异地外仓无调拨渠道**：自动标记 `transferAvailable = false`，所有标准上浮 30%
4. **B类无固定客户**：`safetyStock = 0`，系统标记为"以销定采"
5. **同一物料多仓库**：每个物料+仓库组合独立一条 StockStandard 记录
6. **年度修订**：12月复制当前生效标准为新版本 draft，需人工确认后启用
