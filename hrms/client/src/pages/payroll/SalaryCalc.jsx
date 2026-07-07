import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Button, Grid, Card, CardContent, Typography, TextField, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip,
  InputAdornment, CircularProgress, Alert, LinearProgress, Chip, Popover,
  Menu, ListItemIcon, ListItemText, Divider,
} from '@mui/material';
import {
  Save as SaveIcon, Refresh as RefreshIcon, Calculate as CalcIcon,
  Search as SearchIcon, PersonAdd as InitIcon, FileCopy as CopyIcon,
  ExpandMore as ExpandIcon, ExpandLess as CollapseIcon,
  Warning as WarningIcon, CheckCircle as CheckIcon,
  Edit as EditIcon, Visibility as ViewIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import PageHeader from '../../components/PageHeader';
import api from '../../hooks/useFetch';

// ── 薪资项（+）── 按模板顺序 ──
const EARNING_FIELDS = [
  { key: 'baseWage', label: '基本/计件工资', width: 130 },
  { key: 'performanceBonus', label: '绩效工资', width: 100 },
  { key: 'overtimePay', label: '加班费', width: 90 },
  { key: 'commission', label: '提成', width: 80 },
  { key: 'fullAttendanceBonus', label: '全勤奖', width: 80 },
  { key: 'seniorityAllowance', label: '工龄补贴', width: 90 },
  { key: 'partyMemberSubsidy', label: '党员补贴', width: 90 },
  { key: 'certificateSubsidy', label: '证书补贴', width: 90 },
  { key: 'positionAllowance', label: '岗位津贴', width: 90 },
  { key: 'educationSubsidy', label: '学历补贴', width: 90 },
  { key: 'technicianSubsidy', label: '技术员补贴', width: 100 },
  { key: 'filialSubsidy', label: '孝心补贴', width: 90 },
  { key: 'highTempSubsidy', label: '高温补贴', width: 90 },
  { key: 'paidAnnualLeave', label: '带薪年休假', width: 100 },
  { key: 'otherSubsidy', label: '其他补贴', width: 90 },
  { key: 'welfareFee', label: '福利费', width: 80 },
  { key: 'rewardItem', label: '奖励项', width: 80 },
  { key: 'penaltyItem', label: '处罚项', width: 80 },
];

// ── 扣款项（-）──
const DEDUCTION_FIELDS = [
  { key: 'individualTax', label: '个税', width: 80 },
  { key: 'socialInsurance', label: '社保', width: 80 },
  { key: 'housingFund', label: '公积金', width: 80 },
  { key: 'partyFee', label: '党费', width: 70 },
  { key: 'otherDeduction', label: '其他扣款', width: 90 },
];

const EARNING_KEYS = EARNING_FIELDS.map((f) => f.key);
const DEDUCTION_KEYS = DEDUCTION_FIELDS.map((f) => f.key);

function fmt(n) {
  const v = Number(n) || 0;
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// 计算应付/扣款小计/实付
function calcTotals(r) {
  const grossPay = EARNING_KEYS.reduce((s, k) => s + (Number(r[k]) || 0), 0) - (Number(r.penaltyItem) || 0);
  const totalDeduction = DEDUCTION_KEYS.reduce((s, k) => s + (Number(r[k]) || 0), 0);
  const netPay = grossPay - totalDeduction;
  return { grossPay, totalDeduction, netPay };
}

// ── 原生表格共用样式 ──
const TH_STYLE = {
  padding: '8px 6px',
  border: '1px solid #ddd',
  fontSize: '0.78rem',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};
const TD_STYLE = {
  padding: '4px 2px',
  border: '1px solid #eee',
  verticalAlign: 'middle',
};
const BTN_STYLE = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem',
  padding: '2px 4px', borderRadius: 3,
};

// 原生 input（用于原生 table 内）
function NativeInput({ value, onChange, width }) {
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);
  return (
    <input
      type="number"
      step="0.01"
      value={local}
      onChange={(e) => { setLocal(e.target.value); onChange(Number(e.target.value) || 0); }}
      style={{
        width: width || 70,
        textAlign: 'right',
        padding: '3px 4px',
        fontSize: '0.78rem',
        border: '1px solid transparent',
        outline: 'none',
        background: 'transparent',
        boxSizing: 'border-box',
        ':focus': { borderColor: '#1976d2', background: '#e3f2fd' },
      }}
    />
  );
}

