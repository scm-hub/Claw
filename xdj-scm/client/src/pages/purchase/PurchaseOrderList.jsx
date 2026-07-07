import { useState, useEffect, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid, MenuItem, InputAdornment,
  TablePagination, Chip, Tooltip, Checkbox, Accordion, AccordionSummary,
  AccordionDetails, Divider, Alert, CircularProgress, Stack, FormControl, Select,
} from '@mui/material';
import {
  Add, Edit, Delete, Search, CheckCircle, ShoppingCart, RestartAlt,
  ExpandMore, KeyboardArrowDown, KeyboardArrowUp,
} from '@mui/icons-material';
import api from '../../lib/api';

const STATUS_MAP = {
  PENDING: { label: '待审批', color: 'warning' },
  APPROVED: { label: '已批准', color: 'info' },
  ORDERED: { label: '已下单', color: 'primary' },
  RECEIVING: { label: '收货中', color: 'info' },
  CLOSED: { label: '已关闭', color: 'success' },
  CANCELLED: { label: '已取消', color: 'error' },
};

export default function PurchaseOrderList() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [filterSupplierId, setFilterSupplierId] = useState('');
  const [filterWarehouseId, setFilterWarehouseId] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [detailDialog, setDetailDialog] = useState({ open: false, data: null });

  // 基础数据
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  // 新增采购订单 — 全屏弹窗
  const [createOpen, setCreateOpen] = useState(false);
  const [orderForm, setOrderForm] = useState({
    supplierId: '', warehouseId: '',
    orderDate: new Date().toISOString().slice(0, 10),
    expectedDate: '', notes: '',
  });
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedItems, setSelectedItems] = useState({});
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState('');
  const [autoSelectAll, setAutoSelectAll] = useState(false); // 是否自动全选

  // 编辑弹窗（主信息 + 明细管理）
  const [editDialog, setEditDialog] = useState({ open: false, data: null });
  const [editForm, setEditForm] = useState({});
  const [editItems, setEditItems] = useState([]); // 已有明细列表
  const [editAvailablePlans, setEditAvailablePlans] = useState([]); // 可追加的计划明细
  const [editLoadingPlans, setEditLoadingPlans] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editAddOpen, setEditAddOpen] = useState(false); // 追加明细的展开区域
  const [editSelected, setEditSelected] = useState({}); // 要追加的新明细

  // 展开行
  const [expandedId, setExpandedId] = useState(null);

  // 未保存提示 — 新增弹窗
  const [confirmCreateClose, setConfirmCreateClose] = useState(false);
  // 未保存提示 — 编辑弹窗
  const [confirmEditClose, setConfirmEditClose] = useState(false);
  // 编辑弹窗原始明细（用于对比）
  const [editItemsOriginal, setEditItemsOriginal] = useState([]);

  const hasCreateChanges = () => {
    if (!createOpen) return false;
    // 已选采购计划明细 = 有改动
    if (Object.keys(selectedItems).length > 0) return true;
    // 表单字段有值
    if (orderForm.supplierId !== '') return true;
    if (orderForm.warehouseId !== '') return true;
    if (orderForm.expectedDate !== '') return true;
    if (orderForm.notes !== '') return true;
    return false;
  };

  const handleCloseCreate = () => {
    if (hasCreateChanges()) {
      setConfirmCreateClose(true);
    } else {
      setCreateOpen(false);
    }
  };

  const hasEditChanges = () => {
    if (!editDialog.open || !editDialog.data) return false;
    const orig = editDialog.data;
    // 对比简单字段
    if (String(editForm.supplierId ?? '') !== String(orig.supplierId ?? '')) return true;
    if (String(editForm.warehouseId ?? '') !== String(orig.warehouseId ?? '')) return true;
    if (String(editForm.expectedDate ?? '') !== String((orig.expectedDate?.slice(0, 10) ?? ''))) return true;
    if (String(editForm.notes ?? '') !== String(orig.notes ?? '')) return true;
    // 对比明细数量
    if (editItems.length !== editItemsOriginal.length) return true;
    // 对比明细字段
    for (let i = 0; i < Math.min(editItems.length, editItemsOriginal.length); i++) {
      if (String(editItems[i].qty ?? '') !== String(editItemsOriginal[i].qty ?? '')) return true;
      if (String(editItems[i].unitPrice ?? '') !== String(editItemsOriginal[i].unitPrice ?? '')) return true;
      if (String(editItems[i].remark ?? '') !== String(editItemsOriginal[i].remark ?? '')) return true;
    }
    // 有待追加的明细
    if (Object.keys(editSelected).length > 0) return true;
    return false;
  };

  const handleCloseEdit = () => {
    if (hasEditChanges()) {
      setConfirmEditClose(true);
    } else {
      setEditDialog({ open: false, data: null });
    }
  };

  const loadList = async (kw = keyword, st = status, sid = filterSupplierId, wid = filterWarehouseId, ds = filterDateStart, de = filterDateEnd) => {
    try {
      const params = new URLSearchParams({ page: page + 1, pageSize: rowsPerPage, keyword: kw, status: st, supplierId: sid, warehouseId: wid, dateStart: ds, dateEnd: de });
      const res = await api.get(`/purchase/orders?${params}`);
      setList(res.data.list || []);
      setTotal(res.data.total || 0);
    } catch (err) { console.error(err); }
  };

  const loadOptions = async () => {
    try {
      const [sRes, wRes] = await Promise.all([
        api.get('/master/suppliers?page=1&pageSize=999'),
        api.get('/master/warehouses'),
      ]);
      setSuppliers(sRes.data.list || []);
      setWarehouses(wRes.data || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { loadList(); }, [page, rowsPerPage, keyword, status, filterSupplierId, filterWarehouseId, filterDateStart, filterDateEnd]);
  useEffect(() => { loadOptions(); }, []);

  const handleSearch = () => { setPage(0); };
  const handleReset = () => { setKeyword(''); setStatus(''); setFilterSupplierId(''); setFilterWarehouseId(''); setFilterDateStart(''); setFilterDateEnd(''); setPage(0); loadList('', '', '', '', '', ''); };
  const handleFilterStatusChange = (val) => { setStatus(val); setPage(0); loadList(keyword, val, filterSupplierId, filterWarehouseId, filterDateStart, filterDateEnd); };
  const handleSupplierChange = (val) => { setFilterSupplierId(val); setPage(0); loadList(keyword, status, val, filterWarehouseId, filterDateStart, filterDateEnd); };
  const handleWarehouseChange = (val) => { setFilterWarehouseId(val); setPage(0); loadList(keyword, status, filterSupplierId, val, filterDateStart, filterDateEnd); };

  const hasFilters = keyword || status || filterSupplierId || filterWarehouseId || filterDateStart || filterDateEnd;

  // ============ 新增采购订单 ============

  const loadAvailablePlans = async (supplierId = '') => {
    setLoadingPlans(true);
    setCreateError('');
    try {
      const params = supplierId ? `?supplierId=${supplierId}` : '';
      const res = await api.get(`/purchase/orders/available-plans${params}`);
      setAvailablePlans(res.data || []);
      
      // 如果传入了supplierId，自动全选所有过滤后的明细
      if (supplierId && res.data && res.data.length > 0) {
        const allItems = {};
        res.data.forEach((plan) => {
          plan.items.forEach((it) => {
            allItems[it.id] = {
              planItemId: it.id,
              planId: it.planId,
              materialId: it.materialId,
              materialCode: it.material?.code,
              materialName: it.material?.name,
              materialSpec: it.material?.spec,
              unit: it.unit || it.material?.unit,
              qty: it.remainingQty,
              unitPrice: Number(it.unitPrice) || Number(it.budgetUnitPrice) || 0,
              remark: '',
              planNo: plan.planNo,
              grade: it.grade,
            };
          });
        });
        setSelectedItems(allItems);
      }
    } catch (err) {
      setCreateError('加载可下单计划失败: ' + err.message);
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleOpenCreate = async () => {
    setOrderForm({
      supplierId: '', warehouseId: '',
      orderDate: new Date().toISOString().slice(0, 10),
      expectedDate: '', notes: '',
    });
    setSelectedItems({});
    setCreateError('');
    setCreateOpen(true);
    setAutoSelectAll(false);
    await loadAvailablePlans();
  };

  const handleToggleItem = (planItem) => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      if (next[planItem.id]) {
        delete next[planItem.id];
      } else {
        next[planItem.id] = {
          planItemId: planItem.id,
          planId: planItem.planId,
          materialId: planItem.materialId,
          materialCode: planItem.material?.code,
          materialName: planItem.material?.name,
          materialSpec: planItem.material?.spec,
          unit: planItem.unit || planItem.material?.unit,
          qty: planItem.remainingQty,
          unitPrice: Number(planItem.unitPrice) || Number(planItem.budgetUnitPrice) || 0,
          remark: '',
          planNo: '',
        };
        // 自动填充供应商（如果订单供应商未选择且计划明细有供应商）
        if (planItem.supplierId && !orderForm.supplierId) {
          setOrderForm(prev => ({ ...prev, supplierId: planItem.supplierId }));
        }
      }
      return next;
    });
  };

  const handleItemFieldChange = (planItemId, field, value) => {
    setSelectedItems((prev) => ({
      ...prev,
      [planItemId]: { ...prev[planItemId], [field]: value },
    }));
  };

  const selectedArray = useMemo(() => Object.values(selectedItems), [selectedItems]);

  const summary = useMemo(() => {
    let totalAmount = 0;
    for (const it of selectedArray) {
      totalAmount += (Number(it.qty) || 0) * (Number(it.unitPrice) || 0);
    }
    return { totalAmount, count: selectedArray.length };
  }, [selectedArray]);


  const handleCreateOrder = async () => {
    if (!orderForm.supplierId) { setCreateError('请选择供应商'); return; }
    if (!orderForm.warehouseId) { setCreateError('请选择收货仓库'); return; }
    if (!orderForm.expectedDate) { setCreateError('请填写到货日期'); return; }
    if (selectedArray.length === 0) { setCreateError('请至少选择一条采购计划明细'); return; }
    const zeroPriceItems = selectedArray.filter((it) => !Number(it.unitPrice) || Number(it.unitPrice) === 0);
    if (zeroPriceItems.length > 0) {
      const names = zeroPriceItems.map((it) => it.materialName).join('、');
      setCreateError(`以下物料单价为0，请检查后再创建：${names}`);
      return;
    }

    setSaving(true);
    setCreateError('');
    try {
      await api.post('/purchase/orders', {
        supplierId: orderForm.supplierId,
        warehouseId: orderForm.warehouseId,
        orderDate: orderForm.orderDate,
        expectedDate: orderForm.expectedDate || undefined,
        notes: orderForm.notes || undefined,
        items: selectedArray.map((it) => ({
          planItemId: it.planItemId,
          materialId: it.materialId,
          gradeId: it.grade?.id || undefined,
          qty: Number(it.qty),
          unitPrice: Number(it.unitPrice),
          remark: it.remark || undefined,
        })),
      });
      setCreateOpen(false);
      loadList();
    } catch (err) {
      setCreateError(err.message || '创建失败');
    } finally {
      setSaving(false);
    }
  };

  // ============ 编辑（主信息 + 明细管理） ============

  const handleOpenEdit = async (data) => {
    setEditForm({
      id: data.id,
      supplierId: data.supplierId,
      warehouseId: data.warehouseId,
      expectedDate: data.expectedDate?.slice(0, 10) || '',
      notes: data.notes || '',
    });
    try {
      const res = await api.get(`/purchase/orders/${data.id}`);
      setEditItems(res.data.items || []);
      setEditItemsOriginal(res.data.items || []); // 保存原始明细用于变更对比
    } catch (err) {
      setEditItems(data.items || []);
    }
    setEditSelected({});
    setEditAddOpen(false);
    setEditAvailablePlans([]);
    setEditDialog({ open: true, data });
  };

  const handleLoadEditPlans = async () => {
    setEditLoadingPlans(true);
    try {
      const res = await api.get('/purchase/orders/available-plans');
      setEditAvailablePlans(res.data || []);
    } catch (err) {
      alert('加载可下单计划失败: ' + err.message);
    } finally {
      setEditLoadingPlans(false);
    }
  };

  const handleToggleEditAdd = (planItem) => {
    setEditSelected((prev) => {
      const next = { ...prev };
      if (next[planItem.id]) {
        delete next[planItem.id];
      } else {
        next[planItem.id] = {
          planItemId: planItem.id,
          materialId: planItem.materialId,
          qty: planItem.remainingQty,
          unitPrice: Number(planItem.unitPrice) || Number(planItem.budgetUnitPrice) || 0,
          remark: '',
        };
      }
      return next;
    });
  };

  const handleEditAddFieldChange = (planItemId, field, value) => {
    setEditSelected((prev) => ({
      ...prev,
      [planItemId]: { ...prev[planItemId], [field]: value },
    }));
  };

  const handleEditItemChange = (idx, field, value) => {
    setEditItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleRemoveEditItem = (idx) => {
    setEditItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleConfirmAddItems = () => {
    const newItems = Object.values(editSelected).map((it) => {
      const plan = editAvailablePlans.flatMap((p) => p.items).find((pi) => pi.id === it.planItemId);
      const parentPlan = editAvailablePlans.find((p) => p.items.some((pi) => pi.id === it.planItemId));
      return {
        id: null,
        planItemId: it.planItemId,
        materialId: it.materialId,
        material: plan?.material,
        planItem: { plan: { planNo: parentPlan?.planNo } },
        qty: Number(it.qty) || 0,
        unitPrice: Number(it.unitPrice) || 0,
        remark: it.remark || '',
      };
    });
    setEditItems((prev) => [...prev, ...newItems]);
    setEditSelected({});
    setEditAddOpen(false);
  };

  const handleSaveEdit = async () => {
    // 如果有未确认的追加明细（勾选了但没点"确认追加"），自动合并
    let allItems = [...editItems];
    if (Object.keys(editSelected).length > 0) {
      const pendingNew = Object.values(editSelected).map((it) => {
        const plan = editAvailablePlans.flatMap((p) => p.items).find((pi) => pi.id === it.planItemId);
        const parentPlan = editAvailablePlans.find((p) => p.items.some((pi) => pi.id === it.planItemId));
        return {
          id: null,
          planItemId: it.planItemId,
          materialId: it.materialId,
          material: plan?.material,
          planItem: { plan: { planNo: parentPlan?.planNo } },
          qty: Number(it.qty) || 0,
          unitPrice: Number(it.unitPrice) || 0,
          remark: it.remark || '',
        };
      });
      allItems = [...allItems, ...pendingNew];
    }

    if (!editForm.expectedDate) { alert('请填写到货日期'); setEditSaving(false); return; }
    const zeroPriceItems = allItems.filter((it) => !Number(it.unitPrice) || Number(it.unitPrice) === 0);
    if (zeroPriceItems.length > 0) {
      const names = zeroPriceItems.map((it) => it.material?.name || it.materialName).join('、');
      alert(`以下物料单价为0，请检查后再保存：${names}`);
      setEditSaving(false);
      return;
    }

    setEditSaving(true);
    try {
      const itemsPayload = allItems.map((it) => ({
        id: it.id || undefined,
        planItemId: it.planItemId || null,
        materialId: it.materialId || it.material?.id,
        qty: Number(it.qty) || 0,
        unitPrice: Number(it.unitPrice) || 0,
        remark: it.remark || '',
      }));
      await api.put(`/purchase/orders/${editForm.id}`, {
        supplierId: editForm.supplierId,
        warehouseId: editForm.warehouseId,
        expectedDate: editForm.expectedDate || undefined,
        notes: editForm.notes,
        items: itemsPayload,
      });
      setEditDialog({ open: false, data: null });
      loadList();
    } catch (err) {
      alert(err.message || '保存失败');
    } finally {
      setEditSaving(false);
    }
  };

  const editSummary = useMemo(() => {
    const totalAmount = editItems.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0);
    return { count: editItems.length, totalAmount };
  }, [editItems]);


  // ============ 状态流转 / 删除 / 详情 ============

  const handleStatusChange = async (id, newStatus) => {
    if (!confirm(`确认将订单状态变更为「${STATUS_MAP[newStatus]?.label || newStatus}」？`)) return;
    try {
      const res = await api.put(`/purchase/orders/${id}/status`, { status: newStatus });
      loadList();
      if (res.message) alert(res.message);
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除该采购订单？')) return;
    try { await api.delete(`/purchase/orders/${id}`); loadList(); } catch (err) { alert(err.message); }
  };

  const handleViewDetail = async (id) => {
    try {
      const res = await api.get(`/purchase/orders/${id}`);
      setDetailDialog({ open: true, data: res.data });
    } catch (err) { alert(err.message); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">采购订单</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreate}>新增采购订单</Button>
      </Box>

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ pb: '12px !important', py: '8px !important' }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: 'nowrap' }}>
            <TextField
              size="small" label="搜索（订单编号/供应商）"
              value={keyword} onChange={(e) => setKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              sx={{ width: 240 }}
              InputProps={{ endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={handleSearch}><Search /></IconButton></InputAdornment> }}
            />
            <FormControl size="small" sx={{ width: 120 }}>
              <Select value={status} displayEmpty onChange={(e) => handleFilterStatusChange(e.target.value)}>
                <MenuItem value="">全部状态</MenuItem>
                {Object.entries(STATUS_MAP).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField select size="small" label="供应商" value={filterSupplierId} onChange={(e) => handleSupplierChange(e.target.value)} sx={{ width: 180 }}>
              <MenuItem value="">全部供应商</MenuItem>
              {suppliers.map((s) => <MenuItem key={s.id} value={s.id}>{s.code} - {s.name}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="仓库" value={filterWarehouseId} onChange={(e) => handleWarehouseChange(e.target.value)} sx={{ width: 160 }}>
              <MenuItem value="">全部仓库</MenuItem>
              {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.code} - {w.name}</MenuItem>)}
            </TextField>
            <TextField size="small" type="date" label="起始日期" InputLabelProps={{ shrink: true }} value={filterDateStart} onChange={(e) => { setFilterDateStart(e.target.value); setPage(0); loadList(keyword, status, filterSupplierId, filterWarehouseId, e.target.value, filterDateEnd); }} sx={{ width: 150 }} />
            <TextField size="small" type="date" label="截止日期" InputLabelProps={{ shrink: true }} value={filterDateEnd} onChange={(e) => { setFilterDateEnd(e.target.value); setPage(0); loadList(keyword, status, filterSupplierId, filterWarehouseId, filterDateStart, e.target.value); }} sx={{ width: 150 }} />
            <Button variant="contained" size="small" startIcon={<Search />} onClick={handleSearch}>查询</Button>
            <Button variant="outlined" size="small" startIcon={<RestartAlt />} onClick={handleReset}>重置</Button>
            {hasFilters && <Chip size="small" label={`${[keyword && '关键词', status && STATUS_MAP[status]?.label, filterSupplierId && '供应商', filterWarehouseId && '仓库', (filterDateStart || filterDateEnd) && '日期'].filter(Boolean).length}个筛选`} color="primary" variant="outlined" />}
          </Stack>

          {/* 当前筛选标签 */}
          {hasFilters && (
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
              {keyword && <Chip size="small" label={`关键词: ${keyword}`} onDelete={() => { setKeyword(''); handleSearch(); }} color="primary" variant="outlined" />}
              {status && <Chip size="small" label={`状态: ${STATUS_MAP[status]?.label}`} onDelete={() => { handleFilterStatusChange(''); }} color="primary" variant="outlined" />}
              {filterSupplierId && <Chip size="small" label={`供应商: ${suppliers.find(s => s.id === filterSupplierId)?.name || filterSupplierId}`} onDelete={() => { handleSupplierChange(''); }} color="primary" variant="outlined" />}
              {filterWarehouseId && <Chip size="small" label={`仓库: ${warehouses.find(w => w.id === filterWarehouseId)?.name || filterWarehouseId}`} onDelete={() => { handleWarehouseChange(''); }} color="primary" variant="outlined" />}
              {filterDateStart && <Chip size="small" label={`起始: ${filterDateStart}`} onDelete={() => { setFilterDateStart(''); handleSearch(); }} color="primary" variant="outlined" />}
              {filterDateEnd && <Chip size="small" label={`截止: ${filterDateEnd}`} onDelete={() => { setFilterDateEnd(''); handleSearch(); }} color="primary" variant="outlined" />}
            </Stack>
          )}
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={{ width: 36 }} />
              <TableCell>订单编号</TableCell><TableCell>供应商</TableCell><TableCell>仓库</TableCell>
              <TableCell>下单日期</TableCell><TableCell>明细数</TableCell>
              <TableCell>总金额</TableCell><TableCell>收货状态</TableCell><TableCell>状态</TableCell><TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((item) => {
              const isOpen = expandedId === item.id;
              return (
                <>
                  <TableRow
                    key={item.id}
                    hover
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => setExpandedId(isOpen ? null : item.id)}
                  >
                    <TableCell padding="checkbox" sx={{ width: 36 }}>
                      <IconButton size="small" sx={{ p: 0.5 }}>
                        {isOpen ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ fontWeight: isOpen ? 'bold' : 'normal' }}>{item.orderNo}</TableCell>
                    <TableCell>{item.supplier?.name}</TableCell>
                    <TableCell>{item.warehouse?.name}</TableCell>
                    <TableCell>{item.orderDate?.slice(0, 10)}</TableCell>
                    <TableCell>
                      <Chip size="small" label={item.items?.length || 0} color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>{Number(item.totalAmount).toFixed(2)}</TableCell>
                    <TableCell>{item.receiptStatus === 'FULL' ? '已全收' : item.receiptStatus === 'PARTIAL' ? '部分收货' : '未收货'}</TableCell>
                    <TableCell><Chip size="small" label={STATUS_MAP[item.status]?.label || item.status} color={STATUS_MAP[item.status]?.color || 'default'} /></TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0.5}>
                        {item.status === 'PENDING' && <Button size="small" variant="contained" color="primary" onClick={() => handleOpenEdit(item)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>编辑</Button>}
                        {item.status === 'PENDING' && <Button size="small" variant="contained" color="success" onClick={() => handleStatusChange(item.id, 'ORDERED')} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>批准</Button>}
                        {item.status === 'PENDING' && <Button size="small" variant="contained" color="error" onClick={() => handleDelete(item.id)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>删除</Button>}
                      </Stack>
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow key={`${item.id}-detail`}>
                      <TableCell colSpan={10} sx={{ py: 0, bgcolor: 'grey.50' }}>
                        {item.items?.length > 0 ? (
                          <Table size="small" sx={{ mt: 1, mb: 1 }}>
                            <TableHead>
                              <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', bgcolor: 'grey.100' } }}>
                                <TableCell>采购计划单号</TableCell>
                                <TableCell>物料编码</TableCell>
                                <TableCell>物料名称</TableCell>
                                <TableCell>规格</TableCell>
                                <TableCell>等级</TableCell>
                                <TableCell>单位</TableCell>
                                <TableCell align="right">数量</TableCell>
                                <TableCell align="right">单价</TableCell>
                                <TableCell align="right">总金额</TableCell>
                                <TableCell>备注</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {item.items.map((it) => (
                                <TableRow key={it.id}>
                                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                    {it.planItem?.plan?.planNo ? (
                                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                                        {it.planItem.plan.planNo}
                                      </Typography>
                                    ) : '-'}
                                  </TableCell>
                                  <TableCell>{it.material?.code}</TableCell>
                                  <TableCell>{it.material?.name}</TableCell>
                                  <TableCell>{it.material?.spec || '-'}</TableCell>
                                  <TableCell>{it.grade?.name || '-'}</TableCell>
                                  <TableCell>{it.material?.unit || '-'}</TableCell>
                                  <TableCell align="right">{it.qty}</TableCell>
                                  <TableCell align="right">{Number(it.unitPrice).toFixed(2)}</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>{Number(it.totalAmount).toFixed(2)}</TableCell>
                                  <TableCell>{it.remark || '-'}</TableCell>
                                </TableRow>
                              ))}
                              <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', borderTop: '2px solid', borderColor: 'divider' } }}>
                                <TableCell colSpan={6}>合计</TableCell>
                                <TableCell align="right">{item.items.reduce((s, it) => s + Number(it.qty), 0)}</TableCell>
                                <TableCell />
                                <TableCell align="right" sx={{ color: 'primary.main' }}>{Number(item.totalAmount).toFixed(2)}</TableCell>
                                <TableCell />
                              </TableRow>
                            </TableBody>
                          </Table>
                        ) : (
                          <Typography color="text.secondary" sx={{ py: 1.5, textAlign: 'center' }}>暂无明细数据</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
            {list.length === 0 && <TableRow><TableCell colSpan={10} align="center"><Typography color="text.secondary" sx={{ py: 3 }}>暂无数据</Typography></TableCell></TableRow>}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(e.target.value); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage="每页行数："
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count !== -1 ? count : '超过'} 条`}
        />
      </TableContainer>

      {/* ==================== 新增采购订单 ==================== */}
      <Dialog open={createOpen} onClose={handleCloseCreate} maxWidth="xl" fullWidth
        PaperProps={{ sx: { height: '90vh', maxHeight: '92vh', display: 'flex', flexDirection: 'column' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, px: 2, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>新增采购订单</Typography>
          <Button size="small" onClick={handleCloseCreate}>关闭</Button>
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
          {createError && <Alert severity="error" sx={{ m: 1.5, py: 0.5 }} onClose={() => setCreateError('')}>{createError}</Alert>}

          {/* ===== 上半部：主信息（紧凑） ===== */}
          <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={3}>
                <TextField select fullWidth size="small" label="供应商" value={orderForm.supplierId} 
                  onChange={(e) => {
                    const newSupplierId = e.target.value;
                    setOrderForm({ ...orderForm, supplierId: newSupplierId });
                    // 重新加载可用计划并按供应商过滤
                    if (createOpen) {
                      if (newSupplierId) {
                        loadAvailablePlans(newSupplierId);
                      } else {
                        // 清空供应商选择时，显示所有可用计划并清空选择
                        setSelectedItems({});
                        loadAvailablePlans();
                      }
                    }
                  }}
                >
                  <MenuItem value="">选择供应商</MenuItem>
                  {suppliers.map((s) => <MenuItem key={s.id} value={s.id}>{s.code} - {s.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={3}>
                <TextField select fullWidth size="small" label="收货仓库" value={orderForm.warehouseId} onChange={(e) => setOrderForm({ ...orderForm, warehouseId: e.target.value })}>
                  <MenuItem value="">选择仓库</MenuItem>
                  {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.code} - {w.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={2}>
                <TextField fullWidth size="small" type="date" label="下单日期" InputLabelProps={{ shrink: true }} value={orderForm.orderDate} onChange={(e) => setOrderForm({ ...orderForm, orderDate: e.target.value })} />
              </Grid>
              <Grid item xs={2}>
                <TextField fullWidth size="small" type="date" label="到货日期" required InputLabelProps={{ shrink: true }} value={orderForm.expectedDate} onChange={(e) => setOrderForm({ ...orderForm, expectedDate: e.target.value })} />
              </Grid>
              <Grid item xs={2}>
                <TextField fullWidth size="small" label="备注" value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} />
              </Grid>
            </Grid>
          </Box>

          {/* ===== 下半部：可下单采购计划明细（滚动区） ===== */}
          <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <ShoppingCart fontSize="small" color="primary" />
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>选择采购计划明细</Typography>
              <Chip size="small" label={`已选 ${summary.count} 条`} color="primary" />
            </Box>

            {loadingPlans ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
            ) : availablePlans.length === 0 ? (
              <Alert severity="info" sx={{ py: 0.5 }}>暂无可下单的采购计划明细（需要已确认且未完全下单的采购计划）</Alert>
            ) : (
              availablePlans.map((plan) => (
                <Accordion key={plan.id} defaultExpanded sx={{ mb: 0.5, '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMore />} sx={{ py: 0.5, minHeight: 40, '& .MuiAccordionSummary-content': { my: 0 } }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: '100%' }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{plan.planNo}</Typography>
                      <Typography variant="caption" color="text.secondary">{plan.title}</Typography>
                      <Chip size="small" label={`${plan.items.length} 条可选`} variant="outlined" sx={{ height: 20 }} />
                      {plan.assignee && (
                        <Chip size="small" label={plan.assignee.employee?.name || plan.assignee.username} color="info" variant="outlined" sx={{ height: 20 }} />
                      )}
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1 } }}>
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox"></TableCell>
                          <TableCell>物料编码</TableCell><TableCell>物料名称</TableCell><TableCell>规格</TableCell>
                          <TableCell>等级</TableCell>
                          <TableCell>供应商</TableCell>
                          <TableCell>单位</TableCell><TableCell align="right">实际采购量</TableCell>
                          <TableCell align="right">已下单</TableCell><TableCell align="right">可下单</TableCell>
                          <TableCell align="right">确认单价</TableCell>
                          <TableCell align="right">下单数量</TableCell>
                          <TableCell align="right">单价</TableCell>
                          <TableCell align="right">总金额</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {plan.items.map((it) => {
                          const checked = !!selectedItems[it.id];
                          const sel = selectedItems[it.id] || {
                            qty: it.remainingQty,
                            unitPrice: Number(it.budgetUnitPrice) || 0,
                          };
                          const lineTotal = (Number(sel.qty) || 0) * (Number(sel.unitPrice) || 0);
                          return (
                            <TableRow key={it.id} hover selected={checked}>
                              <TableCell padding="checkbox">
                                <Checkbox checked={checked} onChange={() => handleToggleItem(it)} size="small" sx={{ p: 0.5 }} />
                              </TableCell>
                              <TableCell>{it.material?.code}</TableCell>
                              <TableCell>{it.material?.name}</TableCell>
                              <TableCell>{it.material?.spec || '-'}</TableCell>
                              <TableCell>{it.grade?.name || '-'}</TableCell>
                              <TableCell>{it.supplier?.name || '-'}</TableCell>
                              <TableCell>{it.unit || it.material?.unit || '-'}</TableCell>
                              <TableCell align="right">{it.actualQty}</TableCell>
                              <TableCell align="right">{it.orderedQty}</TableCell>
                              <TableCell align="right"><Chip size="small" label={it.remainingQty} color="primary" sx={{ height: 18, fontSize: 12 }} /></TableCell>
                              <TableCell align="right">{(Number(it.unitPrice) || Number(it.budgetUnitPrice) || 0).toFixed(2)}</TableCell>
                              <TableCell align="right">
                                <TextField size="small" type="number" value={sel.qty}
                                  disabled={!checked}
                                  onChange={(e) => handleItemFieldChange(it.id, 'qty', e.target.value)}
                                  inputProps={{ min: 1, style: { textAlign: 'right', width: 60 } }}
                                  sx={{ '& .MuiInputBase-input': { py: 0.5, px: 0.5 } }} />
                              </TableCell>
                              <TableCell align="right">
                                <TextField size="small" type="number" value={sel.unitPrice}
                                  disabled={!checked}
                                  onChange={(e) => handleItemFieldChange(it.id, 'unitPrice', e.target.value)}
                                  inputProps={{ min: 0, step: '0.01', style: { textAlign: 'right', width: 70 } }}
                                  sx={{ '& .MuiInputBase-input': { py: 0.5, px: 0.5 } }} />
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold', color: checked ? 'primary.main' : 'text.disabled' }}>
                                {lineTotal.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </AccordionDetails>
                </Accordion>
              ))
            )}
          </Box>

          {/* ===== 底部汇总栏（紧凑） ===== */}
          {summary.count > 0 && (
            <Box sx={{ px: 2, py: 1, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'action.hover', flexShrink: 0, display: 'flex', gap: 3, alignItems: 'center' }}>
              <Typography variant="body2">已选 <strong>{summary.count}</strong> 条</Typography>
              <Typography variant="body1" color="primary" sx={{ ml: 'auto' }}>总金额：<strong>{summary.totalAmount.toFixed(2)}</strong></Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ py: 1, px: 2, borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
          <Button size="small" onClick={handleCloseCreate}>取消</Button>
          <Button variant="contained" size="small" startIcon={saving ? <CircularProgress size={16} /> : <ShoppingCart />} onClick={handleCreateOrder} disabled={saving || summary.count === 0}>
            创建采购订单
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== 编辑弹窗（主信息 + 明细管理） ==================== */}
      <Dialog open={editDialog.open} onClose={handleCloseEdit} maxWidth="xl" fullWidth PaperProps={{ sx: { height: '90vh', maxHeight: '92vh' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">编辑采购订单 - {editDialog.data?.orderNo}</Typography>
          <Button size="small" onClick={handleCloseEdit}>关闭</Button>
        </DialogTitle>
        <DialogContent sx={{ p: 2, overflow: 'auto' }}>
          {/* 主信息 */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={3}>
              <TextField select fullWidth size="small" label="供应商" value={editForm.supplierId || ''} onChange={(e) => setEditForm({ ...editForm, supplierId: e.target.value })}>
                {suppliers.map((s) => <MenuItem key={s.id} value={s.id}>{s.code} - {s.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={3}>
              <TextField select fullWidth size="small" label="收货仓库" value={editForm.warehouseId || ''} onChange={(e) => setEditForm({ ...editForm, warehouseId: e.target.value })}>
                {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.code} - {w.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={3}>
              <TextField fullWidth size="small" type="date" label="到货日期" required InputLabelProps={{ shrink: true }} value={editForm.expectedDate || ''} onChange={(e) => setEditForm({ ...editForm, expectedDate: e.target.value })} />
            </Grid>
            <Grid item xs={3}>
              <TextField fullWidth size="small" label="备注" value={editForm.notes || ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
            </Grid>
          </Grid>

          {/* 明细列表 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2">订单明细（{editItems.length} 条）</Typography>
            <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => { setEditAddOpen(!editAddOpen); if (!editAddOpen && editAvailablePlans.length === 0) handleLoadEditPlans(); }}>
              追加明细
            </Button>
          </Box>

          {editItems.length > 0 && (
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell>采购计划单号</TableCell>
                    <TableCell>物料编码</TableCell>
                    <TableCell>物料名称</TableCell>
                    <TableCell>规格</TableCell>
                    <TableCell>等级</TableCell>
                    <TableCell>单位</TableCell>
                    <TableCell align="right" sx={{ width: 90 }}>数量</TableCell>
                    <TableCell align="right" sx={{ width: 100 }}>单价</TableCell>
                    <TableCell align="right">总金额</TableCell>
                    <TableCell>备注</TableCell>
                    <TableCell sx={{ width: 40 }}>删除</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {editItems.map((it, idx) => {
                    const lineTotal = (Number(it.qty) || 0) * (Number(it.unitPrice) || 0);
                    return (
                      <TableRow key={it.id || `new-${idx}`}>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {it.planItem?.plan?.planNo || '-'}
                        </TableCell>
                        <TableCell>{it.material?.code || '-'}</TableCell>
                        <TableCell>{it.material?.name || '-'}</TableCell>
                        <TableCell>{it.material?.spec || '-'}</TableCell>
                        <TableCell>{it.grade?.name || '-'}</TableCell>
                        <TableCell>{it.material?.unit || '-'}</TableCell>
                        <TableCell align="right">
                          <TextField size="small" type="number" value={it.qty} onChange={(e) => handleEditItemChange(idx, 'qty', e.target.value)} inputProps={{ min: 1, style: { textAlign: 'right', width: 65 } }} />
                        </TableCell>
                        <TableCell align="right">
                          <TextField size="small" type="number" value={it.unitPrice} onChange={(e) => handleEditItemChange(idx, 'unitPrice', e.target.value)} inputProps={{ min: 0, step: '0.01', style: { textAlign: 'right', width: 75 } }} />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>{lineTotal.toFixed(2)}</TableCell>
                        <TableCell>
                          <TextField size="small" value={it.remark || ''} onChange={(e) => handleEditItemChange(idx, 'remark', e.target.value)} inputProps={{ style: { width: 80 } }} />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" color="error" onClick={() => handleRemoveEditItem(idx)}><Delete fontSize="small" /></IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', borderTop: '2px solid', borderColor: 'divider' } }}>
                    <TableCell colSpan={5}>合计</TableCell>
                    <TableCell colSpan={2} />
                    <TableCell align="right" sx={{ color: 'primary.main' }}>{editSummary.totalAmount.toFixed(2)}</TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* 追加明细区域 */}
          {editAddOpen && (
            <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">选择要追加的采购计划明细</Typography>
                {Object.keys(editSelected).length > 0 && (
                  <Button size="small" variant="contained" onClick={handleConfirmAddItems}>
                    确认追加（{Object.keys(editSelected).length} 条）
                  </Button>
                )}
              </Box>
              {editLoadingPlans ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={28} /></Box>
              ) : editAvailablePlans.length === 0 ? (
                <Alert severity="info">暂无可追加的采购计划明细</Alert>
              ) : (
                editAvailablePlans.map((plan) => (
                  <Accordion key={plan.id} sx={{ mb: 0.5 }}>
                    <AccordionSummary expandIcon={<ExpandMore />} sx={{ py: 0.5, minHeight: 40, '& .MuiAccordionSummary-content': { my: 0 } }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{plan.planNo}</Typography>
                        <Typography variant="caption" color="text.secondary">{plan.title}</Typography>
                        <Chip size="small" label={`${plan.items.length} 条可选`} variant="outlined" sx={{ height: 20 }} />
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'grey.50' }}>
                            <TableCell padding="checkbox"></TableCell>
                            <TableCell>物料编码</TableCell><TableCell>物料名称</TableCell><TableCell>规格</TableCell>
                            <TableCell>等级</TableCell>
                            <TableCell>供应商</TableCell>
                            <TableCell>单位</TableCell><TableCell align="right">可下单</TableCell>
                            <TableCell align="right">确认单价</TableCell>
                            <TableCell align="right">数量</TableCell>
                            <TableCell align="right">单价</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {plan.items.map((it) => {
                            const checked = !!editSelected[it.id];
                            const sel = editSelected[it.id] || {
                              qty: it.remainingQty,
                              unitPrice: Number(it.unitPrice) || Number(it.budgetUnitPrice) || 0,
                            };
                            return (
                              <TableRow key={it.id} hover selected={checked}>
                                <TableCell padding="checkbox"><Checkbox checked={checked} onChange={() => handleToggleEditAdd(it)} size="small" /></TableCell>
                                <TableCell>{it.material?.code}</TableCell>
                                <TableCell>{it.material?.name}</TableCell>
                                <TableCell>{it.material?.spec || '-'}</TableCell>
                                <TableCell>{it.grade?.name || '-'}</TableCell>
                                <TableCell>{it.supplier?.name || '-'}</TableCell>
                                <TableCell>{it.unit || it.material?.unit || '-'}</TableCell>
                                <TableCell align="right">{it.remainingQty}</TableCell>
                                <TableCell align="right">{(Number(it.unitPrice) || Number(it.budgetUnitPrice) || 0).toFixed(2)}</TableCell>
                                <TableCell align="right">
                                  <TextField size="small" type="number" value={sel.qty} disabled={!checked} onChange={(e) => handleEditAddFieldChange(it.id, 'qty', e.target.value)} inputProps={{ min: 1, style: { textAlign: 'right', width: 65 } }} />
                                </TableCell>
                                <TableCell align="right">
                                  <TextField size="small" type="number" value={sel.unitPrice} disabled={!checked} onChange={(e) => handleEditAddFieldChange(it.id, 'unitPrice', e.target.value)} inputProps={{ min: 0, step: '0.01', style: { textAlign: 'right', width: 75 } }} />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </AccordionDetails>
                  </Accordion>
                ))
              )}
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={handleCloseEdit}>取消</Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={editSaving || editItems.length === 0} startIcon={editSaving ? <CircularProgress size={20} /> : <CheckCircle />}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== 详情弹窗 ==================== */}
      <Dialog open={detailDialog.open} onClose={() => setDetailDialog({ open: false, data: null })} maxWidth="lg" fullWidth>
        <DialogTitle>采购订单详情 - {detailDialog.data?.orderNo}</DialogTitle>
        <DialogContent>
          {detailDialog.data && (
            <>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={3}><Typography><strong>供应商：</strong>{detailDialog.data.supplier?.name}</Typography></Grid>
                <Grid item xs={3}><Typography><strong>仓库：</strong>{detailDialog.data.warehouse?.name}</Typography></Grid>
                <Grid item xs={3}><Typography><strong>下单日期：</strong>{detailDialog.data.orderDate?.slice(0, 10)}</Typography></Grid>
                <Grid item xs={3}><Typography><strong>状态：</strong><Chip size="small" label={STATUS_MAP[detailDialog.data.status]?.label} color={STATUS_MAP[detailDialog.data.status]?.color} /></Typography></Grid>
                <Grid item xs={3}><Typography><strong>总金额：</strong>{Number(detailDialog.data.totalAmount).toFixed(2)}</Typography></Grid>
                <Grid item xs={3}><Typography><strong>备注：</strong>{detailDialog.data.notes || '-'}</Typography></Grid>
              </Grid>

              {/* 订单明细 */}
              {detailDialog.data.items?.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>订单明细</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>物料编码</TableCell><TableCell>物料名称</TableCell><TableCell>规格</TableCell>
                          <TableCell>等级</TableCell>
                          <TableCell>单位</TableCell><TableCell align="right">数量</TableCell>
                          <TableCell align="right">单价</TableCell>
                          <TableCell align="right">总金额</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detailDialog.data.items.map((it) => (
                          <TableRow key={it.id}>
                            <TableCell>{it.material?.code}</TableCell>
                            <TableCell>{it.material?.name}</TableCell>
                            <TableCell>{it.material?.spec || '-'}</TableCell>
                            <TableCell>{it.grade?.name || '-'}</TableCell>
                            <TableCell>{it.material?.unit || '-'}</TableCell>
                            <TableCell align="right">{it.qty}</TableCell>
                            <TableCell align="right">{Number(it.unitPrice).toFixed(2)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>{Number(it.totalAmount).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}

              {/* 收货记录 */}
              {detailDialog.data.receipts?.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>收货记录</Typography>
                  <Table size="small">
                    <TableHead><TableRow>
                      <TableCell>入库编号</TableCell><TableCell>入库日期</TableCell><TableCell>收货数量</TableCell>
                      <TableCell>批次</TableCell><TableCell>质检结果</TableCell><TableCell>状态</TableCell>
                    </TableRow></TableHead>
                    <TableBody>
                      {detailDialog.data.receipts.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.receiptNo}</TableCell>
                          <TableCell>{r.receiptDate?.slice(0, 10)}</TableCell>
                          <TableCell>{r.receivedQty}</TableCell>
                          <TableCell>{r.batch?.batchNo || '-'}</TableCell>
                          <TableCell>{r.qcResult}</TableCell>
                          <TableCell>{r.status}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setDetailDialog({ open: false, data: null })}>关闭</Button></DialogActions>
      </Dialog>

      {/* ===== 新增弹窗关闭确认 ===== */}
      <Dialog open={confirmCreateClose} onClose={() => setConfirmCreateClose(false)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 600 }}>未保存的更改</DialogTitle>
        <DialogContent>
          <Typography>您有尚未保存的更改，确定要关闭吗？关闭后所有更改将丢失。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmCreateClose(false)}>继续编辑</Button>
          <Button onClick={() => { setConfirmCreateClose(false); setCreateOpen(false); }} color="error" variant="contained">放弃更改</Button>
        </DialogActions>
      </Dialog>

      {/* ===== 编辑弹窗关闭确认 ===== */}
      <Dialog open={confirmEditClose} onClose={() => setConfirmEditClose(false)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 600 }}>未保存的更改</DialogTitle>
        <DialogContent>
          <Typography>您有尚未保存的更改，确定要关闭吗？关闭后所有更改将丢失。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmEditClose(false)}>继续编辑</Button>
          <Button onClick={() => { setConfirmEditClose(false); setEditDialog({ open: false, data: null }); }} color="error" variant="contained">放弃更改</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
