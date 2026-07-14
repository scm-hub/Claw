import { useState, useEffect, useCallback, Fragment } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid, MenuItem, InputAdornment,
  TablePagination, Chip, Tooltip, Alert, CircularProgress, Tabs, Tab,
  Stack, FormControl, Select, Autocomplete,
} from '@mui/material';
import {
  Add, Edit, Delete, Search, CheckCircle, Send, AutoAwesome, PlaylistAddCheck,
  CallSplit, Forward, KeyboardArrowDown, KeyboardArrowUp, CallReceived,
  Inventory2, Description, SwapHoriz, RestartAlt, CancelPresentation,
} from '@mui/icons-material';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

// 获取本地日期字符串 YYYY-MM-DD（避免 toISOString 的 UTC 时区偏移问题）
const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
import { getDisplayUnit, getConversionDesc, needsConversion, formatQtyWithUnit } from '../../lib/unitConversion';

const STATUS_MAP = {
  DRAFT: { label: '草稿', color: 'default' },
  PENDING: { label: '待审批', color: 'warning' },
  APPROVED: { label: '已批准', color: 'success' },
  REJECTED: { label: '已驳回', color: 'error' },
  CONFIRMED: { label: '已确认', color: 'info' },
};

const PLAN_TYPE_MAP = {
  MONTHLY: '月度',
  QUARTERLY: '季度',
  WEEKLY: '周度',
};

