import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, Grid, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, FormControl, InputLabel, Select, MenuItem,
  Tooltip, Switch, FormControlLabel, Card, CardContent, Divider, ListSubheader,
} from '@mui/material';
import { Add, Edit, Delete, Print, ToggleOn, ToggleOff, Search, RestartAlt, AutoFixHigh, PowerSettingsNew } from '@mui/icons-material';
import { api } from '../../lib/api';

const MODULE_TYPES = [
  { value: 'master_material_group', label: '产品组管理', group: '基础数据' },
  { value: 'master_material', label: '产品管理', group: '基础数据' },
  { value: 'master_customer', label: '客户管理', group: '基础数据' },
  { value: 'master_supplier', label: '供应商管理', group: '基础数据' },
  { value: 'master_warehouse', label: '仓库管理', group: '基础数据' },
  { value: 'master_employee', label: '员工管理', group: '基础数据' },
  { value: 'master_department', label: '部门管理', group: '基础数据' },
  { value: 'master_purchaser', label: '采购员管理', group: '基础数据' },
  { value: 'master_provider', label: '承运商管理', group: '基础数据' },
  { value: 'purchase_plan', label: '采购计划', group: '采购管理' },
  { value: 'purchase_order', label: '采购订单', group: '采购管理' },
  { value: 'purchase_receipt', label: '采购入库', group: '采购管理' },
  { value: 'sales_plan', label: '销售计划', group: '销售管理' },
  { value: 'sales_order', label: '销售订单', group: '销售管理' },
  { value: 'sales_price', label: '费用登记', group: '销售管理' },
  { value: 'sales_credit', label: '客户信用', group: '销售管理' },
  { value: 'sales_demand', label: '需求汇总', group: '销售管理' },
  { value: 'wms_inventory', label: '库存台账', group: '仓储WMS' },
  { value: 'wms_zone', label: '库区库位', group: '仓储WMS' },
  { value: 'wms_movement', label: '出入库记录', group: '仓储WMS' },
  { value: 'wms_stocktake', label: '盘点管理', group: '仓储WMS' },
  { value: 'trace_batch', label: '批次管理', group: '批次追溯' },
  { value: 'trace_trace', label: '批次追溯', group: '批次追溯' },
  { value: 'trace_age', label: '库龄分析', group: '批次追溯' },
  { value: 'trace_recall', label: '召回管理', group: '批次追溯' },
  { value: 'finance_receivable', label: '应收账款', group: '财务结算' },
  { value: 'finance_payable', label: '应付账款', group: '财务结算' },
  { value: 'finance_invoice', label: '发票管理', group: '财务结算' },
  { value: 'finance_payment', label: '收付款', group: '财务结算' },
  { value: 'cost_config', label: '成本配置', group: '成本引擎' },
  { value: 'cost_standard', label: '标准成本', group: '成本引擎' },
  { value: 'logistics_shipping', label: '发货管理', group: '物流冷链' },
  { value: 'logistics_waybill', label: '运单管理', group: '物流冷链' },
  { value: 'logistics_route', label: '配送路线', group: '物流冷链' },
  { value: 'coldchain_dashboard', label: '温度看板', group: '物流冷链' },
  { value: 'coldchain_sensor', label: '传感器管理', group: '物流冷链' },
  { value: 'barcode', label: '扫码作业', group: '其他' },
  { value: 'contract', label: '合同管理', group: '其他' },
  { value: 'aftersales', label: '售后管理', group: '其他' },
  { value: 'approval', label: '审批管理', group: '其他' },
  { value: 'analytics', label: '数据分析', group: '其他' },
  { value: 'alert', label: '预警中心', group: '其他' },
  { value: 'supplier_eval', label: '供应商评估', group: '其他' },
  { value: 'other', label: '其他', group: '其他' },
];

const MODULE_TYPE_MAP = {};
MODULE_TYPES.forEach(m => MODULE_TYPE_MAP[m.value] = m.label);
// 预设模板可能用到不在 MODULE_TYPES 中的 key，补上映射
MODULE_TYPE_MAP['quality_inspection'] = '质量检验';
MODULE_TYPE_MAP['quality_certificate'] = '合格证';

// 分组信息，用于下拉菜单分组显示
const MODULE_GROUPS = {};
const seenGroups = new Set();
MODULE_TYPES.forEach(m => {
  if (!seenGroups.has(m.group)) {
    seenGroups.add(m.group);
    MODULE_GROUPS[m.group] = [];
  }
  MODULE_GROUPS[m.group].push(m);
});
const GROUP_ORDER = ['基础数据', '采购管理', '销售管理', '仓储WMS', '批次追溯', '财务结算', '成本引擎', '物流冷链', '其他'];

const PAPER_SIZES = ['A4', 'A5', 'B5', 'Custom'];
const ORIENTATIONS = [{ value: 'portrait', label: '纵向' }, { value: 'landscape', label: '横向' }];

