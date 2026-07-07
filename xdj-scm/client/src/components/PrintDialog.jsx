import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, TextField, Select, MenuItem,
  Paper, Stack, Box, CircularProgress, Chip,
} from '@mui/material';
import { Print } from '@mui/icons-material';
import { api } from '../lib/api';

/**
 * 通用打印对话框组件
 * 
 * 使用方式：
 * <PrintDialog
 *   open={true}
 *   moduleType="sales_order"
 *   data={orderData}
 *   onClose={() => setPrintOpen(false)}
 * />
 * 
 * Props:
 * - open: 是否打开对话框
 * - moduleType: 模块类型（purchase_order/receipt/sales_order/shipping_order/inventory/stock_take 等）
 * - data: 要打印的业务数据（对象或数组）
 * - onClose: 关闭回调
 */

const MODULE_TYPE_LABELS = {
  master_material: '产品管理',
  master_customer: '客户管理',
  master_supplier: '供应商管理',
  master_warehouse: '仓库管理',
  master_employee: '员工管理',
  master_department: '部门管理',
  master_purchaser: '采购员管理',
  master_carrier: '承运商管理',
  purchase_plan: '采购计划',
  purchase_order: '采购订单',
  purchase_receipt: '采购入库',
  sales_plan: '销售计划',
  sales_order: '销售订单',
  sales_cost: '费用登记',
  sales_credit: '客户信用',
  sales_demand: '需求汇总',
  wms_inventory: '库存台账',
  wms_location: '库区库位',
  wms_movement: '出入库记录',
  wms_stocktake: '盘点管理',
  trace_batch: '批次管理',
  trace_traceability: '批次追溯',
  trace_age: '库龄分析',
  trace_recall: '召回管理',
  finance_receivable: '应收账款',
  finance_payable: '应付账款',
  finance_invoice: '发票管理',
  finance_payment: '收付款',
  cost_config: '成本配置',
  cost_standard: '标准成本',
  logistics_shipping: '发货管理',
  logistics_waybill: '运单管理',
  logistics_route: '配送路线',
  coldchain_dashboard: '温度看板',
  coldchain_sensor: '传感器管理',
  barcode: '扫码作业',
  contract: '合同管理',
  aftersales: '售后管理',
  approval: '审批管理',
  analytics: '数据分析',
  alert: '预警中心',
  supplier_eval: '供应商评估',
  quality_inspection: '质量检验',
  quality_certificate: '合格证',
  other: '其他',
};

