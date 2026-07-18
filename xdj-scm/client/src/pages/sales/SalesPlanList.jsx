import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Grid, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  InputAdornment, Alert, MenuItem, TablePagination, Tooltip, CircularProgress,
} from '@mui/material';
import { Add, Edit, Delete, Search, CheckCircle, Cancel, RemoveCircleOutline, MergeType, RestartAlt, KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

const STATUS_LABELS = { DRAFT: '草稿', PENDING: '待审批', APPROVED: '已批准', REJECTED: '已驳回' };
const STATUS_COLORS = { DRAFT: 'default', PENDING: 'warning', APPROVED: 'success', REJECTED: 'error' };
const TYPE_LABELS = { WEEKLY: '周计划', MONTHLY: '月计划', QUARTERLY: '季度计划', YEARLY: '年计划' };

// 获取当前是第几周（月内）
function getWeekOfMonth(date = new Date()) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfWeek = firstDay.getDay() || 7; // 周日→7
  const offset = dayOfWeek - 1; // 周一为起点
  return Math.ceil((date.getDate() + offset) / 7);
}

// 根据计划类型自动生成标题
function genTitle(userName, planType) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const typeLabel = TYPE_LABELS[planType] || planType;
  let period;
  switch (planType) {
    case 'WEEKLY':
      period = `${y}年${m}月第${getWeekOfMonth(now)}周`;
      break;
    case 'MONTHLY':
      period = `${y}年${m}月`;
      break;
    case 'QUARTERLY':
      period = `${y}年Q${Math.floor(m / 3) + 1}`;
      break;
    case 'YEARLY':
      period = `${y}年`;
      break;
    default:
      period = `${y}年${m}月`;
  }
  return `${userName}-${period}-${typeLabel}`;
}