// ===== 预设模板库 =====
const PRESET_TEMPLATES = {
  purchase_order: {
    name: '采购订单标准模板',
    moduleType: 'purchase_order',
    paperSize: 'A4',
    orientation: 'portrait',
    margins: { top: 15, right: 15, bottom: 15, left: 15 },
    headerContent: '<div style="text-align:center;font-size:18px;font-weight:bold;color:#2e7d32;border-bottom:2px solid #2e7d32;padding-bottom:8px;">鲜当家生物科技 · 采购订单</div>',
    templateContent: `<table style="width:100%;margin-bottom:16px;font-size:13px;">
  <tr><td style="width:50%"><b>订单编号：</b>{{orderNo}}</td><td style="width:50%"><b>订单日期：</b>{{orderDate}}</td></tr>
  <tr><td><b>供应商：</b>{{supplierName}}</td><td><b>仓库：</b>{{warehouseName}}</td></tr>
  <tr><td><b>采购员：</b>{{purchaserName}}</td><td><b>交货日期：</b>{{deliveryDate}}</td></tr>
  <tr><td colspan="2"><b>备注：</b>{{notes}}</td></tr>
</table>
<table style="width:100%;border-collapse:collapse;font-size:13px;">
  <thead>
    <tr style="background:#e8f5e9;">
      <th style="border:1px solid #ccc;padding:6px;text-align:center;width:40px;">序号</th>
      <th style="border:1px solid #ccc;padding:6px;">物料名称</th>
      <th style="border:1px solid #ccc;padding:6px;">规格</th>
      <th style="border:1px solid #ccc;padding:6px;text-align:center;">单位</th>
      <th style="border:1px solid #ccc;padding:6px;text-align:right;">数量</th>
      <th style="border:1px solid #ccc;padding:6px;text-align:right;">单价(元)</th>
      <th style="border:1px solid #ccc;padding:6px;text-align:right;">金额(元)</th>
      <th style="border:1px solid #ccc;padding:6px;">备注</th>
    </tr>
  </thead>
  <tbody>
    {{#items}}
    <tr>
      <td style="border:1px solid #ccc;padding:6px;text-align:center;">{{index}}</td>
      <td style="border:1px solid #ccc;padding:6px;">{{materialName}}</td>
      <td style="border:1px solid #ccc;padding:6px;">{{spec}}</td>
      <td style="border:1px solid #ccc;padding:6px;text-align:center;">{{unit}}</td>
      <td style="border:1px solid #ccc;padding:6px;text-align:right;">{{qty}}</td>
      <td style="border:1px solid #ccc;padding:6px;text-align:right;">{{unitPrice}}</td>
      <td style="border:1px solid #ccc;padding:6px;text-align:right;">{{amount}}</td>
      <td style="border:1px solid #ccc;padding:6px;">{{remark}}</td>
    </tr>
    {{/items}}
  </tbody>
  <tfoot>
    <tr style="background:#f5f5f5;font-weight:bold;">
      <td colspan="5" style="border:1px solid #ccc;padding:6px;text-align:right;">合计</td>
      <td style="border:1px solid #ccc;padding:6px;"></td>
      <td style="border:1px solid #ccc;padding:6px;text-align:right;">{{totalAmount}}</td>
      <td style="border:1px solid #ccc;padding:6px;"></td>
    </tr>
  </tfoot>
</table>
<div style="margin-top:30px;font-size:13px;">
  <table style="width:100%;">
    <tr><td style="width:33%"><b>制单：</b>_______________</td><td style="width:33%"><b>审核：</b>_______________</td><td style="width:33%"><b>批准：</b>_______________</td></tr>
  </table>
</div>`,
    footerContent: '<div style="text-align:center;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:4px;">第 {{pageNum}} 页 / 共 {{totalPages}} 页 | 鲜当家生物科技供应链管理系统</div>',
  },

  purchase_receipt: {
    name: '入库单标准模板',
    moduleType: 'purchase_receipt',
    paperSize: 'A4',
    orientation: 'portrait',
    margins: { top: 15, right: 15, bottom: 15, left: 15 },
    headerContent: '<div style="text-align:center;font-size:18px;font-weight:bold;color:#1565c0;border-bottom:2px solid #1565c0;padding-bottom:8px;">鲜当家生物科技 · 入库单</div>',
    templateContent: `<table style="width:100%;margin-bottom:16px;font-size:13px;">
  <tr><td style="width:50%"><b>入库单号：</b>{{receiptNo}}</td><td style="width:50%"><b>入库日期：</b>{{receiptDate}}</td></tr>
  <tr><td><b>关联采购单：</b>{{purchaseOrderNo}}</td><td><b>仓库：</b>{{warehouseName}}</td></tr>
  <tr><td><b>供应商：</b>{{supplierName}}</td><td><b>操作员：</b>{{operatorName}}</td></tr>
  <tr><td colspan="2"><b>备注：</b>{{notes}}</td></tr>
</table>
<table style="width:100%;border-collapse:collapse;font-size:13px;">
  <thead>
    <tr style="background:#e3f2fd;">
      <th style="border:1px solid #ccc;padding:6px;text-align:center;width:40px;">序号</th>
      <th style="border:1px solid #ccc;padding:6px;">物料名称</th>
      <th style="border:1px solid #ccc;padding:6px;">规格</th>
      <th style="border:1px solid #ccc;padding:6px;text-align:center;">单位</th>
      <th style="border:1px solid #ccc;padding:6px;text-align:right;">采购数量</th>
      <th style="border:1px solid #ccc;padding:6px;text-align:right;">入库数量</th>
      <th style="border:1px solid #ccc;padding:6px;text-align:right;">单价(元)</th>
      <th style="border:1px solid #ccc;padding:6px;text-align:right;">金额(元)</th>
      <th style="border:1px solid #ccc;padding:6px;">批次号</th>
    </tr>
  </thead>
  <tbody>
    {{#items}}
    <tr>
      <td style="border:1px solid #ccc;padding:6px;text-align:center;">{{index}}</td>
      <td style="border:1px solid #ccc;padding:6px;">{{materialName}}</td>
      <td style="border:1px solid #ccc;padding:6px;">{{spec}}</td>
      <td style="border:1px solid #ccc;padding:6px;text-align:center;">{{unit}}</td>
      <td style="border:1px solid #ccc;padding:6px;text-align:right;">{{purchaseQty}}</td>
      <td style="border:1px solid #ccc;padding:6px;text-align:right;">{{receivedQty}}</td>
      <td style="border:1px solid #ccc;padding:6px;text-align:right;">{{unitPrice}}</td>
      <td style="border:1px solid #ccc;padding:6px;text-align:right;">{{amount}}</td>
      <td style="border:1px solid #ccc;padding:6px;">{{batchNo}}</td>
    </tr>
    {{/items}}
  </tbody>
  <tfoot>
    <tr style="background:#f5f5f5;font-weight:bold;">
      <td colspan="5" style="border:1px solid #ccc;padding:6px;"></td>
      <td style="border:1px solid #ccc;padding:6px;text-align:right;">{{totalReceivedQty}}</td>
      <td style="border:1px solid #ccc;padding:6px;"></td>
      <td style="border:1px solid #ccc;padding:6px;text-align:right;">{{totalAmount}}</td>
      <td style="border:1px solid #ccc;padding:6px;"></td>
    </tr>
  </tfoot>
</table>
<div style="margin-top:30px;font-size:13px;">
  <table style="width:100%;">
    <tr><td style="width:25%"><b>验收：</b>_______________</td><td style="width:25%"><b>复核：</b>_______________</td><td style="width:25%"><b>入库：</b>_______________</td><td style="width:25%"><b>批准：</b>_______________</td></tr>
  </table>
</div>`,
    footerContent: '<div style="text-align:center;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:4px;">第 {{pageNum}} 页 / 共 {{totalPages}} 页 | 鲜当家生物科技供应链管理系统</div>',
  },

  sales_order: {
    name: '销售订单标准模板',
    moduleType: 'sales_order',
    paperSize: 'A4',
    orientation: 'portrait',
    margins: { top: 15, right: 15, bottom: 15, left: 15 },
    headerContent: '<div style="text-align:center;font-size:18px;font-weight:bold;color:#e65100;border-bottom:2px solid #e65100;padding-bottom:8px;">鲜当家生物科技 · 销售订单</div>',
    templateContent: `<table style="width:100%;margin-bottom:16px;font-size:13px;">
  <tr><td style="width:50%"><b>订单编号：</b>{{orderNo}}</td><td style="width:50%"><b>订单日期：</b>{{orderDate}}</td></tr>
  <tr><td><b>客户：</b>{{customerName}}</td><td><b>仓库：</b>{{warehouseName}}</td></tr>
  <tr><td><b>销售员：</b>{{salesStaffName}}</td><td><b>交货日期：</b>{{deliveryDate}}</td></tr>
  <tr><td colspan="2"><b>备注：</b>{{notes}}</td></tr>
</table>
<table style="width:100%;border-collapse:collapse;font-size:13px;">
  <thead>
    <tr style="background:#fff3e0;">
      <th style="border:1px solid #ccc;padding:6px;text-align:center;width:40px;">序号</th>
      <th style="border:1px solid #ccc;padding:6px;">物料名称</th>
      <th style="border:1px solid #ccc;padding:6px;">规格</th>
      <th style="border:1px solid #ccc;padding:6px;text-align:center;">单位</th>
      <th style="border:1px solid #ccc;padding:6px;text-align:right;">数量</th>
      <th style="border:1px solid #ccc;padding:6px;text-align:right;">成本价</th>
      <th style="border:1px solid #ccc;padding:6px;text-align:right;">指导价</th>
      <th style="border:1px solid #ccc;padding:6px;text-align:right;">销售单价</th>
      <th style="border:1px solid #ccc;padding:6px;text-align:right;">金额(元)</th>
      <th style="border:1px solid #ccc;padding:6px;text-align:right;">毛利率</th>
    </tr>
  </thead>
  <tbody>
    {{#items}}
    <tr>
      <td style="border:1px solid #ccc;padding:6px;text-align:center;">{{index}}</td>
      <td style="border:1px solid #ccc;padding:6px;">{{materialName}}</td>
      <td style="border:1px solid #ccc;padding:6px;">{{spec}}</td>
      <td style="border:1px solid #ccc;padding:6px;text-align:center;">{{unit}}</td>
      <td style="border:1px solid #ccc;padding:6px;text-align:right;">{{qty}}</td>
      <td style="border:1px solid #ccc;padding:6px;text-align:right;">{{costPrice}}</td>
      <td style="border:1px solid #ccc;padding:6px;text-align:right;">{{guidePrice}}</td>
      <td style="border:1px solid #ccc;padding:6px;text-align:right;">{{salePrice}}</td>
      <td style="border:1px solid #ccc;padding:6px;text-align:right;">{{amount}}</td>
      <td style="border:1px solid #ccc;padding:6px;text-align:right;">{{marginRate}}%</td>
    </tr>
    {{/items}}
  </tbody>
  <tfoot>
    <tr style="background:#f5f5f5;font-weight:bold;">
      <td colspan="5" style="border:1px solid #ccc;padding:6px;text-align:right;">合计</td>
      <td style="border:1px solid #ccc;padding:6px;"></td>
      <td style="border:1px solid #ccc;padding:6px;"></td>
      <td style="border:1px solid #ccc;padding:6px;"></td>
      <td style="border:1px solid #ccc;padding:6px;text-align:right;">{{totalAmount}}</td>
      <td style="border:1px solid #ccc;padding:6px;"></td>
    </tr>
  </tfoot>
</table>
<div style="margin-top:30px;font-size:13px;">
  <table style="width:100%;">
    <tr><td style="width:33%"><b>制单：</b>_______________</td><td style="width:33%"><b>审核：</b>_______________</td><td style="width:33%"><b>批准：</b>_______________</td></tr>
  </table>
</div>`,
    footerContent: '<div style="text-align:center;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:4px;">第 {{pageNum}} 页 / 共 {{totalPages}} 页 | 鲜当家生物科技供应链管理系统</div>',
  },

  logistics_shipping: {
    name: '发货单标准模板',
    moduleType: 'logistics_shipping',
    paperSize: 'A4',
    orientation: 'portrait',
    margins: { top: 15, right: 15, bottom: 15, left: 15 },
    headerContent: '<div style="text-align:center;font-size:18px;font-weight:bold;color:#7b1fa2;border-bottom:2px solid #7b1fa2;padding-bottom:8px;">鲜当家生物科技 · 发货单</div>',
    templateContent: `<table style="width:100%;margin-bottom:16px;font-size:13px;">
  <tr><td style="width:50%"><b>发货单号：</b>{{shippingNo}}</td><td style="width:50%"><b>发货日期：</b>{{shippingDate}}</td></tr>
  <tr><td><b>关联销售单：</b>{{salesOrderNo}}</td><td><b>仓库：</b>{{warehouseName}}</td></tr>
  <tr><td><b>客户：</b>{{customerName}}</td><td><b>收货地址：</b>{{shippingAddress}}</td></tr>
  <tr><td><b>承运商：</b>{{carrierName}}</td><td><b>联系电话：</b>{{contactPhone}}</td></tr>
  <tr><td colspan="2"><b>备注：</b>{{notes}}</td></tr>
</table>
<table style="width:100%;border-collapse:collapse;font-size:13px;">
  <thead>
    <tr style="background:#f3e5f5;">
      <th style="border:1px solid #ccc;padding:6px;text-align:center;width:40px;">序号</th>
      <th style="border:1px solid #ccc;padding:6px;">物料名称</th>
      <th style="border:1px solid #ccc;padding:6px;">规格</th>
      <th style="border:1px solid #ccc;padding:6px;text-align:center;">单位</th>
      <th style="border:1px solid #ccc;padding:6px;text-align:right;">订单数量</th>
      <th style="border:1px solid #ccc;padding:6px;text-align:right;">发货数量</th>
      <th style="border:1px solid #ccc;padding:6px;">批次号</th>
    </tr>
  </thead>
  <tbody>
    {{#items}}
    <tr>
      <td style="border:1px solid #ccc;padding:6px;text-align:center;">{{index}}</td>
      <td style="border:1px solid #ccc;padding:6px;">{{materialName}}</td>
      <td style="border:1px solid #ccc;padding:6px;">{{spec}}</td>
      <td style="border:1px solid #ccc;padding:6px;text-align:center;">{{unit}}</td>
      <td style="border:1px solid #ccc;padding:6px;text-align:right;">{{orderQty}}</td>
      <td style="border:1px solid #ccc;padding:6px;text-align:right;">{{shippingQty}}</td>
      <td style="border:1px solid #ccc;padding:6px;">{{batchNo}}</td>
    </tr>
    {{/items}}
  </tbody>
</table>
<div style="margin-top:30px;font-size:13px;">
  <table style="width:100%;">
    <tr><td style="width:25%"><b>发货：</b>_______________</td><td style="width:25%"><b>复核：</b>_______________</td><td style="width:25%"><b>收货：</b>_______________</td><td style="width:25%"><b>批准：</b>_______________</td></tr>
  </table>
</div>`,
    footerContent: '<div style="text-align:center;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:4px;">第 {{pageNum}} 页 / 共 {{totalPages}} 页 | 鲜当家生物科技供应链管理系统</div>',
  },

  wms_stocktake: {
    name: '盘点单标准模板',
    moduleType: 'wms_stocktake',
    paperSize: 'A4',
    orientation: 'portrait',
    margins: { top: 15, right: 15, bottom: 15, left: 15 },
    headerContent: '<div style="text-align:center;font-size:18px;font-weight:bold;color:#00695c;border-bottom:2px solid #00695c;padding-bottom:8px;">鲜当家生物科技 · 盘点单</div>',
    templateContent: `<table style="width:100%;margin-bottom:16px;font-size:13px;">
  <tr><td style="width:50%"><b>盘点单号：</b>{{stockTakeNo}}</td><td style="width:50%"><b>盘点日期：</b>{{stockTakeDate}}</td></tr>
  <tr><td><b>仓库：</b>{{warehouseName}}</td><td><b>盘点人：</b>{{operatorName}}</td></tr>
  <tr><td colspan="2"><b>备注：</b>{{notes}}</td></tr>
</table>
<table style="width:100%;border-collapse:collapse;font-size:13px;">
  <thead>
    <tr style="background:#e0f2f1;">
      <th style="border:1px solid #ccc;padding:6px;text-align:center;width:40px;">序号</th>
      <th style="border:1px solid #ccc;padding:6px;">物料名称</th>
      <th style="border:1px solid #ccc;padding:6px;">规格</th>
      <th style="border:1px solid #ccc;padding:6px;text-align:center;">单位</th>
      <th style="border:1px solid #ccc;padding:6px;">库位</th>
      <th style="border:1px solid #ccc;padding:6px;">批次号</th>
      <th style="border:1px solid #ccc;padding:6px;text-align:right;">账面数量</th>
      <th style="border:1px solid #ccc;padding:6px;text-align:right;">实际数量</th>
      <th style="border:1px solid #ccc;padding:6px;text-align:right;">差异</th>
      <th style="border:1px solid #ccc;padding:6px;">差异原因</th>
    </tr>
  </thead>
  <tbody>
    {{#items}}
    <tr>
      <td style="border:1px solid #ccc;padding:6px;text-align:center;">{{index}}</td>
      <td style="border:1px solid #ccc;padding:6px;">{{materialName}}</td>
      <td style="border:1px solid #ccc;padding:6px;">{{spec}}</td>
      <td style="border:1px solid #ccc;padding:6px;text-align:center;">{{unit}}</td>
      <td style="border:1px solid #ccc;padding:6px;">{{location}}</td>
      <td style="border:1px solid #ccc;padding:6px;">{{batchNo}}</td>
      <td style="border:1px solid #ccc;padding:6px;text-align:right;">{{systemQty}}</td>
      <td style="border:1px solid #ccc;padding:6px;text-align:right;">{{actualQty}}</td>
      <td style="border:1px solid #ccc;padding:6px;text-align:right;">{{diffQty}}</td>
      <td style="border:1px solid #ccc;padding:6px;">{{diffReason}}</td>
    </tr>
    {{/items}}
  </tbody>
</table>
<div style="margin-top:30px;font-size:13px;">
  <table style="width:100%;">
    <tr><td style="width:25%"><b>盘点：</b>_______________</td><td style="width:25%"><b>复核：</b>_______________</td><td style="width:25%"><b>主管：</b>_______________</td><td style="width:25%"><b>批准：</b>_______________</td></tr>
  </table>
</div>`,
    footerContent: '<div style="text-align:center;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:4px;">第 {{pageNum}} 页 / 共 {{totalPages}} 页 | 鲜当家生物科技供应链管理系统</div>',
  },

  logistics_waybill: {
    name: '运单标准模板',
    moduleType: 'logistics_waybill',
    paperSize: 'A4',
    orientation: 'portrait',
    margins: { top: 15, right: 15, bottom: 15, left: 15 },
    headerContent: '<div style="text-align:center;font-size:18px;font-weight:bold;color:#283593;border-bottom:2px solid #283593;padding-bottom:8px;">鲜当家生物科技 · 运单</div>',
    templateContent: `<table style="width:100%;margin-bottom:16px;font-size:13px;">
  <tr><td style="width:50%"><b>运单号：</b>{{waybillNo}}</td><td style="width:50%"><b>发货日期：</b>{{shippingDate}}</td></tr>
  <tr><td><b>承运商：</b>{{carrierName}}</td><td><b>车牌号：</b>{{vehicleNo}}</td></tr>
  <tr><td><b>司机：</b>{{driverName}}</td><td><b>联系电话：</b>{{driverPhone}}</td></tr>
  <tr><td><b>发货地址：</b>{{fromAddress}}</td><td><b>收货地址：</b>{{toAddress}}</td></tr>
  <tr><td><b>温度要求：</b>{{tempRange}}</td><td><b>预计到达：</b>{{expectedArrival}}</td></tr>
</table>
<table style="width:100%;border-collapse:collapse;font-size:13px;">
  <thead>
    <tr style="background:#e8eaf6;">
      <th style="border:1px solid #ccc;padding:6px;text-align:center;width:40px;">序号</th>
      <th style="border:1px solid #ccc;padding:6px;">物料名称</th>
      <th style="border:1px solid #ccc;padding:6px;">规格</th>
      <th style="border:1px solid #ccc;padding:6px;text-align:center;">单位</th>
      <th style="border:1px solid #ccc;padding:6px;text-align:right;">数量</th>
      <th style="border:1px solid #ccc;padding:6px;">批次号</th>
      <th style="border:1px solid #ccc;padding:6px;">温度记录</th>
    </tr>
  </thead>
  <tbody>
    {{#items}}
    <tr>
      <td style="border:1px solid #ccc;padding:6px;text-align:center;">{{index}}</td>
      <td style="border:1px solid #ccc;padding:6px;">{{materialName}}</td>
      <td style="border:1px solid #ccc;padding:6px;">{{spec}}</td>
      <td style="border:1px solid #ccc;padding:6px;text-align:center;">{{unit}}</td>
      <td style="border:1px solid #ccc;padding:6px;text-align:right;">{{qty}}</td>
      <td style="border:1px solid #ccc;padding:6px;">{{batchNo}}</td>
      <td style="border:1px solid #ccc;padding:6px;">{{tempRecord}}</td>
    </tr>
    {{/items}}
  </tbody>
</table>
<div style="margin-top:30px;font-size:13px;">
  <table style="width:100%;">
    <tr><td style="width:33%"><b>发货人：</b>_______________</td><td style="width:33%"><b>承运人：</b>_______________</td><td style="width:33%"><b>收货人：</b>_______________</td></tr>
  </table>
</div>`,
    footerContent: '<div style="text-align:center;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:4px;">第 {{pageNum}} 页 / 共 {{totalPages}} 页 | 鲜当家生物科技供应链管理系统</div>',
  },

  quality_inspection: {
    name: '质量检验报告标准模板',
    moduleType: 'quality_inspection',
    paperSize: 'A4',
    orientation: 'portrait',
    margins: { top: 15, right: 15, bottom: 15, left: 15 },
    headerContent: '<div style="text-align:center;font-size:20px;font-weight:bold;color:#333;padding-bottom:8px;">{{reportTitle}}</div>',
    templateContent: `<table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #000;margin-bottom:0;">
  <tr>
    <td style="border:1px solid #000;padding:7px;width:12%;font-weight:bold;background:#f5f5f5;">抽样日期</td>
    <td style="border:1px solid #000;padding:7px;width:16%;">{{sampleDate}}</td>
    <td style="border:1px solid #000;padding:7px;width:10%;font-weight:bold;background:#f5f5f5;">到货日期</td>
    <td style="border:1px solid #000;padding:7px;width:14%;">{{arrivalDate}}</td>
    <td style="border:1px solid #000;padding:7px;width:8%;font-weight:bold;background:#f5f5f5;">规格</td>
    <td style="border:1px solid #000;padding:7px;width:12%;">{{grade}}</td>
    <td style="border:1px solid #000;padding:7px;width:10%;font-weight:bold;background:#f5f5f5;">取样数量</td>
    <td style="border:1px solid #000;padding:7px;">{{sampleQty}}</td>
  </tr>
  <tr>
    <td style="border:1px solid #000;padding:7px;font-weight:bold;background:#f5f5f5;">产品名称</td>
    <td colspan="2" style="border:1px solid #000;padding:7px;">{{productName}}</td>
    <td style="border:1px solid #000;padding:7px;font-weight:bold;background:#f5f5f5;">产品SKU</td>
    <td colspan="2" style="border:1px solid #000;padding:7px;">{{productSku}}</td>
    <td style="border:1px solid #000;padding:7px;font-weight:bold;background:#f5f5f5;">报告日期</td>
    <td style="border:1px solid #000;padding:7px;">{{reportDate}}</td>
  </tr>
  <tr>
    <td style="border:1px solid #000;padding:7px;font-weight:bold;background:#f5f5f5;">检验依据</td>
    <td colspan="7" style="border:1px solid #000;padding:7px;">{{inspectionStandard}}</td>
  </tr>
</table>

<!-- 检验结果标题 -->
<table style="width:100%;border-collapse:collapse;border-left:1px solid #000;border-right:1px solid #000;border-bottom:1px solid #000;font-size:13px;margin-top:-2px;">
  <tr><td style="padding:10px;text-align:center;font-size:16px;font-weight:bold;color:#c62828;letter-spacing:4px;">检 验 结 果</td></tr>
  <tr>
    <td style="border:1px solid #000;padding:0;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#e8eaf6;">
            <th style="border:1px solid #000;padding:7px;text-align:center;width:40px;">序号</th>
            <th style="border:1px solid #000;padding:7px;text-align:center;width:80px;">检验项目</th>
            <th style="border:1px solid #000;padding:7px;text-align:left;">技术要求</th>
            <th style="border:1px solid #000;padding:7px;text-align:center;width:90px;">检验结果</th>
            <th style="border:1px solid #000;padding:7px;text-align:center;width:70px;">单项判定</th>
            <th style="border:1px solid #000;padding:7px;text-align:left;">备注</th>
          </tr>
        </thead>
        <tbody>
          {{#items}}
          <tr>
            <td style="border:1px solid #000;padding:7px;text-align:center;" rowspan="{{rowspan}}">{{index}}</td>
            <td style="border:1px solid #000;padding:7px;text-align:center;" rowspan="{{rowspan}}">{{itemName}}</td>
            <td style="border:1px solid #000;padding:7px;">{{requirement}}</td>
            <td style="border:1px solid #000;padding:7px;text-align:center;">{{result}}</td>
            <td style="border:1px solid #000;padding:7px;text-align:center;" rowspan="{{rowspan}}">{{verdict}}</td>
            <td style="border:1px solid #000;padding:7px;" rowspan="{{rowspan}}">{{remark}}</td>
          </tr>
          {{#subItems}}
          <tr>
            <td style="border:1px solid #000;padding:7px;">{{subRequirement}}</td>
            <td style="border:1px solid #000;padding:7px;text-align:center;">{{subResult}}</td>
          </tr>
          {{/subItems}}
          {{/items}}
        </tbody>
      </table>
    </td>
  </tr>
</table>

<!-- 判定依据 -->
<table style="width:100%;border-collapse:collapse;border-left:1px solid #000;border-right:1px solid #000;font-size:13px;">
  <tr>
    <td style="border:1px solid #000;padding:10px;width:18%;font-weight:bold;background:#f5f5f5;text-align:center;vertical-align:middle;">判定依据</td>
    <td style="border:1px solid #000;padding:10px;text-align:center;">{{judgmentBasis}}</td>
  </tr>
</table>

<!-- 检验结论 -->
<table style="width:100%;border-collapse:collapse;border-left:1px solid #000;border-right:1px solid #000;border-bottom:1px solid #000;font-size:13px;margin-bottom:0;">
  <tr>
    <td style="border:1px solid #000;padding:25px;width:18%;font-weight:bold;background:#f5f5f5;text-align:center;vertical-align:middle;">检验结论</td>
    <td style="border:1px solid #000;padding:25px;text-align:center;font-weight:bold;font-size:14px;">{{conclusion}}</td>
  </tr>
</table>

<div style="margin-top:35px;font-size:13px;display:flex;justify-content:space-between;padding:0 60px;">
  <div>检验员：{{inspectorName}}</div>
  <div>审核人：{{reviewerName}}</div>
</div>`,
    footerContent: '<div style="text-align:center;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:4px;">第 {{pageNum}} 页 / 共 {{totalPages}} 页 | 鲜当家生物科技供应链管理系统</div>',
  },

  quality_certificate: {
    name: '承诺达标合格证标准模板',
    moduleType: 'quality_inspection',
    paperSize: 'A5',
    orientation: 'portrait',
    margins: { top: 20, right: 25, bottom: 20, left: 25 },
    headerContent: '',
    templateContent: `<div style="border:2px solid #000;padding:30px 35px;font-size:14px;font-family:SimSun,'Songti SC',serif;min-height:650px;">
  <div style="text-align:center;font-size:22px;font-weight:bold;letter-spacing:8px;margin-bottom:22px;">承诺达标合格证</div>

  <div style="font-weight:bold;font-size:15px;margin-bottom:12px;">我承诺对生产销售的食用农产品：</div>

  <table style="font-size:14px;line-height:2.4;width:100%;">
    <tr>
      <td><span style="display:inline-block;width:16px;height:16px;border:1.5px solid #333;text-align:center;line-height:14px;font-size:12px;margin-right:6px;">&#9633;</span>不使用禁用农药兽药、停用兽药和非法添加物</td>
    </tr>
    <tr>
      <td><span style="display:inline-block;width:16px;height:16px;border:1.5px solid #333;text-align:center;line-height:14px;font-size:12px;margin-right:6px;">&#9633;</span>常规农药兽药残留不超标</td>
    </tr>
    <tr>
      <td><span style="display:inline-block;width:16px;height:16px;border:1.5px solid #333;text-align:center;line-height:14px;font-size:12px;margin-right:6px;">&#9633;</span>对承诺的真实性负责</td>
    </tr>
  </table>

  <div style="font-weight:bold;font-size:15px;margin:16px 0 10px;">承诺依据：</div>
  <table style="width:100%;font-size:14px;line-height:2.4;" cellspacing="10">
    <tr>
      <td style="width:50%;"><span style="display:inline-block;width:16px;height:16px;border:1.5px solid #333;text-align:center;line-height:14px;font-size:12px;margin-right:6px;">&#9633;</span>委托检测</td>
      <td style="width:50%;"><span style="display:inline-block;width:16px;height:16px;border:1.5px solid #333;text-align:center;line-height:14px;font-size:12px;margin-right:6px;">&#9633;</span>自我检测</td>
    </tr>
    <tr>
      <td><span style="display:inline-block;width:16px;height:16px;border:1.5px solid #333;text-align:center;line-height:14px;font-size:12px;margin-right:6px;">&#9633;</span>内部质量控制</td>
      <td><span style="display:inline-block;width:16px;height:16px;border:1.5px solid #333;text-align:center;line-height:14px;font-size:12px;margin-right:6px;">&#9633;</span>自我承诺</td>
    </tr>
  </table>

  <div style="border-top:1.5px dashed #333;margin:24px 0;"></div>

  <table style="font-size:14px;line-height:2.6; width:100%;">
    <tr>
      <td style="width:50%;">产品名称：{{productName}}</td>
      <td style="width:50%;">数量（重量）：{{quantity}}</td>
    </tr>
    <tr>
      <td colspan="2">产地：{{origin}}</td>
    </tr>
    <tr>
      <td colspan="2">生产者盖章或签名：{{producerSign}}</td>
    </tr>
    <tr>
      <td colspan="2">联系方式：{{contactPhone}}</td>
    </tr>
    <tr>
      <td colspan="2">开具日期：&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;年&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;月&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;日</td>
    </tr>
  </table>
</div>`,
    footerContent: '',
  },
};