// 可编辑单元格（MUI Table 用 — 弹窗中仍使用）
function EditableCell({ value, onChange, width, align = 'right', highlight }) {
  const [local, setLocal] = useState(value ?? 0);
  useEffect(() => { setLocal(value ?? 0); }, [value]);
  return (
    <TableCell
      align={align}
      sx={{
        minWidth: width, maxWidth: width,
        p: 0, borderBottom: '1px solid',
        borderColor: 'divider',
        position: 'relative',
        '&:hover .edit-input': { opacity: 1 },
      }}
    >
      <TextField
        size="small"
        type="number"
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          onChange(Number(e.target.value) || 0);
        }}
        InputProps={{
          inputProps: { step: '0.01', style: { textAlign: 'right', padding: '4px 6px', fontSize: '0.8rem' } },
          disableUnderline: true,
        }}
        variant="standard"
        sx={{
          width: '100%',
          '& .MuiInput-root': { bgcolor: highlight ? 'warning.light' : 'transparent' },
          '& .MuiInput-input': { fontSize: '0.8rem' },
        }}
      />
    </TableCell>
  );
}

export default function SalaryCalc() {
  const { enqueueSnackbar } = useSnackbar();

  const [list, setList] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // 筛选
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [department, setDepartment] = useState('');
  const [search, setSearch] = useState('');

  // 弹窗
  const [editDialog, setEditDialog] = useState({ open: false, data: null });
  const [viewDialog, setViewDialog] = useState({ open: false, data: null });
  const [initDialog, setInitDialog] = useState(false);
  const [copyDialog, setCopyDialog] = useState(false);
  const [saveDialog, setSaveDialog] = useState(false);

  // 批量操作菜单
  const [batchMenu, setBatchMenu] = useState(null);
  const [batchFieldDialog, setBatchFieldDialog] = useState({ open: false, field: null, value: 0 });

  // 加载数据
  const fetchData = useCallback(async () => {
    setLoading(true);
    setDirty(false);
    try {
      const [listRes, summaryRes] = await Promise.all([
        api.get('/payroll/records', { params: { month, department, search, page: 1, pageSize: 500 } }),
        api.get('/payroll/summary', { params: { month } }),
      ]);
      setList(listRes.data.data || []);
      setSummary(summaryRes.data);
    } catch (err) {
      enqueueSnackbar(err.message || '加载失败', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [month, department, search]);

  useEffect(() => { fetchData(); }, [month]);

  const handleSearch = () => { fetchData(); };

  // 修改单元格
  const updateField = useCallback((id, key, val) => {
    setList((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const updated = { ...r, [key]: val };
      const totals = calcTotals(updated);
      updated.grossPay = totals.grossPay;
      updated.totalDeduction = totals.totalDeduction;
      updated.netPay = totals.netPay;
      return updated;
    }));
    setDirty(true);
  }, []);

  // 全部重算
  const handleRecalcAll = () => {
    setList((prev) => prev.map((r) => {
      const totals = calcTotals(r);
      return { ...r, ...totals };
    }));
    setDirty(true);
    enqueueSnackbar('已重新计算所有合计', { variant: 'info' });
  };

  // 批量设置某字段
  const handleBatchSet = (field) => {
    setBatchFieldDialog({ open: true, field, value: 0 });
  };

  const applyBatchSet = () => {
    const { field, value } = batchFieldDialog;
    setList((prev) => prev.map((r) => {
      const updated = { ...r, [field]: Number(value) || 0 };
      const totals = calcTotals(updated);
      updated.grossPay = totals.grossPay;
      updated.totalDeduction = totals.totalDeduction;
      updated.netPay = totals.netPay;
      return updated;
    }));
    setDirty(true);
    setBatchFieldDialog({ open: false, field: null, value: 0 });
    enqueueSnackbar(`已批量设置 ${field} = ${value}`, { variant: 'success' });
  };

  // 从员工初始化
  const handleInit = async () => {
    setInitDialog(false);
    setLoading(true);
    try {
      const resp = await api.post('/payroll/init', { month });
      enqueueSnackbar(resp.data.message || `初始化完成，创建 ${resp.data.created} 条`, { variant: 'success' });
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.message || '初始化失败', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 从上月复制
  const handleCopyLastMonth = async () => {
    setCopyDialog(false);
    setLoading(true);
    try {
      const resp = await api.post('/payroll/copy-last-month', { month });
      enqueueSnackbar(resp.data.message || `复制完成`, { variant: 'success' });
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.message || '复制失败', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 保存全部
  const handleSaveAll = async () => {
    setSaveDialog(false);
    setSaving(true);
    try {
      const resp = await api.post('/payroll/batch-update', { records: list });
      const { success, failed, errors } = resp.data;
      if (failed > 0) {
        enqueueSnackbar(`保存完成：成功 ${success} 条，失败 ${failed} 条`, { variant: 'warning' });
      } else {
        enqueueSnackbar(`保存成功：${success} 条记录`, { variant: 'success' });
      }
      setDirty(false);
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.message || '保存失败', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // 编辑弹窗字段更新
  const updateEditField = (key, val) => {
    const updated = { ...editDialog.data, [key]: val };
    const totals = calcTotals(updated);
    updated.grossPay = totals.grossPay;
    updated.totalDeduction = totals.totalDeduction;
    updated.netPay = totals.netPay;
    setEditDialog({ ...editDialog, data: updated });
  };

  const handleSaveEdit = async () => {
    try {
      await api.put(`/payroll/records/${editDialog.data.id}`, editDialog.data);
      enqueueSnackbar('保存成功', { variant: 'success' });
      setEditDialog({ open: false, data: null });
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.message || '保存失败', { variant: 'error' });
    }
  };

  // 表格列合计
  const columnTotals = useMemo(() => {
    const totals = {};
    [...EARNING_FIELDS, ...DEDUCTION_FIELDS].forEach((f) => {
      totals[f.key] = list.reduce((s, r) => s + (Number(r[f.key]) || 0), 0);
    });
    totals.grossPay = list.reduce((s, r) => s + (Number(r.grossPay) || 0), 0);
    totals.totalDeduction = list.reduce((s, r) => s + (Number(r.totalDeduction) || 0), 0);
    totals.netPay = list.reduce((s, r) => s + (Number(r.netPay) || 0), 0);
    return totals;
  }, [list]);

  const allFields = [...EARNING_FIELDS, ...DEDUCTION_FIELDS];

  return (
    <div style={{
      // ── Grid 布局：首行自适应内容高度，第二行吃掉全部剩余空间 ──
      display: 'grid',
      gridTemplateRows: 'auto 1fr',
      height: 'calc(100vh - 112px)',
      width: '100%',
      overflow: 'hidden',
    }}>
      {/* 固定区域：标题 + 工具栏 + 统计 */}
      <div style={{ overflow: 'hidden' }}>
      <PageHeader
        title="薪资计算"
        subtitle={`按模板字段逐项输入，自动计算应付/扣款/实付 ${dirty ? '· 有未保存修改' : ''}`}
        breadcrumbs={['薪资管理', '薪资计算']}
      />

      {/* 工具栏 — 始终可见 */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          type="month" size="small" label="月份" value={month}
          onChange={(e) => setMonth(e.target.value)} InputLabelProps={{ shrink: true }}
          sx={{ width: 140 }}
        />
        <TextField
          size="small" label="部门" value={department}
          onChange={(e) => setDepartment(e.target.value)}
          sx={{ width: 140 }}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <TextField
          size="small" label="搜索姓名/工号" value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ width: 200 }}
        />
        <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={handleSearch}>查询</Button>

        {/* 批量操作菜单 */}
        <Button
          variant="outlined" size="small"
          startIcon={<CalcIcon />}
          onClick={(e) => setBatchMenu(e.currentTarget)}
        >
          批量操作
        </Button>
        <Menu
          anchorEl={batchMenu}
          open={!!batchMenu}
          onClose={() => setBatchMenu(null)}
        >
          <MenuItem onClick={() => { setBatchMenu(null); handleRecalcAll(); }}>
            <ListItemIcon><CalcIcon fontSize="small" /></ListItemIcon>
            <ListItemText>全部重算合计</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { setBatchMenu(null); setInitDialog(true); }}>
            <ListItemIcon><InitIcon fontSize="small" /></ListItemIcon>
            <ListItemText>从员工初始化</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { setBatchMenu(null); setCopyDialog(true); }}>
            <ListItemIcon><CopyIcon fontSize="small" /></ListItemIcon>
            <ListItemText>从上月复制</ListItemText>
          </MenuItem>
          <Divider />
          {allFields.map((f) => (
            <MenuItem key={f.key} onClick={() => { setBatchMenu(null); handleBatchSet(f.key); }}>
              <ListItemText>批量设置：{f.label}</ListItemText>
            </MenuItem>
          ))}
        </Menu>

        <Button
          variant="contained" size="small" color="primary"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          disabled={!dirty || saving}
          onClick={() => setSaveDialog(true)}
        >
          保存全部
        </Button>
      </Box>

      {/* 统计卡片 */}
      {list.length > 0 && (
        <Grid container spacing={1.5} sx={{ mb: 1, flexShrink: 0 }}>
          <Grid item xs={6} md={2.4}>
            <Card variant="outlined"><CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="body2" color="text.secondary">人数</Typography>
              <Typography variant="h6" fontWeight="bold">{list.length}</Typography>
            </CardContent></Card>
          </Grid>
          <Grid item xs={6} md={2.4}>
            <Card variant="outlined"><CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="body2" color="text.secondary">应付总额</Typography>
              <Typography variant="h6" fontWeight="bold">¥{fmt(columnTotals.grossPay)}</Typography>
            </CardContent></Card>
          </Grid>
          <Grid item xs={6} md={2.4}>
            <Card variant="outlined"><CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="body2" color="text.secondary">扣款总额</Typography>
              <Typography variant="h6" fontWeight="bold" color="error.main">¥{fmt(columnTotals.totalDeduction)}</Typography>
            </CardContent></Card>
          </Grid>
          <Grid item xs={6} md={2.4}>
            <Card variant="outlined"><CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="body2" color="text.secondary">实付总额</Typography>
              <Typography variant="h6" fontWeight="bold" color="success.main">¥{fmt(columnTotals.netPay)}</Typography>
            </CardContent></Card>
          </Grid>
          <Grid item xs={6} md={2.4}>
            <Card variant="outlined"><CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="body2" color="text.secondary">个税合计</Typography>
              <Typography variant="h6" fontWeight="bold">¥{fmt(columnTotals.individualTax)}</Typography>
            </CardContent></Card>
          </Grid>
        </Grid>
      )}

      {/* 未保存提示 */}
      {dirty && (
        <Alert severity="warning" sx={{ mb: 1 }} icon={<WarningIcon />}>
          有未保存的修改，请点击"保存全部"。
        </Alert>
      )}

      </div>{/* 固定区域结束 */}

      {/* ── 滚动容器：Grid 第二行自动填满剩余空间 ── */}
      <div
        style={{
          overflowX: 'auto',
          overflowY: 'auto',
        }}
      >
        <div style={{ width: '2600px', minWidth: 'max-content' }}>
        <table
          style={{
            borderCollapse: 'collapse',
            fontSize: '0.8rem',
            width: '100%',
            tableLayout: 'auto',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5', position: 'sticky', top: 0, zIndex: 2 }}>
              {/* 固定左侧列 */}
              <th style={{ ...TH_STYLE, position: 'sticky', left: 0, zIndex: 3, background: '#fff', borderRight: '2px solid #ddd', minWidth: 50 }}>序号</th>
              <th style={{ ...TH_STYLE, position: 'sticky', left: 50, zIndex: 3, background: '#fff', borderRight: '2px solid #ddd', minWidth: 80 }}>工号</th>
              <th style={{ ...TH_STYLE, position: 'sticky', left: 130, zIndex: 3, background: '#fff', borderRight: '2px solid #ddd', minWidth: 80 }}>姓名</th>
              <th style={{ ...TH_STYLE, position: 'sticky', left: 210, zIndex: 3, background: '#fff', borderRight: '2px solid #ddd', minWidth: 100 }}>部门</th>
              <th style={{ ...TH_STYLE, textAlign: 'right', backgroundColor: '#f0f0f0', minWidth: 70 }}>出勤(天)</th>
              {EARNING_FIELDS.map((f) => (
                <th key={f.key} style={{ ...TH_STYLE, textAlign: 'right', backgroundColor: '#e8f5e9', minWidth: f.width }}>{f.label}</th>
              ))}
              <th style={{ ...TH_STYLE, textAlign: 'right', backgroundColor: '#ff9800', color: '#fff', minWidth: 110 }}>应付工资</th>
              {DEDUCTION_FIELDS.map((f) => (
                <th key={f.key} style={{ ...TH_STYLE, textAlign: 'right', backgroundColor: '#ffebee', minWidth: f.width }}>{f.label}</th>
              ))}
              <th style={{ ...TH_STYLE, textAlign: 'right', backgroundColor: '#f44336', color: '#fff', minWidth: 100 }}>扣款小计</th>
              <th style={{ ...TH_STYLE, textAlign: 'right', backgroundColor: '#4caf50', color: '#fff', minWidth: 120 }}>实付工资</th>
              <th style={{ ...TH_STYLE, position: 'sticky', right: 0, zIndex: 3, background: '#fff', borderLeft: '2px solid #ddd', minWidth: 80 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && !loading && (
              <tr><td colSpan="30" style={{ padding: '32px 16px', textAlign: 'center', color: '#999', borderBottom: 'none' }}>
                暂无 {month} 月工资数据。请使用"批量操作"→"从员工初始化"或"从上月复制"创建记录。
              </td></tr>
            )}
            {list.map((r, i) => (
              <tr key={r.id || i} style={{ ':hover': { backgroundColor: '#fafafa' }, borderBottom: '1px solid #eee' }}>
                <td style={{ ...TD_STYLE, position: 'sticky', left: 0, zIndex: 1, background: '#fff', borderRight: '2px solid #ddd' }}>{i + 1}</td>
                <td style={{ ...TD_STYLE, position: 'sticky', left: 50, zIndex: 1, background: '#fff', borderRight: '2px solid #ddd', fontFamily: 'monospace', fontSize: '0.78rem' }}>{r.employeeNo}</td>
                <td style={{ ...TD_STYLE, position: 'sticky', left: 130, zIndex: 1, background: '#fff', borderRight: '2px solid #ddd', fontWeight: 500 }}>{r.name}</td>
                <td style={{ ...TD_STYLE, position: 'sticky', left: 210, zIndex: 1, background: '#fff', borderRight: '2px solid #ddd', fontSize: '0.78rem' }}>{r.department || '-'}</td>
                <td style={{ ...TD_STYLE, padding: 0 }} align="right">
                  <NativeInput value={r.attendanceDays ?? ''} onChange={(v) => updateField(r.id, 'attendanceDays', v)} width={60} />
                </td>
                {EARNING_FIELDS.map((f) => (
                  <td key={f.key} style={{ ...TD_STYLE, padding: 0 }} align="right">
                    <NativeInput value={r[f.key] ?? 0} onChange={(v) => updateField(r.id, f.key, v)} width={f.width - 10} />
                  </td>
                ))}
                <td align="right" style={{ ...TD_STYLE, fontWeight: 'bold', backgroundColor: '#fff3e0', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  {fmt(r.grossPay)}
                </td>
                {DEDUCTION_FIELDS.map((f) => (
                  <td key={f.key} style={{ ...TD_STYLE, padding: 0 }} align="right">
                    <NativeInput value={r[f.key] ?? 0} onChange={(v) => updateField(r.id, f.key, v)} width={f.width - 10} />
                  </td>
                ))}
                <td align="right" style={{ ...TD_STYLE, fontWeight: 'bold', backgroundColor: '#ffebee', color: '#c62828', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  {fmt(r.totalDeduction)}
                </td>
                <td align="right" style={{ ...TD_STYLE, fontWeight: 'bold', backgroundColor: '#e8f5e9', color: '#2e7d32', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                  {fmt(r.netPay)}
                </td>
                <td style={{ ...TD_STYLE, position: 'sticky', right: 0, zIndex: 1, background: '#fff', borderLeft: '2px solid #ddd' }}>
                  <button title="查看" onClick={() => setViewDialog({ open: true, data: r })} style={BTN_STYLE}>👁</button>
                  <button title="详情编辑" onClick={() => setEditDialog({ open: true, data: { ...r } })} style={BTN_STYLE}>✏</button>
                </td>
              </tr>
            ))}
            {/* 合计行 */}
            {list.length > 0 && (
              <tr style={{ position: 'sticky', bottom: 0, zIndex: 2, backgroundColor: '#e0e0e0', fontWeight: 'bold' }}>
                <td colSpan="4" style={{ ...TD_STYLE, fontWeight: 'bold', backgroundColor: '#e0e0e0', position: 'sticky', left: 0, zIndex: 3, borderRight: '2px solid #ddd' }}>
                  合计（{list.length} 人）
                </td>
                <td align="right" style={{ ...TD_STYLE, fontWeight: 'bold', backgroundColor: '#e0e0e0' }}>-</td>
                {EARNING_FIELDS.map((f) => (
                  <td key={f.key} align="right" style={{ ...TD_STYLE, fontWeight: 'bold', backgroundColor: '#e0e0e0', fontSize: '0.75rem' }}>
                    {fmt(columnTotals[f.key])}
                  </td>
                ))}
                <td align="right" style={{ fontWeight: 'bold', backgroundColor: '#ff9800', color: '#fff', fontSize: '0.8rem' }}>
                  {fmt(columnTotals.grossPay)}
                </td>
                {DEDUCTION_FIELDS.map((f) => (
                  <td key={f.key} align="right" style={{ ...TD_STYLE, fontWeight: 'bold', backgroundColor: '#e0e0e0', fontSize: '0.75rem' }}>
                    {fmt(columnTotals[f.key])}
                  </td>
                ))}
                <td align="right" style={{ fontWeight: 'bold', backgroundColor: '#f44336', color: '#fff', fontSize: '0.8rem' }}>
                  {fmt(columnTotals.totalDeduction)}
                </td>
                <td align="right" style={{ fontWeight: 'bold', backgroundColor: '#4caf50', color: '#fff', fontSize: '0.85rem' }}>
                  {fmt(columnTotals.netPay)}
                </td>
                <td style={{ position: 'sticky', right: 0, zIndex: 3, backgroundColor: '#e0e0e0', borderLeft: '2px solid #ddd' }} />
              </tr>
            )}
          </tbody>
        </table>
        </div>{/* /width wrapper */}
      </div>

      {/* ── 详情编辑弹窗（全部42字段） ── */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, data: null })} maxWidth="lg" fullWidth>
        <DialogTitle>薪资详情编辑 — {editDialog.data?.name}（{editDialog.data?.month}）</DialogTitle>
        <DialogContent>
          {editDialog.data && (
            <Box>
              {/* 基本信息 */}
              <Typography variant="subtitle2" sx={{ mt: 1, mb: 1, color: 'primary.main' }}>基本信息</Typography>
              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                {[
                  ['公司', 'company'], ['部门', 'department'], ['班组', 'team'],
                  ['岗位', 'position'], ['岗位层级', 'positionLevel'], ['岗位类别', 'positionCategory'],
                  ['计薪方式', 'payMethod'], ['状态', 'status'],
                ].map(([label, key]) => (
                  <Grid item xs={3} key={key}>
                    <TextField fullWidth size="small" label={label}
                      value={editDialog.data[key] || ''}
                      onChange={(e) => updateEditField(key, e.target.value)}
                    />
                  </Grid>
                ))}
                <Grid item xs={3}>
                  <TextField fullWidth size="small" type="number" label="出勤天数"
                    value={editDialog.data.attendanceDays ?? 0}
                    onChange={(e) => updateEditField('attendanceDays', Number(e.target.value))}
                  />
                </Grid>
              </Grid>

              {/* 薪资项 */}
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: 'success.main' }}>薪资项（+）</Typography>
              <Grid container spacing={1}>
                {EARNING_FIELDS.map((f) => (
                  <Grid item xs={3} key={f.key}>
                    <TextField fullWidth size="small" type="number" label={f.label}
                      value={editDialog.data[f.key] ?? 0}
                      onChange={(e) => updateEditField(f.key, Number(e.target.value))}
                      InputProps={{ inputProps: { step: '0.01' } }}
                    />
                  </Grid>
                ))}
              </Grid>

              {/* 应付工资 */}
              <Box sx={{ mt: 1, p: 1, bgcolor: 'warning.light', borderRadius: 1, textAlign: 'center' }}>
                <Typography variant="subtitle1" fontWeight="bold">应付工资：¥{fmt(editDialog.data.grossPay)}</Typography>
              </Box>

              {/* 扣款项 */}
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: 'error.main' }}>扣款项（-）</Typography>
              <Grid container spacing={1}>
                {DEDUCTION_FIELDS.map((f) => (
                  <Grid item xs={3} key={f.key}>
                    <TextField fullWidth size="small" type="number" label={f.label}
                      value={editDialog.data[f.key] ?? 0}
                      onChange={(e) => updateEditField(f.key, Number(e.target.value))}
                      InputProps={{ inputProps: { step: '0.01' } }}
                    />
                  </Grid>
                ))}
              </Grid>

              {/* 扣款小计 + 实付 */}
              <Box sx={{ mt: 1, p: 1.5, display: 'flex', gap: 3, justifyContent: 'center' }}>
                <Typography><strong>扣款小计：</strong>¥{fmt(editDialog.data.totalDeduction)}</Typography>
                <Typography color="success.main" variant="h6"><strong>实付工资：¥{fmt(editDialog.data.netPay)}</strong></Typography>
              </Box>

              {/* 银行信息 */}
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>银行信息</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={4}>
                  <TextField fullWidth size="small" label="工资卡银行"
                    value={editDialog.data.bankName || ''}
                    onChange={(e) => updateEditField('bankName', e.target.value)}
                  />
                </Grid>
                <Grid item xs={8}>
                  <TextField fullWidth size="small" label="银行卡号"
                    value={editDialog.data.bankAccount || ''}
                    onChange={(e) => updateEditField('bankAccount', e.target.value)}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, data: null })}>取消</Button>
          <Button variant="contained" onClick={handleSaveEdit}>保存此条</Button>
        </DialogActions>
      </Dialog>

      {/* ── 查看弹窗（只读） ── */}
      <Dialog open={viewDialog.open} onClose={() => setViewDialog({ open: false, data: null })} maxWidth="md" fullWidth>
        <DialogTitle>工资详情 — {viewDialog.data?.name}（{viewDialog.data?.month}）</DialogTitle>
        <DialogContent>
          {viewDialog.data && (
            <Box>
              <Grid container spacing={1} sx={{ mb: 2 }}>
                {[
                  ['公司', viewDialog.data.company], ['部门', viewDialog.data.department],
                  ['班组', viewDialog.data.team], ['岗位', viewDialog.data.position],
                  ['岗位层级', viewDialog.data.positionLevel], ['岗位类别', viewDialog.data.positionCategory],
                  ['工号', viewDialog.data.employeeNo], ['计薪方式', viewDialog.data.payMethod],
                  ['状态', viewDialog.data.status], ['出勤天数', viewDialog.data.attendanceDays],
                  ['工资卡银行', viewDialog.data.bankName], ['银行卡号', viewDialog.data.bankAccount],
                ].map(([label, val]) => (
                  <Grid item xs={4} key={label}>
                    <Typography variant="body2"><strong>{label}：</strong>{val || '-'}</Typography>
                  </Grid>
                ))}
              </Grid>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'success.main' }}>薪资项（+）</Typography>
              <Table size="small" sx={{ mb: 2 }}>
                <TableBody>
                  {EARNING_FIELDS.map((f, i) => (
                    <TableRow key={f.key} sx={{ bgcolor: i % 2 === 0 ? 'action.hover' : '' }}>
                      <TableCell sx={{ width: '50%' }}>{f.label}</TableCell>
                      <TableCell align="right">{fmt(viewDialog.data[f.key])}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: 'warning.light' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>应付工资</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{fmt(viewDialog.data.grossPay)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'error.main' }}>扣款项（-）</Typography>
              <Table size="small">
                <TableBody>
                  {DEDUCTION_FIELDS.map((f, i) => (
                    <TableRow key={f.key} sx={{ bgcolor: i % 2 === 0 ? 'action.hover' : '' }}>
                      <TableCell sx={{ width: '50%' }}>{f.label}</TableCell>
                      <TableCell align="right">{fmt(viewDialog.data[f.key])}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: 'error.light' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>扣款小计</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{fmt(viewDialog.data.totalDeduction)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <Box sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 1, textAlign: 'center' }}>
                <Typography variant="h6" fontWeight="bold">实付工资：¥{fmt(viewDialog.data.netPay)}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog({ open: false, data: null })}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* ── 初始化确认弹窗 ── */}
      <Dialog open={initDialog} onClose={() => setInitDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InitIcon color="primary" /> 从员工初始化
        </DialogTitle>
        <DialogContent>
          <Typography>
            将为所有在职员工创建 <strong>{month}</strong> 月的空白工资记录（基本工资取员工档案值）。
            {list.length > 0 && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                当前月已有 {list.length} 条记录，初始化将被跳过。
              </Alert>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInitDialog(false)}>取消</Button>
          <Button variant="contained" onClick={handleInit} disabled={list.length > 0}>确认初始化</Button>
        </DialogActions>
      </Dialog>

      {/* ── 复制确认弹窗 ── */}
      <Dialog open={copyDialog} onClose={() => setCopyDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CopyIcon color="primary" /> 从上月复制
        </DialogTitle>
        <DialogContent>
          <Typography>
            将上个月的工资数据复制到 <strong>{month}</strong> 月（仅复制不存在的记录，已有的不覆盖）。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCopyDialog(false)}>取消</Button>
          <Button variant="contained" onClick={handleCopyLastMonth}>确认复制</Button>
        </DialogActions>
      </Dialog>

      {/* ── 保存确认弹窗 ── */}
      <Dialog open={saveDialog} onClose={() => setSaveDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SaveIcon color="primary" /> 保存全部修改
        </DialogTitle>
        <DialogContent>
          <Typography>
            将保存 <strong>{list.length}</strong> 条工资记录的修改，系统会自动重算应付/扣款/实付。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialog(false)}>取消</Button>
          <Button variant="contained" onClick={handleSaveAll}>确认保存</Button>
        </DialogActions>
      </Dialog>

      {/* ── 批量设置弹窗 ── */}
      <Dialog open={batchFieldDialog.open} onClose={() => setBatchFieldDialog({ open: false, field: null, value: 0 })} maxWidth="xs" fullWidth>
        <DialogTitle>批量设置：{allFields.find((f) => f.key === batchFieldDialog.field)?.label}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth type="number" size="small"
            label="设置值"
            value={batchFieldDialog.value}
            onChange={(e) => setBatchFieldDialog({ ...batchFieldDialog, value: e.target.value })}
            sx={{ mt: 1 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            将对当前列表中的所有 {list.length} 条记录设置相同的值。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBatchFieldDialog({ open: false, field: null, value: 0 })}>取消</Button>
          <Button variant="contained" onClick={applyBatchSet}>应用</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