export default function SalesPlanList() {
  const user = useAuthStore(s => s.user);
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [filterPlanType, setFilterPlanType] = useState('');
  const [filterCustomerId, setFilterCustomerId] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [showAggregated, setShowAggregated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState({ open: false, mode: 'create', data: null });
  const [dialogOriginal, setDialogOriginal] = useState(null); // 编辑模式原始数据
  const [confirmClose, setConfirmClose] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [materialGrades, setMaterialGrades] = useState([]); // 所有等级数据
  const [expandedId, setExpandedId] = useState(null);           // 当前展开的行ID
  const [detailCache, setDetailCache] = useState({});           // 展开明细缓存
  const [loadingDetail, setLoadingDetail] = useState(false);    // 加载明细中

  const submitterName = user?.employee?.name || user?.username || '-';
  const userDeptId = user?.employee?.departmentId || '';
  const userDeptName = user?.employee?.department?.name || '';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page + 1, pageSize: rowsPerPage });
      if (keyword) params.set('keyword', keyword);
      if (status) params.set('status', status);
      if (filterPlanType) params.set('planType', filterPlanType);
      if (filterCustomerId) params.set('customerId', filterCustomerId);
      if (filterDateStart) params.set('dateStart', filterDateStart);
      if (filterDateEnd) params.set('dateEnd', filterDateEnd);
      if (showAggregated) params.set('showAggregated', 'true');
      const res = await api.get(`/sales/plans?${params}`);
      setList(res.data.list || []);
      setTotal(res.data.total || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, rowsPerPage, keyword, status, filterPlanType, filterCustomerId, filterDateStart, filterDateEnd, showAggregated]);

  const loadOptions = async () => {
    try {
      const isSalesRep = user?.role === 'SALES_REP' || user?.role === 'SALES_STAFF';
      // 分别加载，避免一个失败全失败
      try {
        const deptRes = await api.get('/master/departments');
        setDepartments(deptRes.data?.list || deptRes.data || []);
      } catch (e) { console.error('加载部门失败', e); }
      try {
        const matRes = await api.get('/master/materials?page=1&pageSize=999&module=sales');
        setMaterials(matRes.list || matRes.data?.list || []);
      } catch (e) { console.error('加载物料失败', e); }
      try {
        const custRes = await api.get(`/master/customers?page=1&pageSize=999${isSalesRep ? '&mine=true' : ''}`);
        setCustomers(custRes.data?.list || custRes.list || []);
      } catch (e) { console.error('加载客户失败', e); }
      try {
        const gradeRes = await api.get('/master/material-grades?page=1&pageSize=999');
        setMaterialGrades(gradeRes.list || gradeRes.data?.list || []);
      } catch (e) { console.error('加载等级失败', e); }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadOptions(); }, []);
  useEffect(() => { setExpandedId(null); }, [page, rowsPerPage]); // 翻页时收起展开

  const handleRowExpand = async (row) => {
    if (expandedId === row.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(row.id);
    if (!detailCache[row.id]) {
      setLoadingDetail(true);
      try {
        const res = await api.get(`/sales/plans/${row.id}`);
        setDetailCache(prev => ({ ...prev, [row.id]: res.data }));
      } catch (e) { console.error(e); }
      setLoadingDetail(false);
    }
  };

  const handleSave = async () => {
    const { data } = dialog;
    if (!data.title) { alert('请填写标题'); return; }
    if (!data.items || data.items.length === 0) { alert('至少添加一条明细'); return; }
    const validItems = data.items.filter(it => it.customerId && it.materialId);
    if (validItems.length === 0) { alert('每条明细需选择客户和产品'); return; }
    try {
      const payload = {
        title: data.title,
        planType: data.planType,
        departmentId: data.departmentId,
        remark: data.remark,
        items: validItems.map(it => ({
          customerId: it.customerId,
          materialId: it.materialId,
          gradeId: it.gradeId || null,
          planQty: Number(it.planQty) || 0,
          deliveryDate: it.deliveryDate || null,
          remark: it.remark || null,
        })),
      };
      if (dialog.mode === 'create') {
        await api.post('/sales/plans', payload);
      } else {
        await api.put(`/sales/plans/${data.id}`, payload);
      }
      setDialog({ open: false, mode: 'create', data: null });
      loadData();
    } catch (e) { alert(e.response?.data?.message || e.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('确认删除该销售计划？')) return;
    try { await api.delete(`/sales/plans/${id}`); loadData(); }
    catch (e) { alert(e.message); }
  };

  const handleSubmit = async (id) => {
    try { await api.put(`/sales/plans/${id}/submit`); loadData(); }
    catch (e) { alert(e.message); }
  };

  const handleApprove = async (id, approved) => {
    try { await api.put(`/sales/plans/${id}/approve`, { approved }); loadData(); }
    catch (e) { alert(e.message); }
  };

  const addItem = () => setDialog(d => ({
    ...d,
    data: { ...d.data, items: [...d.data.items, { customerId: '', materialId: '', gradeId: '', planQty: 1, deliveryDate: '', remark: '' }] },
  }));
  const removeItem = (idx) => setDialog(d => ({
    ...d,
    data: { ...d.data, items: d.data.items.filter((_, i) => i !== idx) },
  }));
  const updateItem = (idx, field, value) => setDialog(d => {
    const items = [...d.data.items];
    items[idx] = { ...items[idx], [field]: value };
    return { ...d, data: { ...d.data, items } };
  });

  // 未保存变更检测
  const hasFormChanges = () => {
    if (!dialog.open || !dialog.data) return false;
    const d = dialog.data;
    if (dialog.mode === 'edit' && dialogOriginal) {
      // 编辑模式：对比简单字段 + items 数组
      if (String(d.title ?? '') !== String(dialogOriginal.title ?? '')) return true;
      if (String(d.planType ?? '') !== String(dialogOriginal.planType ?? '')) return true;
      if (String(d.remark ?? '') !== String(dialogOriginal.remark ?? '')) return true;
      if (d.items?.length !== dialogOriginal.items?.length) return true;
      return d.items?.some((it, idx) => {
        const orig = dialogOriginal.items[idx];
        if (!orig) return true;
        return String(it.customerId ?? '') !== String(orig.customerId ?? '')
          || String(it.materialId ?? '') !== String(orig.materialId ?? '')
          || String(it.gradeId ?? '') !== String(orig.gradeId ?? '')
          || String(it.planQty ?? '') !== String(orig.planQty ?? '')
          || String(it.deliveryDate ?? '') !== String(orig.deliveryDate ?? '')
          || String(it.remark ?? '') !== String(orig.remark ?? '');
      });
    }
    // 新增模式：检查是否有实质性改动（排除自动生成的默认值）
    if (d.items?.length > 1) return true; // 添加了额外明细行
    if (d.items?.some(it => it.customerId || it.materialId)) return true; // 有选了客户或产品
    if (d.remark) return true;
    // title/planType 是自动生成的，不作为改动依据
    return false;
  };

  const handleCloseDialog = () => {
    if (hasFormChanges()) {
      setConfirmClose(true);
    } else {
      setDialog({ open: false, mode: 'create', data: null });
      setDialogOriginal(null);
    }
  };

  // 计划类型变化时重新生成标题
  const handlePlanTypeChange = (newType) => {
    setDialog(d => ({
      ...d,
      data: { ...d.data, planType: newType, title: genTitle(submitterName, newType) },
    }));
  };

  const openCreate = async () => {
    const defaultType = 'WEEKLY';
    setDialog({
      open: true,
      mode: 'create',
      data: {
        title: genTitle(submitterName, defaultType),
        planType: defaultType,
        departmentId: userDeptId,
        remark: '',
        items: [{ customerId: '', materialId: '', gradeId: '', planQty: 1, deliveryDate: '', remark: '' }],
      },
    });
  };

  const openEdit = async (row) => {
    // 获取详情（含 items）
    const res = await api.get(`/sales/plans/${row.id}`);
    const full = res.data;
    setDialog({
      open: true,
      mode: 'edit',
      data: {
        ...full,
        items: (full.items || []).map(it => ({
          customerId: it.customerId || '',
          materialId: it.materialId || '',
          gradeId: it.gradeId || '',
          planQty: it.planQty || 1,
          deliveryDate: it.deliveryDate ? new Date(it.deliveryDate).toISOString().slice(0, 10) : '',
          remark: it.remark || '',
        })),
      },
    });
    // 存储原始数据用于变更对比
    setDialogOriginal({
      title: full.title || '',
      planType: full.planType || 'WEEKLY',
      remark: full.remark || '',
      items: (full.items || []).map(it => ({
        customerId: it.customerId || '',
        materialId: it.materialId || '',
        gradeId: it.gradeId || '',
        planQty: it.planQty || 1,
        deliveryDate: it.deliveryDate ? new Date(it.deliveryDate).toISOString().slice(0, 10) : '',
        remark: it.remark || '',
      })),
    });
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>销售计划</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: showAggregated ? 0 : 0 }}>
          <TextField size="small" placeholder="编号/标题" value={keyword} onChange={e => setKeyword(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} sx={{ width: 160 }} />
          <TextField size="small" select label="状态" value={status} onChange={e => setStatus(e.target.value)} sx={{ width: 120 }}>
            <MenuItem value="">全部</MenuItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </TextField>
          <TextField size="small" select label="类型" value={filterPlanType} onChange={e => setFilterPlanType(e.target.value)} sx={{ width: 120 }}>
            <MenuItem value="">全部</MenuItem>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </TextField>
          <TextField size="small" select label="客户" value={filterCustomerId} onChange={e => setFilterCustomerId(e.target.value)} sx={{ width: 150 }}>
            <MenuItem value="">全部</MenuItem>
            {customers.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
          <TextField size="small" type="date" label="起始日期" value={filterDateStart} onChange={e => setFilterDateStart(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 140 }} />
          <TextField size="small" type="date" label="截止日期" value={filterDateEnd} onChange={e => setFilterDateEnd(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 140 }} />
          <Button variant="contained" onClick={loadData} size="small">查询</Button>
          <Button variant="outlined" size="small" startIcon={<RestartAlt />} onClick={() => { setKeyword(''); setStatus(''); setFilterPlanType(''); setFilterCustomerId(''); setFilterDateStart(''); setFilterDateEnd(''); }}>重置</Button>
          <Button variant="outlined" startIcon={<Add />} onClick={openCreate}>新增计划</Button>
        </Stack>
        {/* 筛选标签 */}
        {(() => {
          const chips = [];
          if (status) chips.push({ key: 'status', label: `状态: ${STATUS_LABELS[status]}`, onDelete: () => setStatus('') });
          if (filterPlanType) chips.push({ key: 'planType', label: `类型: ${TYPE_LABELS[filterPlanType]}`, onDelete: () => setFilterPlanType('') });
          if (filterCustomerId) { const c = customers.find(c => c.id === filterCustomerId); chips.push({ key: 'customerId', label: `客户: ${c?.name || filterCustomerId}`, onDelete: () => setFilterCustomerId('') }); }
          if (filterDateStart) chips.push({ key: 'dateStart', label: `起始: ${filterDateStart}`, onDelete: () => setFilterDateStart('') });
          if (filterDateEnd) chips.push({ key: 'dateEnd', label: `截止: ${filterDateEnd}`, onDelete: () => setFilterDateEnd('') });
          if (keyword) chips.push({ key: 'keyword', label: `关键词: ${keyword}`, onDelete: () => setKeyword('') });
          return chips.length > 0 ? (
            <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap' }}>
              {chips.map(c => <Chip key={c.key} label={c.label} size="small" onDelete={c.onDelete} />)}
            </Stack>
          ) : null;
        })()}
        <Box sx={{ mt: 1 }}>
          <Button
            size="small"
            variant={showAggregated ? 'outlined' : 'contained'}
            color={showAggregated ? 'default' : 'primary'}
            startIcon={<MergeType />}
            onClick={() => { setShowAggregated(v => !v); }}
            sx={{ whiteSpace: 'nowrap' }}
          >
            {showAggregated ? '显示全部（含已汇总）' : '仅显示未汇总'}
          </Button>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={{ width: 36 }} />
              <TableCell>计划编号</TableCell><TableCell>标题</TableCell><TableCell>类型</TableCell>
              <TableCell>提报人</TableCell><TableCell>部门</TableCell><TableCell>周期</TableCell>
              <TableCell>明细数</TableCell><TableCell>汇总状态</TableCell><TableCell>状态</TableCell><TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((r) => {
              const isOpen = expandedId === r.id;
              const detailItems = detailCache[r.id]?.items || [];
              const COL_COUNT = 11; // 展开图标列 + 10列数据
              return (
                <Fragment key={r.id}>
                  {/* === 主行 === */}
                  <TableRow
                    hover
                    sx={{ cursor: 'pointer', bgcolor: isOpen ? 'action.selected' : 'inherit' }}
                    onClick={() => handleRowExpand(r)}
                  >
                    <TableCell padding="checkbox" sx={{ width: 36 }}>
                      <IconButton size="small" sx={{ p: 0.5 }}>
                        {isOpen ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ fontWeight: isOpen ? 'bold' : 'normal' }}>{r.planNo}</TableCell>
                    <TableCell>{r.title}</TableCell>
                    <TableCell>{TYPE_LABELS[r.planType] || r.planType}</TableCell>
                    <TableCell>{r.salesRep?.name || '-'}</TableCell>
                    <TableCell>{r.department?.name || '-'}</TableCell>
                    <TableCell>{r.periodStart?.slice(0, 10)} ~ {r.periodEnd?.slice(0, 10)}</TableCell>
                    <TableCell>{r._count?.items || r.totalItems || 0}</TableCell>
                    <TableCell>
                      {r.aggStatus === 'ALL_PUSHED' ? (
                        <Chip label="已汇总" size="small" color="success" variant="outlined" />
                      ) : r.aggStatus === 'PARTIAL' ? (
                        <Chip label={`部分汇总 ${r.pushedItems}/${r.totalItems}`} size="small" color="warning" variant="outlined" />
                      ) : (
                        <Chip label="未汇总" size="small" color="info" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell><Chip label={STATUS_LABELS[r.status]} color={STATUS_COLORS[r.status]} size="small" /></TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0.5}>
                        {(r.status === 'DRAFT' || r.status === 'PENDING') && <>
                          <Button size="small" variant="contained" color="primary" onClick={() => openEdit(r)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>编辑</Button>
                          <Button size="small" variant="contained" color="error" onClick={() => handleDelete(r.id)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>删除</Button>
                        </>}
                        {r.status === 'PENDING' && <>
                          <Button size="small" variant="contained" color="success" onClick={() => handleApprove(r.id, true)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>通过</Button>
                          <Button size="small" variant="contained" color="error" onClick={() => handleApprove(r.id, false)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>拒绝</Button>
                        </>}
                      </Stack>
                    </TableCell>
                  </TableRow>

                  {/* === 展开明细行 === */}
                  {isOpen && (
                    <TableRow>
                      <TableCell colSpan={COL_COUNT} sx={{ py: 0, bgcolor: 'grey.50' }}>
                        {loadingDetail && !detailCache[r.id] ? (
                          <Box sx={{ textAlign: 'center', py: 3 }}>
                            <CircularProgress size={24} />
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>加载明细中...</Typography>
                          </Box>
                        ) : detailItems.length > 0 ? (
                          <Table size="small" sx={{ mt: 1, mb: 1 }}>
                            <TableHead>
                              <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', bgcolor: 'grey.100', fontSize: '0.75rem' } }}>
                                <TableCell>客户</TableCell>
                                <TableCell>产品</TableCell>
                                <TableCell>规格</TableCell>
                                <TableCell>等级</TableCell>
                                <TableCell>单位</TableCell>
                                <TableCell align="right">计划数量</TableCell>
                                <TableCell>发货时间</TableCell>
                                <TableCell>备注</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {detailItems.map(it => (
                                <TableRow key={it.id}>
                                  <TableCell>{it.customer?.name || '-'}</TableCell>
                                  <TableCell>{it.material?.name}</TableCell>
                                  <TableCell>{it.material?.spec || '-'}</TableCell>
                                  <TableCell>{it.grade?.name || '-'}</TableCell>
                                  <TableCell>{it.material?.salesUnit || it.material?.unit || '-'}</TableCell>
                                  <TableCell align="right">{it.planQty}</TableCell>
                                  <TableCell>{it.deliveryDate ? new Date(it.deliveryDate).toISOString().slice(0, 10) : '-'}</TableCell>
                                  <TableCell>{it.remark || '-'}</TableCell>
                                </TableRow>
                              ))}
                              <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', borderTop: '2px solid', borderColor: 'divider', fontSize: '0.75rem' } }}>
                                <TableCell colSpan={5}>合计</TableCell>
                                <TableCell align="right">{detailItems.reduce((s, it) => s + (Number(it.planQty) || 0), 0)}</TableCell>
                                <TableCell colSpan={2} />
                              </TableRow>
                            </TableBody>
                          </Table>
                        ) : (
                          <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                            暂无明细数据
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
            {list.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} align="center">
                  <Typography color="text.secondary" sx={{ py: 3 }}>暂无数据</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(e, p) => setPage(p)}
          onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
          labelRowsPerPage="每页行数："
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count !== -1 ? count : '超过'} 条`}
        />
      </TableContainer>

      {/* 编辑弹窗 */}
      <Dialog open={dialog.open} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>{dialog.mode === 'create' ? '新增销售计划' : '编辑销售计划'}</DialogTitle>
        <DialogContent>
          {dialog.data && (
            <Box sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="标题" value={dialog.data.title || ''} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, title: e.target.value } })} />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField fullWidth select label="计划类型" value={dialog.data.planType || 'WEEKLY'} onChange={e => handlePlanTypeChange(e.target.value)}>
                    <MenuItem value="WEEKLY">周计划</MenuItem>
                    <MenuItem value="MONTHLY">月计划</MenuItem>
                    <MenuItem value="QUARTERLY">季度计划</MenuItem>
                    <MenuItem value="YEARLY">年计划</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField fullWidth select label="部门" value={dialog.data.departmentId || ''} disabled
                    helperText="自动填充，不可编辑">
                    <MenuItem value={dialog.data.departmentId || ''}>{userDeptName || '未指定'}</MenuItem>
                  </TextField>
                </Grid>
                {/* 提报人 — 只读反填 */}
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="提报人" value={submitterName} disabled helperText="自动填充当前登录用户" />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="备注" multiline rows={1} value={dialog.data.remark || ''} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, remark: e.target.value } })} />
                </Grid>
              </Grid>

              {/* 明细编辑区 */}
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2">计划明细（按客户提报产品需求）</Typography>
                  <Button size="small" startIcon={<Add />} onClick={addItem} variant="outlined">添加明细</Button>
                </Box>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: '15%' }}>客户</TableCell>
                        <TableCell sx={{ width: '15%' }}>产品</TableCell>
                        <TableCell sx={{ width: '10%' }}>规格</TableCell>
                        <TableCell sx={{ width: '10%' }}>等级</TableCell>
                        <TableCell sx={{ width: '8%' }}>单位</TableCell>
                        <TableCell sx={{ width: '10%' }}>计划数量</TableCell>
                        <TableCell sx={{ width: '10%' }}>发货时间</TableCell>
                        <TableCell>备注</TableCell>
                        <TableCell sx={{ width: 50 }}> </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dialog.data.items?.map((it, idx) => {
                        const selectedMaterial = materials.find(m => m.id === it.materialId);
                        // 获取当前选中物料的关联等级作为下拉选项
                        const gradeOptions = selectedMaterial?.materialGrades?.map(mg => mg.grade) || [];
                        return (
                          <TableRow key={idx}>
                            <TableCell>
                              <TextField select size="small" fullWidth value={it.customerId} onChange={e => updateItem(idx, 'customerId', e.target.value)}>
                                <MenuItem value="">选择客户</MenuItem>
                                {customers.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                              </TextField>
                            </TableCell>
                            <TableCell>
                              <TextField
                                select size="small" fullWidth
                                value={it.materialId}
                                onChange={e => {
                                  // 切换物料时重置等级
                                  setDialog(d => {
                                    const items = [...d.data.items];
                                    items[idx] = { ...items[idx], materialId: e.target.value, gradeId: '' };
                                    return { ...d, data: { ...d.data, items } };
                                  });
                                }}
                              >
                                <MenuItem value="">选择产品</MenuItem>
                                {materials.map(m => (
                                  <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                                ))}
                              </TextField>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ pt: 1 }}>{selectedMaterial?.spec || '-'}</Typography>
                            </TableCell>
                            <TableCell>
                              <TextField
                                select size="small" fullWidth
                                value={it.gradeId || ''}
                                onChange={e => updateItem(idx, 'gradeId', e.target.value)}
                                disabled={!it.materialId || gradeOptions.length === 0}
                              >
                                <MenuItem value="">不选</MenuItem>
                                {gradeOptions.map(g => (
                                  <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                                ))}
                              </TextField>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ pt: 1 }}>{selectedMaterial?.salesUnit || selectedMaterial?.unit || '-'}</Typography>
                            </TableCell>
                            <TableCell>
                              <TextField size="small" type="number" fullWidth value={it.planQty} onChange={e => updateItem(idx, 'planQty', e.target.value)} />
                            </TableCell>
                            <TableCell>
                              <TextField size="small" type="date" fullWidth value={it.deliveryDate || ''} onChange={e => updateItem(idx, 'deliveryDate', e.target.value)} InputLabelProps={{ shrink: true }} />
                            </TableCell>
                            <TableCell>
                              <TextField size="small" fullWidth value={it.remark || ''} onChange={e => updateItem(idx, 'remark', e.target.value)} />
                            </TableCell>
                            <TableCell>
                              <IconButton size="small" color="error" onClick={() => removeItem(idx)} disabled={dialog.data.items.length <= 1}>
                                <RemoveCircleOutline fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button variant="contained" onClick={handleSave}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* ===== 关闭确认弹窗 ===== */}
      <Dialog open={confirmClose} onClose={() => setConfirmClose(false)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 600 }}>未保存的更改</DialogTitle>
        <DialogContent>
          <Typography>您有尚未保存的更改，确定要关闭吗？关闭后所有更改将丢失。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClose(false)}>继续编辑</Button>
          <Button
            onClick={() => { setConfirmClose(false); setDialog({ open: false, mode: 'create', data: null }); setDialogOriginal(null); }}
            color="error"
            variant="contained"
          >
            放弃更改
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