const defaultForm = {
  name: '', moduleType: 'purchase_order', templateContent: '',
  paperSize: 'A4', orientation: 'portrait',
  margins: { top: 10, right: 10, bottom: 10, left: 10 },
  headerContent: '', footerContent: '',
};

export default function PrintTemplateList() {
  const [list, setList] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [presetOpen, setPresetOpen] = useState(false);

  const fetchList = async () => {
    try {
      const params = {};
      if (filterModule) params.moduleType = filterModule;
      if (filterStatus) params.status = filterStatus;
      const res = await api.get('/master/print-templates', { params });
      if (res.success) setList(res.data || []);
    } catch (err) {
      setSnack({ open: true, msg: '获取列表失败', sev: 'error' });
    }
  };

  useEffect(() => { fetchList(); }, [filterModule, filterStatus]);

  const filtered = list.filter(t =>
    !keyword || t.name.toLowerCase().includes(keyword.toLowerCase())
  );

  const handleOpen = (data = null) => {
    if (data) {
      setEditId(data.id);
      setForm({
        name: data.name,
        moduleType: data.moduleType,
        templateContent: data.templateContent || '',
        paperSize: data.paperSize || 'A4',
        orientation: data.orientation || 'portrait',
        margins: data.margins || { top: 10, right: 10, bottom: 10, left: 10 },
        headerContent: data.headerContent || '',
        footerContent: data.footerContent || '',
      });
    } else {
      setEditId(null);
      setForm(defaultForm);
    }
    setDialogOpen(true);
  };

  const handleUsePreset = (key) => {
    const preset = PRESET_TEMPLATES[key];
    setEditId(null);
    setForm({ ...preset });
    setPresetOpen(false);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.moduleType) {
      setSnack({ open: true, msg: '模板名称和适用模块必填', sev: 'warning' });
      return;
    }
    try {
      const payload = {
        ...form,
        margins: typeof form.margins === 'string' ? JSON.parse(form.margins) : form.margins,
      };
      if (editId) {
        payload.id = editId;
        await api.put(`/master/print-templates/${editId}`, payload);
      } else {
        await api.post('/master/print-templates', payload);
      }
      setDialogOpen(false);
      setSnack({ open: true, msg: editId ? '更新成功' : '创建成功', sev: 'success' });
      fetchList();
    } catch (err) {
      setSnack({ open: true, msg: err.response?.data?.message || '保存失败', sev: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确认删除该打印模板？')) return;
    try {
      await api.delete(`/master/print-templates/${id}`);
      setSnack({ open: true, msg: '删除成功', sev: 'success' });
      fetchList();
    } catch (err) {
      setSnack({ open: true, msg: '删除失败', sev: 'error' });
    }
  };

  const handleToggle = async (id) => {
    try {
      await api.patch(`/master/print-templates/${id}/toggle`);
      fetchList();
    } catch (err) {
      setSnack({ open: true, msg: '切换状态失败', sev: 'error' });
    }
  };

  const handleDetail = (tpl) => {
    setDetailData(tpl);
    setDetailOpen(true);
  };

  // 预设模板的颜色主题
  const presetColors = {
    purchase_order: '#2e7d32',
    purchase_receipt: '#1565c0',
    sales_order: '#e65100',
    logistics_shipping: '#7b1fa2',
    wms_stocktake: '#00695c',
    logistics_waybill: '#283593',
    quality_inspection: '#c62828',
    quality_certificate: '#2e7d32',
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          <Print sx={{ mr: 1, verticalAlign: 'middle' }} />打印管理
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<AutoFixHigh />} onClick={() => setPresetOpen(true)}>
            从预设模板创建
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>
            新增模板
          </Button>
        </Stack>
      </Stack>

      {/* 筛选条件 */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
        <TextField size="small" placeholder="搜索模板名称" value={keyword}
          onChange={e => setKeyword(e.target.value)}
          sx={{ width: 200 }}
          InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>适用模块</InputLabel>
          <Select label="适用模块" value={filterModule} onChange={e => setFilterModule(e.target.value)}>
            <MenuItem value="">全部</MenuItem>
            {GROUP_ORDER.map(group => [
              <ListSubheader key={`g-${group}`} sx={{ fontWeight: 700, bgcolor: 'grey.100' }}>{group}</ListSubheader>,
              ...MODULE_GROUPS[group].map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)
            ])}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>状态</InputLabel>
          <Select label="状态" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <MenuItem value="">全部</MenuItem>
            <MenuItem value="ACTIVE">启用</MenuItem>
            <MenuItem value="INACTIVE">停用</MenuItem>
          </Select>
        </FormControl>
        <IconButton onClick={() => { setKeyword(''); setFilterModule(''); setFilterStatus(''); }} title="重置">
          <RestartAlt />
        </IconButton>
      </Stack>

      {/* 表格 */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 600 }}>编号</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>模板名称</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>适用模块</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>纸张大小</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>方向</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">状态</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>创建时间</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center"><Typography color="text.secondary" sx={{ py: 3 }}>暂无数据 — 点击「从预设模板创建」快速开始</Typography></TableCell></TableRow>
            ) : filtered.map(tpl => (
              <TableRow key={tpl.id} hover onClick={() => handleDetail(tpl)} sx={{ cursor: 'pointer' }}>
                <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>{tpl.templateNo}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{tpl.name}</TableCell>
                <TableCell><Chip label={MODULE_TYPE_MAP[tpl.moduleType] || tpl.moduleType} size="small" color="primary" variant="outlined" /></TableCell>
                <TableCell>{tpl.paperSize}</TableCell>
                <TableCell>{tpl.orientation === 'portrait' ? '纵向' : '横向'}</TableCell>
                <TableCell align="center">
                  <Chip
                    label={tpl.status === 'ACTIVE' ? '启用' : '停用'}
                    color={tpl.status === 'ACTIVE' ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{new Date(tpl.createdAt).toLocaleString('zh-CN')}</TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={0.5} justifyContent="center">
                    <Button size="small" variant="contained"
                      color={tpl.status === 'ACTIVE' ? 'warning' : 'success'}
                      onClick={(e) => { e.stopPropagation(); handleToggle(tpl.id); }}
                      sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>
                      {tpl.status === 'ACTIVE' ? '停用' : '启用'}
                    </Button>
                    <Button size="small" variant="contained" color="primary"
                      onClick={(e) => { e.stopPropagation(); handleOpen(tpl); }}
                      sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>
                      编辑
                    </Button>
                    <Button size="small" variant="contained" color="error"
                      onClick={(e) => { e.stopPropagation(); handleDelete(tpl.id); }}
                      sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>
                      删除
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ===== 从预设模板创建弹窗 ===== */}
      <Dialog open={presetOpen} onClose={() => setPresetOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          <AutoFixHigh sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />选择预设模板
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            选择一个预设模板作为起点，创建后会自动填充模板内容，你可以在编辑中自由修改。
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(PRESET_TEMPLATES).map(([key, preset]) => (
              <Grid item xs={6} key={key}>
                <Card
                  variant="outlined"
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: presetColors[key] || '#1976d2', boxShadow: `0 2px 8px ${presetColors[key] || '#1976d2'}33` },
                    borderLeft: `4px solid ${presetColors[key] || '#1976d2'}`,
                  }}
                  onClick={() => handleUsePreset(key)}
                >
                  <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <Chip label={MODULE_TYPE_MAP[key] || key} size="small" sx={{ bgcolor: presetColors[key] || '#1976d2', color: 'white', fontWeight: 600 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{preset.name}</Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {preset.paperSize} · {preset.orientation === 'portrait' ? '纵向' : '横向'} · 含页眉页脚 · 含签名栏
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPresetOpen(false)}>取消</Button>
        </DialogActions>
      </Dialog>

      {/* 新增/编辑弹窗 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editId ? '编辑打印模板' : '新增打印模板'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="模板名称" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} required />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small" required>
                <InputLabel>适用模块</InputLabel>
                <Select label="适用模块" value={form.moduleType}
                  onChange={e => setForm({ ...form, moduleType: e.target.value })}>
                  {GROUP_ORDER.map(group => [
                    <ListSubheader key={`g-${group}`} sx={{ fontWeight: 700, bgcolor: 'grey.100' }}>{group}</ListSubheader>,
                    ...MODULE_GROUPS[group].map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)
                  ])}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth size="small">
                <InputLabel>纸张大小</InputLabel>
                <Select label="纸张大小" value={form.paperSize}
                  onChange={e => setForm({ ...form, paperSize: e.target.value })}>
                  {PAPER_SIZES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth size="small">
                <InputLabel>方向</InputLabel>
                <Select label="方向" value={form.orientation}
                  onChange={e => setForm({ ...form, orientation: e.target.value })}>
                  {ORIENTATIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <Stack direction="row" spacing={1}>
                <TextField size="small" label="上边距(mm)" type="number" value={form.margins?.top ?? 10}
                  onChange={e => setForm({ ...form, margins: { ...form.margins, top: Number(e.target.value) } })}
                  inputProps={{ min: 0 }} sx={{ width: '100%' }} />
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>页边距 (mm)</Typography>
              <Stack direction="row" spacing={2}>
                <TextField size="small" label="上" type="number" value={form.margins?.top ?? 10}
                  onChange={e => setForm({ ...form, margins: { ...form.margins, top: Number(e.target.value) } })}
                  inputProps={{ min: 0 }} sx={{ width: 80 }} />
                <TextField size="small" label="右" type="number" value={form.margins?.right ?? 10}
                  onChange={e => setForm({ ...form, margins: { ...form.margins, right: Number(e.target.value) } })}
                  inputProps={{ min: 0 }} sx={{ width: 80 }} />
                <TextField size="small" label="下" type="number" value={form.margins?.bottom ?? 10}
                  onChange={e => setForm({ ...form, margins: { ...form.margins, bottom: Number(e.target.value) } })}
                  inputProps={{ min: 0 }} sx={{ width: 80 }} />
                <TextField size="small" label="左" type="number" value={form.margins?.left ?? 10}
                  onChange={e => setForm({ ...form, margins: { ...form.margins, left: Number(e.target.value) } })}
                  inputProps={{ min: 0 }} sx={{ width: 80 }} />
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>页眉内容（可选，支持HTML）</Typography>
              <TextField fullWidth size="small" multiline minRows={2} value={form.headerContent}
                onChange={e => setForm({ ...form, headerContent: e.target.value })}
                placeholder="例：<div style='text-align:center'>鲜当家生物科技</div>" />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>模板内容（HTML模板，使用 {'{'}{'{'}变量名{'}'}{'}'} 引用数据字段）</Typography>
              <TextField fullWidth size="small" multiline minRows={8} value={form.templateContent}
                onChange={e => setForm({ ...form, templateContent: e.target.value })}
                placeholder={`例：<table>\n  <tr><th>物料名称</th><th>数量</th><th>单价</th><th>金额</th></tr>\n  {{#items}}\n  <tr><td>{{materialName}}</td><td>{{qty}}</td><td>{{unitPrice}}</td><td>{{amount}}</td></tr>\n  {{/items}}\n</table>`}
                sx={{ '& .MuiInputBase-root': { fontFamily: 'monospace', fontSize: '0.85rem' } }} />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>页脚内容（可选，支持HTML）</Typography>
              <TextField fullWidth size="small" multiline minRows={2} value={form.footerContent}
                onChange={e => setForm({ ...form, footerContent: e.target.value })}
                placeholder="例：<div style='text-align:center'>第 {{pageNum}} 页 / 共 {{totalPages}} 页</div>" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* ===== 详情弹窗 ===== */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="lg" fullWidth
        sx={{ '& .MuiDialog-paper': { width: '90vw', maxWidth: '90vw' } }}>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span><Print sx={{ mr: 1, verticalAlign: 'middle' }} />模板详情 — {detailData?.templateNo}</span>
          <Stack direction="row" spacing={1}>
            <Chip label={detailData?.status === 'ACTIVE' ? '启用' : '停用'} color={detailData?.status === 'ACTIVE' ? 'success' : 'default'} size="small" />
            <Button size="small" variant="outlined" startIcon={<Edit />} onClick={() => { setDetailOpen(false); handleOpen(detailData); }}>编辑</Button>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {/* 基本信息 */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={3}><Typography variant="body2" color="text.secondary">编号</Typography><Typography variant="body1" sx={{ fontWeight: 600 }}>{detailData?.templateNo}</Typography></Grid>
            <Grid item xs={3}><Typography variant="body2" color="text.secondary">模板名称</Typography><Typography variant="body1" sx={{ fontWeight: 600 }}>{detailData?.name}</Typography></Grid>
            <Grid item xs={3}><Typography variant="body2" color="text.secondary">适用模块</Typography><Chip label={MODULE_TYPE_MAP[detailData?.moduleType] || detailData?.moduleType} size="small" color="primary" sx={{ mt: 0.5 }} /></Grid>
            <Grid item xs={3}><Typography variant="body2" color="text.secondary">纸张</Typography><Typography variant="body1">{detailData?.paperSize} · {detailData?.orientation === 'portrait' ? '纵向' : '横向'}</Typography></Grid>
          </Grid>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={3}><Typography variant="body2" color="text.secondary">页边距</Typography><Typography variant="body1">上 {detailData?.margins?.top || 10} / 右 {detailData?.margins?.right || 10} / 下 {detailData?.margins?.bottom || 10} / 左 {detailData?.margins?.left || 10} mm</Typography></Grid>
            <Grid item xs={3}><Typography variant="body2" color="text.secondary">创建时间</Typography><Typography variant="body1">{detailData?.createdAt ? new Date(detailData.createdAt).toLocaleString('zh-CN') : '-'}</Typography></Grid>
            <Grid item xs={3}><Typography variant="body2" color="text.secondary">更新时间</Typography><Typography variant="body1">{detailData?.updatedAt ? new Date(detailData.updatedAt).toLocaleString('zh-CN') : '-'}</Typography></Grid>
          </Grid>

          {/* 页眉预览 */}
          {detailData?.headerContent && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>页眉内容</Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fafafa' }}>
                <div dangerouslySetInnerHTML={{ __html: detailData.headerContent }} />
              </Paper>
            </Box>
          )}

          {/* 模板内容预览 */}
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>模板内容预览</Typography>
          <Paper variant="outlined" sx={{
            p: 3, minHeight: 400, bgcolor: 'white',
            boxShadow: '0 1px 8px rgba(0,0,0,0.1)',
          }}>
            <div dangerouslySetInnerHTML={{ __html: detailData?.templateContent || '<p style="text-align:center;color:#999;">模板内容为空</p>' }} />
          </Paper>

          {/* 页脚预览 */}
          {detailData?.footerContent && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>页脚内容</Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fafafa' }}>
                <div dangerouslySetInnerHTML={{ __html: detailData.footerContent }} />
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>关闭</Button>
          <Button variant="contained" startIcon={<Print />} onClick={() => {
            const margins = detailData?.margins || { top: 10, right: 10, bottom: 10, left: 10 };
            const content = (detailData?.headerContent || '') + (detailData?.templateContent || '') + (detailData?.footerContent || '');
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
              <html><head><title>${detailData?.name || '打印'}</title>
              <style>
                body { margin: 0; padding: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm; }
                @page { size: ${detailData?.paperSize || 'A4'} ${detailData?.orientation || 'portrait'}; }
              </style>
              </head><body>${content}</body></html>
            `);
            printWindow.document.close();
            printWindow.print();
          }}>
            打印
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={snack.sev} onClose={() => setSnack({ ...snack, open: false })}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