export default function PurchasePlanList() {
  const user = useAuthStore((s) => s.user);
  const userDeptId = user?.employee?.departmentId || '';
  const userDeptName = user?.employee?.department?.name || '';

  // 主列表状态
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [planType, setPlanType] = useState('');
  const [stats, setStats] = useState({ total: 0, draft: 0, pending: 0, approved: 0 });

  // 弹窗与展开
  const [dialog, setDialog] = useState({ open: false, data: null });
  const [expanded, setExpanded] = useState({});
  const [form, setForm] = useState({ title: '', planType: 'MONTHLY', priceDate: localDate(), remark: '', items: [] });
  const [materials, setMaterials] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [grades, setGrades] = useState([]);

  // 确认弹窗
  const [confirmDialog, setConfirmDialog] = useState({ open: false, planId: '', planNo: '' });

  // 智能建议
  const [suggestDialog, setSuggestDialog] = useState({ open: false, loading: false, data: null, selected: {} });
  const [suggestDays, setSuggestDays] = useState(3);

  // 分配 & 转发
  const [allocateDialog, setAllocateDialog] = useState({ open: false, loading: false, result: null });
  const [forwardDialog, setForwardDialog] = useState({ open: false, loading: false, sourcePlan: null, items: [], selectedIds: [], targetUserId: '', purchasers: [] });

  // 驳回
  const [rejectDialog, setRejectDialog] = useState({ open: false, planId: '', planNo: '', reason: '' });

  // 未保存提示
  const [confirmClose, setConfirmClose] = useState(false);

  const hasFormChanges = () => {
    if (!dialog.open) return false;
    if (dialog.data) {
      // 编辑模式：对比简单字段 + items数组
      const orig = dialog.data;
      const simpleKeys = ['title', 'planType', 'priceDate', 'remark'];
      if (simpleKeys.some(k => String(form[k] ?? '') !== String(orig[k] ?? ''))) return true;
      // items数组对比
      const origItems = orig.items || [];
      const curItems = form.items || [];
      if (origItems.length !== curItems.length) return true;
      const itemKeys = ['materialId', 'planQty', 'unit', 'expectedDate', 'remark', 'supplierId', 'unitPrice', 'actualQty'];
      for (let i = 0; i < curItems.length; i++) {
        if (itemKeys.some(k => String(curItems[i][k] ?? '') !== String(origItems[i][k] ?? ''))) return true;
      }
      return false;
    }
    // 新增模式：表单有任何有意义的内容
    if (form.title || form.remark || form.priceDate) return true;
    if (form.items?.some(it => it.materialId || (it.planQty !== '' && it.planQty !== undefined) || it.remark || it.supplierId || (it.unitPrice !== '' && it.unitPrice !== undefined) || (it.actualQty !== '' && it.actualQty !== undefined))) return true;
    return false;
  };

  const handleCloseDialog = () => {
    if (hasFormChanges()) {
      setConfirmClose(true);
    } else {
      setDialog({ open: false, data: null });
    }
  };

  // 子计划数据 & 查询
  const [childrenData, setChildrenData] = useState({ allocated: [], forwarded: [] });
  const [activeTab, setActiveTab] = useState(0);

  // 已分配子计划筛选
  const [allocKeyword, setAllocKeyword] = useState('');
  const [allocStatus, setAllocStatus] = useState('');

  // 已转发子计划筛选
  const [forwardKeyword, setForwardKeyword] = useState('');
  const [forwardStatus, setForwardStatus] = useState('');

  const loadList = async (kw = keyword, st = status, pt = planType) => {
    try {
      const params = new URLSearchParams({ page: page + 1, pageSize: rowsPerPage, keyword: kw, status: st, planType: pt });
      const res = await api.get(`/purchase/plans?${params}`);
      setList(res.data.list || []);
      setTotal(res.data.total || 0);
      // 统计概览
      const all = res.data.list || [];
      setStats({
        total: res.data.total || 0,
        draft: all.filter(s => s.status === 'DRAFT').length,
        pending: all.filter(s => s.status === 'PENDING').length,
        approved: all.filter(s => s.status === 'APPROVED').length,
        confirmed: all.filter(s => s.status === 'CONFIRMED').length,
      });
    } catch (err) { console.error(err); }
  };

  const loadOptions = async () => {
    try {
      const [mRes, dRes, sRes, paRes, gRes] = await Promise.all([
        api.get('/master/materials?page=1&pageSize=999'),
        api.get('/master/departments'),
        api.get('/master/suppliers?page=1&pageSize=999'),
        api.get('/master/purchaser-assignments/my-materials'),
        api.get('/master/material-grades'),
      ]);
      const allMaterials = mRes.data.list || [];
      const paData = paRes.data || {};
      // restricted=true 表示有采购员分配，只显示分配的物料；否则看全部
      if (paData.restricted && paData.materialIds?.length > 0) {
        const idSet = new Set(paData.materialIds);
        setMaterials(allMaterials.filter(m => idSet.has(m.id)));
      } else {
        setMaterials(allMaterials);
      }
      setDepartments(dRes.data || []);
      setSuppliers(sRes.data.list || []);
      setGrades(gRes.data || []);
    } catch (err) { console.error(err); }
  };

  const loadChildren = async (kw = '', st = '') => {
    try {
      const params = new URLSearchParams({ keyword: kw, status: st });
      const res = await api.get(`/purchase/plans/children?${params}`);
      setChildrenData(res.data || { allocated: [], forwarded: [] });
    } catch (err) { console.error(err); }
  };

  useEffect(() => { loadList(); loadChildren(); }, [page, rowsPerPage, keyword, status, planType]);
  useEffect(() => { loadOptions(); }, []);

  const handleSearch = () => { setPage(0); };
  const handleReset = () => { setKeyword(''); setStatus(''); setPlanType(''); setPage(0); };
  const handleStatusChange = (val) => { setStatus(val); setPage(0); loadList(keyword, val, planType); };
  const handlePlanTypeChange = (val) => { setPlanType(val); setPage(0); loadList(keyword, status, val); };

  const handleAllocSearch = () => { loadChildren(allocKeyword, allocStatus); };
  const handleAllocReset = () => { setAllocKeyword(''); setAllocStatus(''); loadChildren(); };
  const handleForwardSearch = () => { loadChildren(forwardKeyword, forwardStatus); };
  const handleForwardReset = () => { setForwardKeyword(''); setForwardStatus(''); loadChildren(); };

  // 展开/收起（每次展开都重新请求最新数据）
  const toggleExpand = async (planId) => {
    const exp = expanded[planId] || {};
    if (exp.open) {
      // 当前展开 → 收起
      setExpanded(prev => ({ ...prev, [planId]: { ...prev[planId], open: false } }));
    } else {
      // 当前收起 → 展开并重新加载明细
      setExpanded(prev => ({ ...prev, [planId]: { open: true, loading: true, data: null } }));
      try {
        const res = await api.get(`/purchase/plans/${planId}`);
        setExpanded(prev => ({ ...prev, [planId]: { open: true, loading: false, data: res.data } }));
      } catch (err) {
        console.error(err);
        setExpanded(prev => ({ ...prev, [planId]: { open: false, loading: false, data: null } }));
      }
    }
  };

  const handleOpen = (data = null) => {
    if (data) {
      api.get(`/purchase/plans/${data.id}`).then((res) => {
        setForm({
          ...res.data,
          priceDate: res.data.priceDate?.slice(0, 10) || localDate(),
          items: res.data.items?.map((it) => ({ ...it, expectedDate: it.expectedDate?.slice(0, 10) || '' })) || [],
        });
        setDialog({ open: true, data });
      });
    } else {
      setForm({ title: '', planType: 'MONTHLY', priceDate: localDate(), departmentId: userDeptId, remark: '', items: [{ materialId: '', planQty: '', unit: '', gradeId: '', expectedDate: '', remark: '', supplierId: '', unitPrice: '', actualQty: '' }] });
      setDialog({ open: true, data: null });
    }
  };

  const handleSave = async () => {
    if (!form.departmentId) { alert('请选择部门'); return; }
    if (!form.title) { alert('请输入计划标题'); return; }
    if (!form.items || !form.items.length) { alert('至少需要一条明细'); return; }
    try {
      const payload = {
        ...form,
        priceDate: form.priceDate || localDate(),
        items: form.items.map(it => ({ ...it, planQty: it.planQty === '' || it.planQty === undefined ? 0 : Number(it.planQty) })),
      };
      if (dialog.data) {
        await api.put(`/purchase/plans/${dialog.data.id}`, payload);
      } else {
        await api.post('/purchase/plans', payload);
      }
      setDialog({ open: false, data: null });
      loadList();
    } catch (err) { alert(err.message); }
  };

  const handleApprove = async (id) => {
    if (!confirm('确认审批通过该采购计划？')) return;
    try { await api.put(`/purchase/plans/${id}/approve`); loadList(); } catch (err) { alert(err.message); }
  };

  const handleReject = (id, planNo) => {
    setRejectDialog({ open: true, planId: id, planNo, reason: '' });
  };

  const handleRejectConfirm = async () => {
    try {
      await api.put(`/purchase/plans/${rejectDialog.planId}/reject`, { rejectReason: rejectDialog.reason });
      setRejectDialog({ open: false, planId: '', planNo: '', reason: '' });
      loadList();
    } catch (err) { alert(err?.response?.data?.message || err.message); }
  };

  const handleSubmit = async (id) => {
    try { await api.put(`/purchase/plans/${id}/submit`); loadList(); } catch (err) { alert(err.message); }
  };

  // 确认采购计划（填写供应商/单价/实际采购数量后确认）
  const handleConfirm = async (id, planNo) => {
    // 先加载最新详情，验证三字段完整性
    try {
      const res = await api.get(`/purchase/plans/${id}`);
      const items = res.data.items || [];
      const incompleteItems = items.filter(it => !it.supplierId || !it.unitPrice || it.unitPrice <= 0 || !it.actualQty || it.actualQty <= 0);
      if (incompleteItems.length > 0) {
        const names = incompleteItems.map(it => {
          const matName = it.material?.name || it.material?.code || '未知物料';
          const missing = [];
          if (!it.supplierId) missing.push('供应商');
          if (!it.unitPrice || it.unitPrice <= 0) missing.push('单价');
          if (!it.actualQty || it.actualQty <= 0) missing.push('实际采购数量');
          const msg = missing.length > 0 ? `${matName}(${missing.join('、')}未填)` : `${matName}(建议填写等级)`;
          return msg;
        });
        alert(`以下明细未填写完整，无法确认:\n${names.join('\n')}\n请先填写采购详情后再确认。`);
        return;
      }
      setConfirmDialog({ open: true, planId: id, planNo });
    } catch (err) {
      alert(err?.data?.message || err.message);
    }
  };
  const handleConfirmSubmit = async () => {
    try {
      await api.put(`/purchase/plans/${confirmDialog.planId}/confirm`);
      setConfirmDialog({ open: false, planId: '', planNo: '' });
      loadList(); loadChildren();
    } catch (err) { alert(err?.data?.message || err?.response?.data?.message || err.message); }
  };

  // 保存采购计划明细的供应商/单价/实际采购数量
  const handleSaveItems = async (planId) => {
    console.log('[DEBUG] handleSaveItems called, planId:', planId, 'form.items:', form.items);

    // 检查是否有明细未填等级，给出友好提示但不强制
    const noGradeItems = form.items.filter(it => it.materialId && !it.gradeId);
    if (noGradeItems.length > 0) {
      const names = noGradeItems.map(it => {
        const matName = (materials.find(m => m.id === it.materialId)?.name) || '未知物料';
        return matName;
      }).join('、');
      if (!confirm(`以下物料等级还未填写，是否继续保存？\n${names}`)) {
        return;
      }
    }

    try {
      const items = form.items.map(it => ({
        id: it.id,
        supplierId: it.supplierId || null,
        unitPrice: it.unitPrice || 0,
        actualQty: it.actualQty || 0,
        gradeId: it.gradeId || null,
      }));
      console.log('[DEBUG] items payload:', items);
      const result = await api.put(`/purchase/plans/${planId}/items`, { items });
      console.log('[DEBUG] save items result:', result);
      // 关闭弹窗并刷新列表
      setDialog({ open: false, data: null });
      loadList();
    } catch (err) { 
      console.error('保存采购详情失败:', err);
      alert(err?.data?.message || err?.response?.data?.message || err.message); 
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除该采购计划？')) return;
    try { await api.delete(`/purchase/plans/${id}`); loadList(); } catch (err) { alert(err.message); }
  };

  const handleAllocate = async (id) => {
    if (!confirm('确认进行订单分配？将根据采购员管理的物料绑定关系，生成子采购计划单。')) return;
    setAllocateDialog({ open: true, loading: true, result: null });
    try {
      const res = await api.post(`/purchase/plans/${id}/allocate`);
      setAllocateDialog({ open: true, loading: false, result: res });
      loadList(); loadChildren();
    } catch (err) {
      const msg = err?.message || '分配失败';
      setAllocateDialog({ open: true, loading: false, result: { success: false, message: msg } });
    }
  };

  const handleOpenForward = async (item) => {
    try {
      const [planRes, assignmentRes] = await Promise.all([
        api.get(`/purchase/plans/${item.id}`),
        api.get('/master/purchaser-assignments?status=ACTIVE'),
      ]);
      const items = planRes.data.items || [];
      const purchasers = (assignmentRes.data || []).map((a) => a.user).filter(Boolean);
      setForwardDialog({ open: true, loading: false, sourcePlan: item, items, selectedIds: items.map((it) => it.id), targetUserId: '', purchasers });
    } catch (err) { alert(err.message); }
  };

  const handleForward = async () => {
    const { sourcePlan, selectedIds, targetUserId } = forwardDialog;
    if (!selectedIds.length) { alert('请至少选择一条明细'); return; }
    if (!targetUserId) { alert('请选择目标采购员'); return; }
    setForwardDialog({ ...forwardDialog, loading: true });
    try {
      const res = await api.post(`/purchase/plans/${sourcePlan.id}/forward`, { itemIds: selectedIds, targetUserId });
      alert(res.message || '转发成功');
      setForwardDialog({ open: false, loading: false, sourcePlan: null, items: [], selectedIds: [], targetUserId: '', purchasers: [] });
      loadList(); loadChildren();
    } catch (err) {
      alert(err?.message || '转发失败');
      setForwardDialog({ ...forwardDialog, loading: false });
    }
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { materialId: '', planQty: '', unit: '', expectedDate: '', remark: '', supplierId: '', unitPrice: '', actualQty: '' }] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  const updateItem = (idx, field, val) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: val };
    setForm({ ...form, items });
  };

  const handleLoadSuggest = async () => {
    setSuggestDialog({ open: true, loading: true, data: null, selected: {} });
    try {
      const res = await api.get(`/purchase/plans/suggest?days=${suggestDays}`);
      // api.js 直接返回 JSON，res = { success, data: { suggestions, ... } }
      const suggestData = res.data;
      const selected = {};
      (suggestData?.suggestions || []).forEach((s) => { selected[s.materialId] = true; });
      setSuggestDialog({ open: true, loading: false, data: suggestData, selected });
    } catch (e) { setSuggestDialog({ open: true, loading: false, data: null, selected: {} }); alert(e.message); }
  };

  const handleGenerateFromSuggest = async () => {
    const suggestions = suggestDialog.data?.suggestions || [];
    const selectedItems = suggestions
      .filter((s) => suggestDialog.selected[s.materialId])
      .map((s) => ({
        materialId: s.materialId, planQty: s.purchaseSuggestedQty || s.suggestedQty, unit: s.purchaseUnit || s.unit,
        suggestionNo: s.suggestionNo,
        remark: `智能建议: 日均销量${s.dailyAvgSales}${s.unit}, 安全库存${s.safetyStock}${s.unit}`,
      }));
    if (!selectedItems.length) { alert('请至少选择一条建议'); return; }
    try {
      const res = await api.post('/purchase/plans/from-suggestion', { items: selectedItems });
      alert('采购计划草稿已生成: ' + (res.data?.planNo || res.planNo || ''));
      setSuggestDialog({ open: false, loading: false, data: null, selected: {} });
      loadList();
    } catch (e) { alert(e.message); }
  };

  // 筛选条件判断
  const hasFilters = keyword || status;
  const hasAllocFilters = allocKeyword || allocStatus;
  const hasForwardFilters = forwardKeyword || forwardStatus;

  // 子计划统计（按父计划聚合后，统计的是父计划数量）
  const allocStats = { total: childrenData.allocated.length, draft: childrenData.allocated.filter(c => c.parentPlan?.status === 'DRAFT').length, approved: childrenData.allocated.filter(c => c.parentPlan?.status === 'APPROVED').length, confirmed: childrenData.allocated.filter(c => c.parentPlan?.status === 'CONFIRMED').length, pending: childrenData.allocated.filter(c => c.parentPlan?.status === 'PENDING').length };
  const forwardStats = { total: childrenData.forwarded.length, draft: childrenData.forwarded.filter(c => c.parentPlan?.status === 'DRAFT').length, approved: childrenData.forwarded.filter(c => c.parentPlan?.status === 'APPROVED').length, confirmed: childrenData.forwarded.filter(c => c.parentPlan?.status === 'CONFIRMED').length, pending: childrenData.forwarded.filter(c => c.parentPlan?.status === 'PENDING').length };

  return (
    <Box>
      {/* 标题 + 操作按钮 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>采购计划</Typography>
        <Box>
          <Button variant="outlined" startIcon={<AutoAwesome />} onClick={handleLoadSuggest} sx={{ mr: 1 }}>智能建议</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>新增采购计划</Button>
        </Box>
      </Box>

      {/* Tab 切换 */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 1, minHeight: 40, '& .MuiTab-root': { minHeight: 36, py: 0.5 } }}>
        <Tab icon={<Description />} iconPosition="start" label="采购计划" />
        <Tab icon={<CallSplit />} iconPosition="start" label={`已分配子计划（${childrenData.allocated.length}）`} />
        <Tab icon={<SwapHoriz />} iconPosition="start" label={`已转发子计划（${childrenData.forwarded.length}）`} />
      </Tabs>

      {/* ========== Tab 0: 采购计划主列表 ========== */}
      {activeTab === 0 && (
        <>
          {/* 统计概览 */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.100' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '10px !important' }}>
                  <Inventory2 color="primary" sx={{ fontSize: 32 }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>{stats.total}</Typography>
                    <Typography variant="caption" color="text.secondary">计划总数</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '10px !important' }}>
                  <Edit sx={{ fontSize: 32, color: 'grey.500' }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{stats.draft}</Typography>
                    <Typography variant="caption" color="text.secondary">草稿</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.100' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '10px !important' }}>
                  <Send color="warning" sx={{ fontSize: 32 }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'warning.main' }}>{stats.pending}</Typography>
                    <Typography variant="caption" color="text.secondary">待审批</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: 'success.50', border: '1px solid', borderColor: 'success.100' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '10px !important' }}>
                  <CheckCircle color="success" sx={{ fontSize: 32 }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>{stats.approved}</Typography>
                    <Typography variant="caption" color="text.secondary">已批准</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* 查询条件 - 紧凑单行 */}
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ pb: '12px !important', py: '8px !important' }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: 'nowrap' }}>
                <TextField
                  size="small" label="搜索（编号/标题）"
                  value={keyword} onChange={(e) => setKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  sx={{ width: 240 }}
                  InputProps={{ endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={handleSearch}><Search /></IconButton></InputAdornment> }}
                />
                <FormControl size="small" sx={{ width: 120 }}>
                  <Select value={status} displayEmpty onChange={(e) => handleStatusChange(e.target.value)}>
                    <MenuItem value="">全部状态</MenuItem>
                    {Object.entries(STATUS_MAP).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <Button variant="contained" size="small" startIcon={<Search />} onClick={handleSearch}>查询</Button>
                <Button variant="outlined" size="small" startIcon={<RestartAlt />} onClick={handleReset}>重置</Button>
                {hasFilters && <Chip size="small" label={`${[keyword && '关键词', status && STATUS_MAP[status]?.label].filter(Boolean).length}个筛选`} color="primary" variant="outlined" />}
              </Stack>

              {/* 当前筛选标签 */}
              {hasFilters && (
                <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                  {keyword && <Chip size="small" label={`关键词: ${keyword}`} onDelete={() => { setKeyword(''); handleSearch(); }} color="primary" variant="outlined" />}
                  {status && <Chip size="small" label={`状态: ${STATUS_MAP[status]?.label}`} onDelete={() => { setStatus(''); handleSearch(); }} color="primary" variant="outlined" />}
                </Stack>
              )}
            </CardContent>
          </Card>

          {/* 表格列表 */}
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100', '& .MuiTableCell-root': { fontWeight: 'bold' } }}>
                  <TableCell padding="checkbox" sx={{ width: 36 }} />
                  <TableCell>计划编号</TableCell>
                  <TableCell>标题</TableCell>
                  <TableCell>单据日期</TableCell>
                  <TableCell>制单人</TableCell>
                  <TableCell>部门</TableCell>
                  <TableCell>采购员</TableCell>
                  <TableCell>明细数</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.map((item) => {
                  const exp = expanded[item.id] || {};
                  const isOpen = !!exp.open;
                  const detail = exp.data;
                  return (
                    <Fragment key={item.id}>
                      <TableRow hover sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }} onClick={() => toggleExpand(item.id)}>
                        <TableCell padding="checkbox" sx={{ width: 36 }}>
                          <IconButton size="small" sx={{ p: 0.5 }}>
                            {isOpen ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                          </IconButton>
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: isOpen ? 'bold' : 'normal' }}>{item.planNo}</TableCell>
                        <TableCell sx={{ fontWeight: isOpen ? 'bold' : 'normal' }}>{item.title}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{item.priceDate?.slice(0, 10) || '-'}</TableCell>
                        <TableCell>{item.creator?.name || '-'}</TableCell>
                        <TableCell>{item.department?.name || '-'}</TableCell>
                        <TableCell>{item.assignee?.employee?.name || item.assignee?.username || '-'}</TableCell>
                        <TableCell>
                          <Chip size="small" label={item._count?.items || 0} color="primary" variant="outlined" />
                          {item._count?.childPlans > 0 && <Chip size="small" label={`子${item._count.childPlans}`} color="success" sx={{ ml: 0.5, height: 18, fontSize: 12 }} />}
                        </TableCell>
                        <TableCell><Chip size="small" label={STATUS_MAP[item.status]?.label || item.status} color={STATUS_MAP[item.status]?.color || 'default'} /></TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            {item.status === 'DRAFT' && <Button size="small" variant="contained" color="primary" onClick={() => handleOpen(item)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>编辑</Button>}
                            {(item.status === 'DRAFT' || item.status === 'REJECTED') && <Button size="small" variant="contained" color="info" onClick={() => handleSubmit(item.id)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>提交</Button>}
                            {item.status === 'REJECTED' && <Button size="small" variant="contained" color="warning" onClick={() => handleOpen(item)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>修改</Button>}
                            {item.status === 'PENDING' && <Button size="small" variant="contained" color="success" onClick={() => handleApprove(item.id)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>通过</Button>}
                            {item.status === 'PENDING' && <Button size="small" variant="contained" color="error" onClick={() => handleReject(item.id, item.planNo)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>驳回</Button>}
                            {item.status === 'APPROVED' && item.assignee?.id === user?.id && (
                              <Button size="small" variant="contained" color="info" onClick={() => handleOpen(item)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>详情</Button>
                            )}
                            {item.status === 'APPROVED' && item.assignee?.id === user?.id && (
                              <Button size="small" variant="contained" color="success" onClick={() => handleConfirm(item.id, item.planNo)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>确认</Button>
                            )}
                            {item.status === 'APPROVED' && !item.parentPlanId && item._count?.childPlans === 0 && (
                              <Button size="small" variant="contained" color="primary" onClick={() => handleAllocate(item.id)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>分配</Button>
                            )}
                            {item.status !== 'CONFIRMED' && <Button size="small" variant="contained" color="secondary" onClick={() => handleOpenForward(item)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>转发</Button>}
                            {item.status === 'DRAFT' && <Button size="small" variant="contained" color="error" onClick={() => handleDelete(item.id)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>删除</Button>}
                          </Stack>
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow>
                          <TableCell colSpan={10} sx={{ py: 0, bgcolor: 'grey.50' }}>
                            {exp.loading ? (
                              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={28} /></Box>
                            ) : detail ? (
                              <>
                                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 1, mb: 1.5 }}>
                                  {detail.parentPlan && <Typography variant="body2"><strong>父计划：</strong>{detail.parentPlan.planNo}</Typography>}
                                  {detail.approver && <Typography variant="body2"><strong>审批人：</strong>{detail.approver.name}</Typography>}
                                  <Typography variant="body2"><strong>创建人：</strong>{detail.creator?.name || '-'}</Typography>
                                  <Typography variant="body2"><strong>创建时间：</strong>{new Date(detail.createdAt).toLocaleString('zh-CN')}</Typography>
                                  {detail.remark && <Typography variant="body2"><strong>备注：</strong>{detail.remark}</Typography>}
                                </Box>
                                {detail.childPlans?.length > 0 && (
                                  <Box sx={{ mb: 1.5 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>子采购计划（{detail.childPlans.length} 个）</Typography>
                                    <TableContainer component={Paper} variant="outlined">
                                      <Table size="small">
                                        <TableHead>
                                          <TableRow sx={{ bgcolor: 'grey.100', '& .MuiTableCell-root': { fontWeight: 'bold' } }}>
                                            <TableCell>子计划编号</TableCell>
                                            <TableCell>标题</TableCell>
                                            <TableCell>采购员</TableCell>
                                            <TableCell>明细数</TableCell>
                                            <TableCell>状态</TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {detail.childPlans.map((child) => (
                                            <TableRow key={child.id} hover>
                                              <TableCell sx={{ fontFamily: 'monospace' }}>{child.planNo}</TableCell>
                                              <TableCell>{child.title}</TableCell>
                                              <TableCell>{child.assignee?.employee?.name || child.assignee?.username || '-'}</TableCell>
                                              <TableCell>{child._count?.items || 0}</TableCell>
                                              <TableCell><Chip size="small" label={STATUS_MAP[child.status]?.label || child.status} color={STATUS_MAP[child.status]?.color || 'default'} /></TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </TableContainer>
                                  </Box>
                                )}
                                <Table size="small" sx={{ mt: 1, mb: 1 }}>
                                  <TableHead>
                                    <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', bgcolor: 'grey.100' } }}>
                                      <TableCell>建议编号</TableCell>
                                      <TableCell>物料编码</TableCell><TableCell>物料名称</TableCell>
                                      <TableCell align="right">计划数量</TableCell><TableCell>单位</TableCell>
                                      <TableCell>等级</TableCell>
                                      <TableCell>供应商</TableCell>
                                      <TableCell align="right">单价</TableCell><TableCell align="right">实际采购数量</TableCell>
                                      <TableCell>到货日期</TableCell><TableCell>备注</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {detail.items?.map((it) => (
                                      <TableRow key={it.id} hover>
                                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{it.suggestionNo || '-'}</TableCell>
                                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{it.material?.code}</TableCell>
                                        <TableCell>{it.material?.name}</TableCell>
                                        <TableCell align="right">{it.planQty}</TableCell>
                                        <TableCell>{it.unit || '-'}{it.material && needsConversion(it.material, 'purchase') ? <Typography variant="caption" color="textSecondary">({getConversionDesc(it.material, 'purchase')})</Typography> : ''}</TableCell>
                                        <TableCell>{it.grade?.name || '-'}</TableCell>
                                        <TableCell>{it.supplier?.name || '-'}</TableCell>
                                        <TableCell align="right">{it.unitPrice ? Number(it.unitPrice).toFixed(2) : '-'}</TableCell>
                                        <TableCell align="right">{it.actualQty || '-'}</TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{it.expectedDate?.slice(0, 10) || '-'}</TableCell>
                                        <TableCell sx={{ fontSize: '0.82rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }} title={it.remark || ''}>{it.remark || '-'}</TableCell>
                                      </TableRow>
                                    ))}
                                    {(!detail.items || detail.items.length === 0) && (
                                      <TableRow><TableCell colSpan={10} align="center" sx={{ py: 2, color: 'text.secondary' }}>暂无明细</TableCell></TableRow>
                                    )}
                                    {detail.items?.length > 0 && (
                                      <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', borderTop: '2px solid', borderColor: 'divider' } }}>
                                        <TableCell colSpan={3}>合计</TableCell>
                                        <TableCell align="right">{detail.items.reduce((s, it) => s + Number(it.planQty), 0)}</TableCell>
                                        <TableCell />
                                        <TableCell />
                                        <TableCell align="right">{detail.items.reduce((s, it) => s + Number(it.unitPrice || 0), 0).toFixed(2)}</TableCell>
                                        <TableCell align="right">{detail.items.reduce((s, it) => s + Number(it.actualQty || 0), 0)}</TableCell>
                                        <TableCell colSpan={2} />
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </>
                            ) : (
                              <Typography color="text.secondary" sx={{ py: 1.5, textAlign: 'center' }}>加载失败</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
                {list.length === 0 && <TableRow><TableCell colSpan={10} align="center"><Typography color="text.secondary" sx={{ py: 3 }}>暂无数据</Typography></TableCell></TableRow>}
              </TableBody>
            </Table>
            <TablePagination
              component="div" count={total} page={page} rowsPerPage={rowsPerPage}
              onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={(e) => { setRowsPerPage(e.target.value); setPage(0); }}
              rowsPerPageOptions={[10, 20, 50]} labelRowsPerPage="每页行数："
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count !== -1 ? count : '超过'} 条`}
            />
          </TableContainer>
        </>
      )}

      {/* ========== Tab 1: 已分配子计划 ========== */}
      {activeTab === 1 && (
        <>
          {/* 统计概览 */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.100' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '10px !important' }}>
                  <CallSplit color="primary" sx={{ fontSize: 32 }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>{allocStats.total}</Typography>
                    <Typography variant="caption" color="text.secondary">父计划总数</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '10px !important' }}>
                  <Edit sx={{ fontSize: 32, color: 'grey.500' }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{allocStats.draft}</Typography>
                    <Typography variant="caption" color="text.secondary">父计划草稿</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.100' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '10px !important' }}>
                  <Send color="warning" sx={{ fontSize: 32 }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'warning.main' }}>{allocStats.pending}</Typography>
                    <Typography variant="caption" color="text.secondary">父计划待审批</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: 'success.50', border: '1px solid', borderColor: 'success.100' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '10px !important' }}>
                  <CheckCircle color="success" sx={{ fontSize: 32 }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>{allocStats.approved}</Typography>
                    <Typography variant="caption" color="text.secondary">父计划已批准</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* 查询条件 */}
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ pb: '12px !important', py: '8px !important' }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: 'nowrap' }}>
                <TextField
                  size="small" label="搜索（父计划编号/标题）"
                  value={allocKeyword} onChange={(e) => setAllocKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAllocSearch()}
                  sx={{ width: 280 }}
                  InputProps={{ endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={handleAllocSearch}><Search /></IconButton></InputAdornment> }}
                />
                <FormControl size="small" sx={{ width: 120 }}>
                  <Select value={allocStatus} displayEmpty onChange={(e) => { setAllocStatus(e.target.value); handleAllocSearch(); }}>
                    <MenuItem value="">全部状态</MenuItem>
                    {Object.entries(STATUS_MAP).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <Button variant="contained" size="small" startIcon={<Search />} onClick={handleAllocSearch}>查询</Button>
                <Button variant="outlined" size="small" startIcon={<RestartAlt />} onClick={handleAllocReset}>重置</Button>
                {hasAllocFilters && <Chip size="small" label={`${[allocKeyword && '关键词', allocStatus && STATUS_MAP[allocStatus]?.label].filter(Boolean).length}个筛选`} color="primary" variant="outlined" />}
              </Stack>

              {hasAllocFilters && (
                <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                  {allocKeyword && <Chip size="small" label={`关键词: ${allocKeyword}`} onDelete={() => { setAllocKeyword(''); handleAllocSearch(); }} color="primary" variant="outlined" />}
                  {allocStatus && <Chip size="small" label={`状态: ${STATUS_MAP[allocStatus]?.label}`} onDelete={() => { setAllocStatus(''); handleAllocSearch(); }} color="primary" variant="outlined" />}
                </Stack>
              )}
            </CardContent>
          </Card>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100', '& .MuiTableCell-root': { fontWeight: 'bold' } }}>
                  <TableCell>父计划编号</TableCell>
                  <TableCell>父计划标题</TableCell>
                  <TableCell>父计划状态</TableCell>
                  <TableCell>单据日期</TableCell>
                  <TableCell align="right">子计划数</TableCell>
                  <TableCell>子计划采购员</TableCell>
                  <TableCell>创建时间</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {childrenData.allocated.map((row) => (
                  <TableRow key={row.parentPlan.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{row.parentPlan.planNo}</TableCell>
                    <TableCell>{row.parentPlan.title}</TableCell>
                    <TableCell><Chip size="small" label={STATUS_MAP[row.parentPlan.status]?.label || row.parentPlan.status} color={STATUS_MAP[row.parentPlan.status]?.color || 'default'} /></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.parentPlan.priceDate?.slice(0, 10) || '-'}</TableCell>
                    <TableCell align="right"><Chip size="small" label={row.children.length} color="primary" /></TableCell>
                    <TableCell>{row.children.map(c => c.assignee?.employee?.name || c.assignee?.username || '-').join('、')}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.parentPlan.createdAt ? new Date(row.parentPlan.createdAt).toLocaleString('zh-CN') : '-'}</TableCell>
                  </TableRow>
                ))}
                {childrenData.allocated.length === 0 && (
                  <TableRow><TableCell colSpan={7} align="center"><Typography color="text.secondary" sx={{ py: 3 }}>暂无已分配记录</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* ========== Tab 2: 已转发子计划 ========== */}
      {activeTab === 2 && (
        <>
          {/* 统计概览 */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: 'secondary.50', border: '1px solid', borderColor: 'secondary.100' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '10px !important' }}>
                  <SwapHoriz color="secondary" sx={{ fontSize: 32 }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'secondary.main' }}>{forwardStats.total}</Typography>
                    <Typography variant="caption" color="text.secondary">父计划总数</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '10px !important' }}>
                  <Edit sx={{ fontSize: 32, color: 'grey.500' }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{forwardStats.draft}</Typography>
                    <Typography variant="caption" color="text.secondary">父计划草稿</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.100' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '10px !important' }}>
                  <Send color="warning" sx={{ fontSize: 32 }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'warning.main' }}>{forwardStats.pending}</Typography>
                    <Typography variant="caption" color="text.secondary">父计划待审批</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: 'success.50', border: '1px solid', borderColor: 'success.100' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '10px !important' }}>
                  <CheckCircle color="success" sx={{ fontSize: 32 }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>{forwardStats.approved}</Typography>
                    <Typography variant="caption" color="text.secondary">父计划已批准</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* 查询条件 */}
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ pb: '12px !important', py: '8px !important' }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: 'nowrap' }}>
                <TextField
                  size="small" label="搜索（父计划编号/标题）"
                  value={forwardKeyword} onChange={(e) => setForwardKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleForwardSearch()}
                  sx={{ width: 280 }}
                  InputProps={{ endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={handleForwardSearch}><Search /></IconButton></InputAdornment> }}
                />
                <FormControl size="small" sx={{ width: 120 }}>
                  <Select value={forwardStatus} displayEmpty onChange={(e) => { setForwardStatus(e.target.value); handleForwardSearch(); }}>
                    <MenuItem value="">全部状态</MenuItem>
                    {Object.entries(STATUS_MAP).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <Button variant="contained" size="small" startIcon={<Search />} onClick={handleForwardSearch}>查询</Button>
                <Button variant="outlined" size="small" startIcon={<RestartAlt />} onClick={handleForwardReset}>重置</Button>
                {hasForwardFilters && <Chip size="small" label={`${[forwardKeyword && '关键词', forwardStatus && STATUS_MAP[forwardStatus]?.label].filter(Boolean).length}个筛选`} color="primary" variant="outlined" />}
              </Stack>

              {hasForwardFilters && (
                <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                  {forwardKeyword && <Chip size="small" label={`关键词: ${forwardKeyword}`} onDelete={() => { setForwardKeyword(''); handleForwardSearch(); }} color="primary" variant="outlined" />}
                  {forwardStatus && <Chip size="small" label={`状态: ${STATUS_MAP[forwardStatus]?.label}`} onDelete={() => { setForwardStatus(''); handleForwardSearch(); }} color="primary" variant="outlined" />}
                </Stack>
              )}
            </CardContent>
          </Card>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100', '& .MuiTableCell-root': { fontWeight: 'bold' } }}>
                  <TableCell>父计划编号</TableCell>
                  <TableCell>父计划标题</TableCell>
                  <TableCell>父计划状态</TableCell>
                  <TableCell>单据日期</TableCell>
                  <TableCell align="right">子计划数</TableCell>
                  <TableCell>子计划采购员</TableCell>
                  <TableCell>创建时间</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {childrenData.forwarded.map((row) => (
                  <TableRow key={row.parentPlan.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{row.parentPlan.planNo}</TableCell>
                    <TableCell>{row.parentPlan.title}</TableCell>
                    <TableCell><Chip size="small" label={STATUS_MAP[row.parentPlan.status]?.label || row.parentPlan.status} color={STATUS_MAP[row.parentPlan.status]?.color || 'default'} /></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.parentPlan.priceDate?.slice(0, 10) || '-'}</TableCell>
                    <TableCell align="right"><Chip size="small" label={row.children.length} color="primary" /></TableCell>
                    <TableCell>{row.children.map(c => c.assignee?.employee?.name || c.assignee?.username || '-').join('、')}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.parentPlan.createdAt ? new Date(row.parentPlan.createdAt).toLocaleString('zh-CN') : '-'}</TableCell>
                  </TableRow>
                ))}
                {childrenData.forwarded.length === 0 && (
                  <TableRow><TableCell colSpan={7} align="center"><Typography color="text.secondary" sx={{ py: 3 }}>暂无已转发记录</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* 新增/编辑弹窗 / 填写采购详情弹窗 */}
      <Dialog open={dialog.open} onClose={handleCloseDialog} maxWidth={false} fullWidth
        PaperProps={{ sx: { maxWidth: '1600px', maxHeight: '85vh' } }}>
        <DialogTitle sx={{ pb: 1 }}>
          {dialog.data?.status === 'APPROVED' ? '填写采购详情 — ' + (dialog.data?.planNo || '') : dialog.data ? '编辑采购计划' : '新增采购计划'}
        </DialogTitle>
        <DialogContent>
          {dialog.data?.status === 'APPROVED' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              请为每条明细填写供应商、单价、实际采购数量，填写完毕后点击"确认采购计划"按钮提交确认。
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}><TextField fullWidth size="small" label="计划标题" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} disabled={dialog.data?.status === 'APPROVED'} /></Grid>
            <Grid item xs={3}>
              <TextField fullWidth size="small" label="制单人" value={user?.employee?.name || user?.username || '当前用户'} disabled helperText="自动获取当前用户" />
            </Grid>
            <Grid item xs={3}>
              <TextField fullWidth size="small" label="部门" value={userDeptName || '未绑定部门'} disabled helperText="自动获取当前用户部门" />
            </Grid>
            <Grid item xs={3}><TextField fullWidth size="small" type="date" label="单据日期" InputLabelProps={{ shrink: true }} value={form.priceDate || ''} onChange={(e) => setForm({ ...form, priceDate: e.target.value })} disabled={dialog.data?.status === 'APPROVED'} /></Grid>
            <Grid item xs={6}><TextField fullWidth size="small" label="备注" value={form.remark || ''} onChange={(e) => setForm({ ...form, remark: e.target.value })} disabled={dialog.data?.status === 'APPROVED'} /></Grid>
          </Grid>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2">采购明细</Typography>
            {dialog.data?.status !== 'APPROVED' && <Button size="small" startIcon={<Add />} onClick={addItem}>添加明细</Button>}
          </Box>
          <Table size="small" sx={{ mt: 1 }}>
            <TableHead><TableRow>
              <TableCell sx={{ width: 260 }}>物料</TableCell>
              <TableCell sx={{ width: 80 }}>计划数量</TableCell>
              <TableCell sx={{ width: 60 }}>单位</TableCell>
              {dialog.data?.status === 'APPROVED' && <>
                <TableCell sx={{ width: 180 }}>供应商</TableCell>
                <TableCell sx={{ width: 100 }}>单价</TableCell>
                <TableCell sx={{ width: 100 }}>实际采购数量</TableCell>
                <TableCell sx={{ width: 120 }}>等级</TableCell>
              </>}
              <TableCell sx={{ width: 180 }}>到货日期</TableCell>
              <TableCell sx={{ width: 140 }}>备注</TableCell>
              {dialog.data?.status !== 'APPROVED' && <TableCell sx={{ width: 50 }}>操作</TableCell>}
            </TableRow></TableHead>
            <TableBody>
              {form.items?.map((it, idx) => {
                const selectedMaterial = materials.find((m) => m.id === it.materialId);
                return (
                <TableRow key={idx}>
                  <TableCell sx={{ width: 260 }}>
                    <Autocomplete
                      size="small"
                      options={materials}
                      getOptionLabel={(m) => m.name || ''}
                      isOptionEqualToValue={(option, value) => option.id === value?.id}
                      value={materials.find((m) => m.id === it.materialId) || null}
                      onChange={(e, newValue) => {
                        const mat = newValue;
                        const leadTime = mat?.purchaseLeadTime || 0;
                        const defaultArrivalDate = leadTime > 0
                          ? localDate(new Date(Date.now() + leadTime * 86400000))
                          : localDate();
                        const items = [...form.items];
                        items[idx] = { ...items[idx], materialId: mat?.id || '', unit: mat ? getDisplayUnit(mat, 'purchase') : '', expectedDate: items[idx].expectedDate || defaultArrivalDate };
                        setForm({ ...form, items });
                      }}
                      filterOptions={(options, state) => {
                        const kw = state.inputValue.toLowerCase();
                        if (!kw) return options;
                        return options.filter((m) =>
                          m.name.toLowerCase().includes(kw) || m.code.toLowerCase().includes(kw) || (m.spec || '').toLowerCase().includes(kw)
                        );
                      }}
                      renderInput={(params) => <TextField {...params} placeholder="输入物料名称搜索" sx={{ width: 250 }} />}
                      renderOption={(props, m) => (
                        <li {...props}>
                          <Typography variant="body2">{m.name}</Typography>
                          {m.spec && <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>{m.spec}</Typography>}
                          <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>({m.code})</Typography>
                        </li>
                      )}
                      disabled={dialog.data?.status === 'APPROVED'}
                      sx={{ width: 250 }}
                    />
                  </TableCell>
                  <TableCell sx={{ width: 80 }}>
                    <TextField size="small" type="number" value={it.planQty ?? ''} placeholder="0"
                      onChange={(e) => updateItem(idx, 'planQty', e.target.value === '' ? '' : Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      inputProps={{ min: 0 }}
                      disabled={dialog.data?.status === 'APPROVED'}
                      sx={{ width: 70 }} />
                  </TableCell>
                  <TableCell sx={{ width: 55 }}>
                    <TextField size="small" value={it.unit || ''} onChange={(e) => updateItem(idx, 'unit', e.target.value)} disabled sx={{ width: 50 }} />
                  </TableCell>
                  {dialog.data?.status === 'APPROVED' && <>
                    <TableCell sx={{ width: 180 }}>
                      <Autocomplete
                        size="small"
                        options={suppliers}
                        getOptionLabel={(s) => s.name || ''}
                        isOptionEqualToValue={(option, value) => option.id === value?.id}
                        value={suppliers.find((s) => s.id === it.supplierId) || null}
                        onChange={(e, newValue) => updateItem(idx, 'supplierId', newValue?.id || '')}
                        renderInput={(params) => <TextField {...params} placeholder="选择供应商" sx={{ width: 170 }} />}
                        sx={{ width: 170 }}
                      />
                    </TableCell>
                    <TableCell sx={{ width: 100 }}>
                      <TextField size="small" type="number" value={it.unitPrice ?? ''} placeholder="0"
                        onChange={(e) => updateItem(idx, 'unitPrice', e.target.value === '' ? '' : Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        inputProps={{ min: 0, step: '0.01' }}
                        sx={{ width: 90 }} />
                    </TableCell>
                    <TableCell sx={{ width: 100 }}>
                      <TextField size="small" type="number" value={it.actualQty ?? ''} placeholder="0"
                        onChange={(e) => updateItem(idx, 'actualQty', e.target.value === '' ? '' : Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        inputProps={{ min: 0 }}
                        sx={{ width: 90 }} />
                    </TableCell>
                    <TableCell sx={{ width: 120 }}>
                      <Select
                        size="small"
                        value={it.gradeId || ''}
                        onChange={(e) => updateItem(idx, 'gradeId', e.target.value)}
                        displayEmpty
                        sx={{ width: 110, height: 32 }}
                      >
                        <MenuItem value="">请选择</MenuItem>
                        {(materials.find((m) => m.id === it.materialId)?.materialGrades || []).map((mg) => (
                          <MenuItem key={mg.grade.id} value={mg.grade.id}>{mg.grade.name}</MenuItem>
                        ))}
                      </Select>
                    </TableCell>
                  </>}
                  <TableCell sx={{ width: 180 }}><TextField size="small" type="date" InputLabelProps={{ shrink: true }} value={it.expectedDate || ''} onChange={(e) => updateItem(idx, 'expectedDate', e.target.value)} disabled={dialog.data?.status === 'APPROVED'} sx={{ width: 160 }} /></TableCell>
                  <TableCell sx={{ width: 140 }}><TextField size="small" value={it.remark || ''} onChange={(e) => updateItem(idx, 'remark', e.target.value)} sx={{ width: 130 }} /></TableCell>
                  {dialog.data?.status !== 'APPROVED' && <TableCell sx={{ width: 50 }}><IconButton size="small" color="error" onClick={() => removeItem(idx)}><Delete fontSize="small" /></IconButton></TableCell>}
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          {dialog.data?.status === 'APPROVED' ? (
            <Button variant="contained" onClick={(e) => { console.log('[DEBUG] 保存按钮被点击, dialog.data:', dialog.data, 'planId:', dialog.data?.id); handleSaveItems(dialog.data.id); }}>保存采购详情</Button>
          ) : (
            <Button variant="contained" onClick={handleSave}>保存</Button>
          )}
        </DialogActions>
      </Dialog>

      {/* 智能建议弹窗 */}
      <Dialog open={suggestDialog.open} onClose={() => setSuggestDialog({ open: false, loading: false, data: null, selected: {} })} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesome color="primary" /> 采购计划智能建议
          </Box>
        </DialogTitle>
        <DialogContent>
          {suggestDialog.loading ? (
            <Typography sx={{ py: 4, textAlign: 'center' }}>分析中...</Typography>
          ) : suggestDialog.data ? (
            <>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={3}><Card><CardContent>
                  <Typography variant="caption">分析周期</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <TextField type="number" size="small" value={suggestDays} onChange={(e) => setSuggestDays(Number(e.target.value) || 3)} sx={{ width: 80 }} inputProps={{ min: 1, max: 365 }} />
                    <Typography variant="body2">天</Typography>
                    <Button size="small" variant="outlined" onClick={handleLoadSuggest} disabled={suggestDialog.loading}>重新分析</Button>
                  </Box>
                </CardContent></Card></Grid>
                <Grid item xs={3}><Card><CardContent><Typography variant="caption">建议采购项</Typography><Typography variant="h6">{suggestDialog.data.totalItems}</Typography></CardContent></Card></Grid>
              </Grid>
              {suggestDialog.data.suggestions.length === 0 ? (
                <Typography sx={{ py: 4, textAlign: 'center' }} color="textSecondary">当前无采购建议，所有物料库存充足</Typography>
              ) : (
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead><TableRow>
                      <TableCell padding="checkbox"></TableCell>
                      <TableCell>编号</TableCell>
                      <TableCell>物料</TableCell><TableCell>日均销量</TableCell>
                      <TableCell>当前库存</TableCell><TableCell>可用天数</TableCell>
                      <TableCell>安全库存(采购周期)</TableCell>
                      <TableCell>最大库存(采购周期+1)</TableCell>
                      <TableCell>建议采购量</TableCell>
                    </TableRow></TableHead>
                    <TableBody>
                      {suggestDialog.data.suggestions.map((s) => {
                        const stockDaysColor = s.stockDays === null ? 'default'
                          : s.stockDays <= 7 ? 'error'
                          : s.stockDays <= 14 ? 'warning'
                          : 'success';
                        return (
                        <TableRow key={s.materialId} hover>
                          <TableCell padding="checkbox">
                            <input type="checkbox" checked={!!suggestDialog.selected[s.materialId]}
                              onChange={(e) => setSuggestDialog({ ...suggestDialog, selected: { ...suggestDialog.selected, [s.materialId]: e.target.checked } })} />
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap', fontSize: 12 }}>{s.suggestionNo}</TableCell>
                          <TableCell>{s.materialCode} {s.materialName}</TableCell>
                          <TableCell>{s.dailyAvgSales} {s.unit}</TableCell>
                          <TableCell>{s.currentStock} {s.unit}{needsConversion(s, 'purchase') ? <Typography variant="caption" color="textSecondary">({getConversionDesc(s, 'purchase')})</Typography> : ''}</TableCell>
                          <TableCell>
                            {s.stockDays === null
                              ? <Chip size="small" label="无销量" variant="outlined" />
                              : <Chip size="small" label={`${s.stockDays}天`} color={stockDaysColor} variant={s.stockDays <= 14 ? 'filled' : 'outlined'} />}
                          </TableCell>
                          <TableCell>{s.safetyStock} {s.unit}<Typography variant="caption" color="textSecondary">({s.purchaseLeadTime}天)</Typography></TableCell>
                          <TableCell>{s.maxStock} {s.unit}<Typography variant="caption" color="textSecondary">({s.purchaseLeadTime + 1}天)</Typography></TableCell>
                          <TableCell><strong>{s.purchaseSuggestedQty || s.suggestedQty} {s.purchaseUnit || s.unit}</strong>{needsConversion(s, 'purchase') ? <Typography variant="caption" color="textSecondary" sx={{ ml: 0.5 }}>({getConversionDesc(s, 'purchase')})</Typography> : ''}</TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                算法说明: 无销量历史时日均按1件估算。建议采购量 = 安全库存 - 当前库存。安全库存 = 日均销量 × 采购周期。采购周期取各物料的"采购周期(天)"字段
              </Typography>
            </>
          ) : (
            <Typography sx={{ py: 4, textAlign: 'center' }} color="error">加载失败</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuggestDialog({ open: false, loading: false, data: null, selected: {} })}>取消</Button>
          <Button variant="contained" startIcon={<PlaylistAddCheck />} onClick={handleGenerateFromSuggest} disabled={!suggestDialog.data || suggestDialog.data.suggestions.length === 0}>生成采购计划</Button>
        </DialogActions>
      </Dialog>

      {/* 订单分配结果弹窗 */}
      <Dialog open={allocateDialog.open} onClose={() => setAllocateDialog({ open: false, loading: false, result: null })} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>订单分配结果</DialogTitle>
        <DialogContent>
          {allocateDialog.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : allocateDialog.result ? (
            allocateDialog.result.success ? (
              <Box>
                <Alert severity="success" sx={{ mb: 2 }}>{allocateDialog.result.message}</Alert>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>生成的子采购计划：</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.100', '& .MuiTableCell-root': { fontWeight: 'bold' } }}>
                        <TableCell>子计划编号</TableCell><TableCell>标题</TableCell><TableCell>分配采购员</TableCell><TableCell>明细数</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {allocateDialog.result.data?.children?.map((child) => (
                        <TableRow key={child.id} hover>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{child.planNo}</TableCell>
                          <TableCell>{child.title}</TableCell>
                          <TableCell>{child.assignee?.employee?.name || child.assignee?.username}</TableCell>
                          <TableCell>{child._count?.items || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {allocateDialog.result.data?.unassignedMaterials?.length > 0 && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    以下 {allocateDialog.result.data.unassignedMaterials.length} 个物料未匹配到采购员：
                    {allocateDialog.result.data.unassignedMaterials.map((m) => ` ${m.code}(${m.name})`).join('、')}
                  </Alert>
                )}
              </Box>
            ) : (
              <Alert severity="error">{allocateDialog.result.message || '分配失败'}</Alert>
            )
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setAllocateDialog({ open: false, loading: false, result: null })}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 转发弹窗 */}
      <Dialog open={forwardDialog.open} onClose={() => setForwardDialog({ open: false, loading: false, sourcePlan: null, items: [], selectedIds: [], targetUserId: '', purchasers: [] })} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>转发采购计划 - {forwardDialog.sourcePlan?.planNo}</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>选择需要转发的明细，并指定目标采购员。系统将生成新的采购计划，备注中会记录转发信息。</Alert>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <TextField select fullWidth size="small" label="目标采购员" value={forwardDialog.targetUserId} onChange={(e) => setForwardDialog({ ...forwardDialog, targetUserId: e.target.value })}>
                <MenuItem value="">请选择</MenuItem>
                {forwardDialog.purchasers.map((u) => <MenuItem key={u.id} value={u.id}>{u.employee?.name || u.username} ({u.role})</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">已选 {forwardDialog.selectedIds.length} / {forwardDialog.items.length} 条明细</Typography>
            </Grid>
          </Grid>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100', '& .MuiTableCell-root': { fontWeight: 'bold' } }}>
                  <TableCell padding="checkbox"><input type="checkbox" checked={forwardDialog.selectedIds.length === forwardDialog.items.length && forwardDialog.items.length > 0} onChange={(e) => setForwardDialog({ ...forwardDialog, selectedIds: e.target.checked ? forwardDialog.items.map((it) => it.id) : [] })} /></TableCell>
                  <TableCell>物料编码</TableCell><TableCell>物料名称</TableCell><TableCell>规格型号</TableCell>
                  <TableCell align="right">计划数量</TableCell><TableCell>单位</TableCell><TableCell>到货日期</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {forwardDialog.items.map((it) => (
                  <TableRow key={it.id} hover>
                    <TableCell padding="checkbox"><input type="checkbox" checked={forwardDialog.selectedIds.includes(it.id)} onChange={(e) => { const ids = e.target.checked ? [...forwardDialog.selectedIds, it.id] : forwardDialog.selectedIds.filter((id) => id !== it.id); setForwardDialog({ ...forwardDialog, selectedIds: ids }); }} /></TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{it.material?.code}</TableCell>
                    <TableCell>{it.material?.name}</TableCell>
                    <TableCell>{it.material?.spec || '-'}</TableCell>
                    <TableCell align="right">{it.planQty}</TableCell>
                    <TableCell>{it.unit || '-'}</TableCell>
                    <TableCell>{it.expectedDate?.slice(0, 10) || '-'}</TableCell>
                  </TableRow>
                ))}
                {!forwardDialog.items.length && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>暂无明细</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForwardDialog({ open: false, loading: false, sourcePlan: null, items: [], selectedIds: [], targetUserId: '', purchasers: [] })}>取消</Button>
          <Button variant="contained" startIcon={forwardDialog.loading ? <CircularProgress size={16} /> : <Forward />} onClick={handleForward} disabled={forwardDialog.loading || !forwardDialog.selectedIds.length || !forwardDialog.targetUserId}>
            {forwardDialog.loading ? '转发中...' : '确认转发'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 驳回弹窗 */}
      <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, planId: '', planNo: '', reason: '' })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>驳回采购计划 - {rejectDialog.planNo}</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            驳回后计划将变为「已驳回」状态，采购员需修改后重新提交审批。
          </Alert>
          <TextField
            fullWidth multiline rows={3} size="small" label="驳回原因（选填）"
            value={rejectDialog.reason} onChange={(e) => setRejectDialog({ ...rejectDialog, reason: e.target.value })}
            placeholder="请输入驳回原因，方便采购员了解问题并修改..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog({ open: false, planId: '', planNo: '', reason: '' })}>取消</Button>
          <Button variant="contained" color="error" startIcon={<CancelPresentation />} onClick={handleRejectConfirm}>确认驳回</Button>
        </DialogActions>
      </Dialog>

      {/* ===== 确认采购计划弹窗 ===== */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, planId: '', planNo: '' })} maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 600 }}>确认采购计划</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            确认后采购计划将变为「已确认」状态，即可出现在采购订单的新增列表中。
            请确保每条明细的供应商、单价、实际采购数量已填写完整。
          </Alert>
          <Typography>采购计划编号：<strong>{confirmDialog.planNo}</strong></Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, planId: '', planNo: '' })}>取消</Button>
          <Button variant="contained" color="success" startIcon={<CheckCircle />} onClick={handleConfirmSubmit}>确认</Button>
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
          <Button onClick={() => { setConfirmClose(false); setDialog({ open: false, data: null }); }} color="error" variant="contained">放弃更改</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
