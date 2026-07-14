# SCM → 金蝶采购入库推送 - 阶段3完成报告

## 新增字段（PurchaseReceipt）

| 字段 | 类型 | 说明 |
|------|------|------|
| `kingdee_order_no` | VARCHAR(100) | 金蝶采购订单编号（如 CGDD202607120004） |
| `kingdee_inbound_no` | VARCHAR(100) | 金蝶采购入库单编号（如 CGRK202607120003） |
| `kingdee_sync_status` | VARCHAR(20) | PENDING / SYNCING / SYNCED / FAILED |

## 业务流程

```
SCM 确认入库按钮
  │
  ├─ 1. 执行现有内部逻辑（批次/库存/应付/移动记录）
  │
  ├─ 2. 设置状态 = CONFIRMED, kingdeeSyncStatus = SYNCING
  │
  ├─ 3. 立即返回成功给用户（不等待金蝶）
  │
  └─ 4. 后台异步调用
       ├─ adapter.createPurchaseOrder() → Save+Submit+Audit
       ├─ adapter.createInboundReceipt() → Save+Submit+Audit
       └─ 写回 kingdeeOrderNo + kingdeeInboundNo + SYNCED
           失败则写 FAILED
```

## 前端变化

- ReceiptList 列表新增「金蝶同步」列，带状态标签
- 已同步时会 Tooltip 显示金蝶采购订单号和入库单号

## 测试方法

1. 在 SCM 中创建采购订单 → 生成入库单
2. 点击「确认入库」
3. 查看列表「金蝶同步」列，应显示：同步中 → 已同步
4. 去金蝶系统验证采购订单（CGDD 开头）和入库单（CGRK 开头）均为已审核状态

## 容错机制

- 金蝶不可用时：同步状态显示「失败」，不影响 SCM 入库确认
- 供应商/物料/仓库编码缺失 → 同步失败，记录原因