export default function PrintDialog({ open, moduleType, moduleTypes, data, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  // 合并 moduleType 和 moduleTypes，支持多模块类型查询
  const effectiveModuleTypes = moduleTypes || (moduleType ? [moduleType] : []);

  // 加载该模块类型下启用的打印模板
  useEffect(() => {
    if (!open || effectiveModuleTypes.length === 0) return;
    setLoading(true);
    // 查询多个 moduleType 的模板
    const promises = effectiveModuleTypes.map(mt =>
      api.get('/master/print-templates', { params: { moduleType: mt, status: 'ACTIVE' } })
        .then(res => res?.data || [])
        .catch(() => [])
    );
    Promise.all(promises).then(results => {
      const list = results.flat();
      setTemplates(list);
      if (list.length > 0) setSelectedId(list[0].id);
      else setSelectedId('');
      setLoading(false);
    });
  }, [open, JSON.stringify(effectiveModuleTypes)]);

  // 选中模板后渲染预览
  useEffect(() => {
    if (!selectedId) { setPreviewHtml('<p style="text-align:center;color:#999;">请选择打印模板</p>'); return; }
    const tpl = templates.find(t => t.id === selectedId);
    if (!tpl) { setPreviewHtml('<p style="text-align:center;color:#999;">模板不存在</p>'); return; }
    // 用模板内容渲染预览：替换 {{变量}} 为实际数据
    const rendered = renderTemplate(tpl.templateContent, data);
    setPreviewHtml(rendered);
  }, [selectedId, templates, data]);

  // 简易模板渲染引擎：{{变量}} 替换 + {{#数组}}...{{/数组}} 循环
  const renderTemplate = (templateStr, context) => {
    if (!templateStr) return '<p style="text-align:center;color:#999;">模板内容为空</p>';
    if (!context) return templateStr;

    let result = templateStr;

    // 处理 {{#items}} ... {{/items}} 循环块
    const loopRegex = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/(\w+)\}\}/g;
    result = result.replace(loopRegex, (match, listKey, body, endKey) => {
      if (listKey !== endKey) return match; // 不匹配的标签保持原样
      const items = context[listKey] || [];
      return items.map(item => {
        let row = body;
        // 替换循环体内的 {{变量}}
        row = row.replace(/\{\{(\w+)\}\}/g, (_, key) => {
          const val = item[key] ?? context[key] ?? '';
          return escapeHtml(String(val));
        });
        return row;
      }).join('');
    });

    // 处理剩余的 {{变量}}（顶层字段）
    result = result.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const val = context[key] ?? '';
      return escapeHtml(String(val));
    });

    return result;
  };

  const escapeHtml = (str) => {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  const handlePrint = () => {
    const tpl = templates.find(t => t.id === selectedId);
    const margins = tpl?.margins || { top: 10, right: 10, bottom: 10, left: 10 };
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
      <head>
        <title>打印 - ${tpl?.name || '文档'}</title>
        <style>
          @page {
            size: ${tpl?.paperSize || 'A4'} ${tpl?.orientation || 'portrait'};
            margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
          }
          body {
            font-family: "Microsoft YaHei", "SimSun", sans-serif;
            font-size: 12pt;
            line-height: 1.6;
          }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #333; padding: 6px 10px; text-align: left; }
          th { background: #f0f0f0; font-weight: bold; }
          .print-header, .print-footer { text-align: center; }
        </style>
      </head>
      <body>
        ${tpl?.headerContent ? `<div class="print-header">${tpl.headerContent}</div>` : ''}
        ${previewHtml}
        ${tpl?.footerContent ? `<div class="print-footer">${tpl.footerContent}</div>` : ''}
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  const selectedTpl = templates.find(t => t.id === selectedId);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth
      PaperProps={{ sx: { minHeight: '80vh' } }}>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Print /> 选择打印模板
        {effectiveModuleTypes.length === 1 && (
          <Chip label={MODULE_TYPE_LABELS[effectiveModuleTypes[0]] || effectiveModuleTypes[0]} size="small" color="primary" variant="outlined" />
        )}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2.5 }}>
        {/* 模板选择 */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ minHeight: 55 }}>
          <TextField
            size="small"
            select
            label="选择模板"
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 320, '& .MuiFormControl-root': { height: 55 } }}
          >
            {templates.length === 0 && <MenuItem value="">暂无可用模板</MenuItem>}
            {templates.map(t => (
              <MenuItem key={t.id} value={t.id}>
                {effectiveModuleTypes.length > 1 ? `[${MODULE_TYPE_LABELS[t.moduleType] || t.moduleType}] ` : ''}{t.name} ({t.paperSize}/{t.orientation === 'portrait' ? '纵向' : '横向'})
              </MenuItem>
            ))}
          </TextField>
          {selectedTpl && (
            <Typography variant="body2" color="text.secondary">
              纸张: {selectedTpl.paperSize} · 方向: {selectedTpl.orientation === 'portrait' ? '纵向' : '横向'}
              · 边距: {selectedTpl.margins?.top || 10}/{selectedTpl.margins?.right || 10}/{selectedTpl.margins?.bottom || 10}/{selectedTpl.margins?.left || 10} mm
            </Typography>
          )}
        </Stack>

        {/* 预览区 */}
        <Paper variant="outlined" sx={{
          flex: 1, p: 3, minHeight: 400,
          bgcolor: 'white',
          boxShadow: '0 1px 8px rgba(0,0,0,0.1)',
          overflow: 'auto',
        }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          )}
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" startIcon={<Print />} onClick={handlePrint}
          disabled={!selectedId || templates.length === 0}>
          打印
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * usePrint Hook — 供其他页面快速接入打印功能
 * 
 * 使用方式：
 * const { printOpen, setPrintOpen, printData, handlePrint } = usePrint();
 * 
 * // 在页面中：
 * <Button onClick={() => handlePrint('sales_order', orderData)}>打印</Button>
 * <PrintDialog open={printOpen} moduleType={...} data={printData} onClose={() => setPrintOpen(false)} />
 * 
 * 注意：moduleType 需在 handlePrint 时传入，PrintDialog 的 moduleType 由外部 state 控制
 */
export function usePrint() {
  const [printOpen, setPrintOpen] = useState(false);
  const [printModuleType, setPrintModuleType] = useState('');
  const [printData, setPrintData] = useState(null);

  const handlePrint = (moduleType, data) => {
    setPrintModuleType(moduleType);
    setPrintData(data);
    setPrintOpen(true);
  };

  return {
    printOpen,
    setPrintOpen,
    printModuleType,
    printData,
    handlePrint,
  };
}
