import { useState, useEffect, useCallback, Fragment } from 'react';
import {
  Box, Typography, Button, TextField, Grid, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  InputAdornment, MenuItem, TablePagination, Stepper, Step, StepLabel,
  CircularProgress, Tooltip,
} from '@mui/material';
import { Add, Delete, Search, KeyboardArrowDown, KeyboardArrowUp, RestartAlt, Map as MapIcon } from '@mui/icons-material';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import MapPicker from '../../components/MapPicker';
import { getDisplayUnit, getConversionDesc, needsConversion, baseUnitPriceToSales, baseQtyToSales, salesQtyToBase } from '../../lib/unitConversion';

const STATUS_LABELS = { PENDING_APPROVAL: '待审核', DRAFT: '待审核', IN_APPROVAL: '审批中', APPROVED: '已审核', REJECTED: '已拒绝', SHIPPING: '发货中', DELIVERED: '已送达', CLOSED: '已关闭', CANCELLED: '已取消', CONFIRMED: '已审核' };
const STATUS_COLORS = { PENDING_APPROVAL: 'warning', DRAFT: 'warning', IN_APPROVAL: 'info', APPROVED: 'info', REJECTED: 'error', SHIPPING: 'warning', DELIVERED: 'success', CLOSED: 'default', CANCELLED: 'error', CONFIRMED: 'info' };
const FLOW_STEPS = ['PENDING_APPROVAL', 'APPROVED', 'SHIPPING', 'DELIVERED', 'CLOSED'];

export default function SalesOrderList() {
  const { user } = useAuthStore();
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [filterCustomerId, setFilterCustomerId] = useState('');
  const [filterWarehouseId, setFilterWarehouseId] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState({ open: false, mode: 'create', data: null });
  const [customers, setCustomers] = useState([]);
  const [addresses, setAddresses] = useState([]);  // 目的地地址列表
  const [warehouseList, setWarehouseList] = useState([]);  // 仓库列表
  const [employees, setEmployees] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [prices, setPrices] = useState({});
  const [stockMap, setStockMap] = useState({}); // { [`${materialId}_${gradeId||''}`]: { qty, unit } }
  const [expandedId, setExpandedId] = useState(null);
  const [detailCache, setDetailCache] = useState({});
  const [confirmClose, setConfirmClose] = useState(false);
  const [dialogOriginal, setDialogOriginal] = useState(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [calculatingDistance, setCalculatingDistance] = useState(false);

  // 根据物料ID获取指导百分比（默认130%）
  const getGuidePercent = (materialId) => {
    const mat = materials.find(m => m.id === materialId);
    return Number(mat?.guidePercent || 30);
  };

  // 检查表单是否有未保存的改动
  const hasFormChanges = () => {
    if (!dialog.open || !dialog.data) return false;
    if (!dialogOriginal) return true; // 无原始数据则视为有改动
    const cur = dialog.data;
    const orig = dialogOriginal;
    // 对比顶层字段
    const topKeys = ['customerId', 'warehouseId', 'destinationAddress', 'salesRepId', 'orderDate', 'expectedDate', 'priceType', 'notes'];
    if (topKeys.some(k => String(cur[k] ?? '') !== String(orig[k] ?? ''))) return true;
    // 对比 items 数组
    const curItems = cur.items || [];
    const origItems = orig.items || [];
    if (curItems.length !== origItems.length) return true;
    return curItems.some((it, i) => {
      const origIt = origItems[i];
      const itemKeys = ['materialId', 'qty', 'unitPrice', 'costPrice', 'guidePrice', 'marginRate', 'lineTotal', 'remark'];
      return itemKeys.some(k => String(it[k] ?? '') !== String(origIt[k] ?? ''));
    });
  };

  // 尝试关闭弹窗（有改动则弹出确认）
  const handleCloseDialog = () => {
    if (hasFormChanges()) {
      setConfirmClose(true);
    } else {
      setDialog({ open: false, mode: 'create', data: null, isCopy: false });
      setDialogOriginal(null);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page + 1, pageSize: rowsPerPage });
      if (keyword) params.set('keyword', keyword);
      if (status) params.set('status', status);
      if (filterCustomerId) params.set('customerId', filterCustomerId);
      if (filterWarehouseId) params.set('warehouseId', filterWarehouseId);
      if (filterDateStart) params.set('dateStart', filterDateStart);
      if (filterDateEnd) params.set('dateEnd', filterDateEnd);
      const res = await api.get(`/sales/orders?${params}`);
      setList(res.data.list || []);
      setTotal(res.data.total || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, rowsPerPage, keyword, status, filterCustomerId, filterWarehouseId, filterDateStart, filterDateEnd]);

  const loadOptions = async () => {
    try {
      const isSalesRep = user?.role === 'SALES_REP' || user?.role === 'SALES_STAFF';
      const [cRes, aRes, wRes, eRes, mRes] = await Promise.all([
        api.get(`/master/customers?page=1&pageSize=999${isSalesRep ? '&mine=true' : ''}`),
        api.get('/address?status=ACTIVE&pageSize=999'), // 目的地地址（启用）
        api.get('/master/warehouses'), // 仓库列表
        api.get('/master/employees'),
        api.get('/master/materials?page=1&pageSize=999&module=sales'),
      ]);
      setCustomers(cRes.data?.list || []);
      setAddresses(aRes.data?.list || []); // 地址数据
      setWarehouseList(wRes.data || []); // 仓库数据
      setEmployees(eRes.data?.list || eRes.data || []);
      setMaterials(mRes.data?.list || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadOptions(); }, []);

  const handleSave = async () => {
    const { data } = dialog;
    if (!data.customerId || !data.warehouseId || !data.destinationAddress) { alert('请选择客户、仓库和目的地'); return; }
    if (!data.expectedDate) { alert('请选择发货日期'); return; }
    if (!data.items?.length) { alert('请至少添加一条明细'); return; }
    
    // 等级未填提示（不做强制要求）
    const noGradeItems = data.items?.filter(it => it.materialId && !it.gradeId) || [];
    if (noGradeItems.length > 0) {
      const materialNames = noGradeItems.map(it => {
        const mat = materials.find(m => m.id === it.materialId);
        return mat?.name || '未知物料';
      });
      if (!window.confirm(`以下物料没有选择等级：${materialNames.join('、')}\n是否继续保存？`)) {
        return;
      }
    }
    
    // 校验数量不能超过可用库存
    // 前端 qty 是销售单位，库存 availableQty 是基准单位，需统一换算后比较
    // 编辑模式下：可用库存中的lockedQty包含当前订单本身锁的数量，所以只验证增量部分
    const origItems = dialogOriginal?.items || [];
    for (const it of data.items) {
      const stockKey = `${it.materialId}_${it.gradeId || ''}`;
      const stock = stockMap[stockKey];
      if (!stock) continue; // 无库存数据则跳过
      const mat = materials.find(m => m.id === it.materialId);
      const origItem = origItems.find(o => o.materialId === it.materialId);
      const origQty = Number(origItem?.qty) || 0;
      const newQty = Number(it.qty) || 0;
      // 新增订单：验证总数量；编辑订单：验证增量（新数量 - 原数量）
      const validateQty = dialog.mode === 'edit' && origItem ? (newQty - origQty) : newQty;
      // 增量为0或负数 → 无需验证（数量没变或减少了）
      if (validateQty <= 0) continue;
      // 将销售单位数量转换为基准单位数量再与库存比较
      const baseValidateQty = mat ? Number(salesQtyToBase(validateQty, mat)) : validateQty;
      if (baseValidateQty > stock.availableQty) {
        const deltaLabel = dialog.mode === 'edit' ? `新增 ${validateQty}${mat ? ` ${getDisplayUnit(mat, 'sales')}` : ''}` : `${newQty}${mat ? ` ${getDisplayUnit(mat, 'sales')}` : ''}`;
        const availLabel = stock.salesConversionFactor !== 1
          ? `${baseQtyToSales(stock.availableQty, { salesConversionFactor: stock.salesConversionFactor })} ${stock.salesUnit || stock.unit}(=${stock.availableQty}${stock.unit})`
          : `${stock.availableQty} ${stock.unit}`;
        alert(`${mat?.name || '物料'} ${deltaLabel} 超过可用库存 ${availLabel}，不允许保存`);
        return;
      }
    }
    try {
      if (dialog.mode === 'create') {
        await api.post('/sales/orders', data);
      } else {
        await api.put(`/sales/orders/${data.id}`, data);
      }
      setDialog({ open: false, mode: 'create', data: null, isCopy: false });
      setDialogOriginal(null);
      loadData();
    } catch (e) { alert(e.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('确认删除该销售订单？')) return;
    try { await api.delete(`/sales/orders/${id}`); loadData(); }
    catch (e) { alert(e.message); }
  };

  const handleCopy = async (row) => {
    try {
      const res = await api.get(`/sales/orders/${row.id}`);
      const d = res.data;
      // 为每个物料+等级获取最新成本价（成本价最小颗粒度=物料+等级）
      const costPriceMap = {};
      await Promise.all((d.items || []).map(async (it) => {
        if (it.materialId) {
          const key = `${it.materialId}_${it.gradeId || '__NULL__'}`;
          try {
            const params = { materialId: it.materialId };
            if (it.gradeId) params.gradeId = it.gradeId;
            const cpRes = await api.get('/wms/cost-price/latest', { params });
            const baseCost = Number(cpRes.data?.combinedCostPrice) || Number(cpRes.data?.costPrice) || 0;
            const mat = materials.find(m => m.id === it.materialId);
            costPriceMap[key] = mat ? Number(baseUnitPriceToSales(baseCost, mat)) : baseCost;
          } catch { costPriceMap[key] = 0; }
        }
      }));
      const items = (d.items || []).map(it => {
        const key = `${it.materialId}_${it.gradeId || '__NULL__'}`;
        const costPrice = costPriceMap[key] ?? 0;
        const guidePrice = costPrice * (1 + getGuidePercent(it.materialId) / 100);
        const salePrice = Number(it.unitPrice) || 0;
        const marginRate = costPrice > 0 ? ((salePrice - costPrice) / costPrice * 100) : 0;
        return {
          materialId: it.materialId,
          gradeId: it.gradeId || '',
          qty: it.qty,
          unitPrice: Number(it.unitPrice),
          costPrice,
          guidePrice,
          marginRate,
          lineTotal: Number(it.lineTotal) || 0,
          remark: it.remark || '',
        };
      });
      setDialog({
        open: true,
        mode: 'create',
        isCopy: true,
        data: {
          customerId: d.customerId,
          warehouseId: d.warehouseId,
          destinationAddress: d.destinationAddress || d.address?.address || '',
          salesRepId: d.salesRepId || '',
          orderDate: new Date().toISOString().slice(0, 10),
          expectedDate: '',
          priceType: d.priceType || 'STANDARD',
          notes: d.notes || '',
          items,
        },
      });
      setDialogOriginal(JSON.parse(JSON.stringify({
        customerId: d.customerId,
        warehouseId: d.warehouseId,
        addressId: d.addressId || '',
        salesRepId: d.salesRepId || '',
        orderDate: new Date().toISOString().slice(0, 10),
        expectedDate: '',
        priceType: d.priceType || 'STANDARD',
        notes: d.notes || '',
        items,
      })));
      refreshStockForAllItems(d.warehouseId, items);
    } catch (e) { alert('获取订单详情失败: ' + e.message); }
  };

  const handleViewDetail = async (id) => {
    if (detailCache[id]) return; // 已缓存
    try {
      const res = await api.get(`/sales/orders/${id}`);
      setDetailCache(prev => ({ ...prev, [id]: res.data }));
    } catch (e) { /* ignore */ }
  };

  const handleRowClick = (row) => {
    if (expandedId === row.id) {
      setExpandedId(null);
    } else {
      setExpandedId(row.id);
      if (!detailCache[row.id]) handleViewDetail(row.id);
    }
  };

  const handleEdit = async (row) => {
    try {
      const res = await api.get(`/sales/orders/${row.id}`);
      const d = res.data;
      const items = (d.items || []).map(it => {
        const costPrice = Number(it.costPrice) || 0;
        const guidePrice = costPrice * (1 + getGuidePercent(it.materialId) / 100);
        const salePrice = Number(it.unitPrice) || 0;
        const marginRate = costPrice > 0 ? ((salePrice - costPrice) / costPrice * 100) : 0;
        return {
          materialId: it.materialId,
          gradeId: it.gradeId || '',
          qty: it.qty,
          unitPrice: Number(it.unitPrice),
          costPrice,
          guidePrice,
          marginRate,
          lineTotal: Number(it.lineTotal) || 0,
          remark: it.remark || '',
        };
      });
      setDialog({
        open: true,
        mode: 'edit',
        data: {
          id: d.id,
          customerId: d.customerId,
          warehouseId: d.warehouseId,
          destinationAddress: d.destinationAddress || d.address?.address || '',
          salesRepId: d.salesRepId || '',
          orderDate: d.orderDate?.slice(0, 10),
          expectedDate: d.expectedDate?.slice(0, 10),
          priceType: d.priceType || 'STANDARD',
          notes: d.notes || '',
          items,
        },
      });
      setDialogOriginal(JSON.parse(JSON.stringify({
        id: d.id,
        customerId: d.customerId,
        warehouseId: d.warehouseId,
        salesRepId: d.salesRepId || '',
        orderDate: d.orderDate?.slice(0, 10),
        expectedDate: d.expectedDate?.slice(0, 10),
        priceType: d.priceType || 'STANDARD',
        notes: d.notes || '',
        items,
      })));
      refreshStockForAllItems(d.warehouseId, items);
    } catch (e) { alert('获取订单详情失败: ' + e.message); }
  };

  const handleStatus = async (id, newStatus) => {
    const labels = { APPROVED: '审核通过', SHIPPING: '开始发货', DELIVERED: '确认送达（将自动出库+生成应收）', CLOSED: '关闭订单', CANCELLED: '取消订单' };
    if (!confirm(`确认${labels[newStatus]}？`)) return;
    try { await api.put(`/sales/orders/${id}/status`, { status: newStatus }); loadData(); }
    catch (e) { alert(e.message); }
  };

  const handleSubmitApproval = async (id) => {
    if (!confirm('确认提交审批？提交后将进入审批流程，等待审批人审核。')) return;
    try {
      const res = await api.post(`/sales/orders/${id}/submit-approval`);
      alert(res.data?.message || '已提交审批');
      loadData();
    }
    catch (e) { alert(e.response?.data?.message || e.message); }
  };

  const updateItem = (idx, field, value) => {
    const items = [...(dialog.data.items || [])];
    items[idx] = { ...items[idx], [field]: value };
    // 自动计算金额和毛利率
    if (field === 'qty' || field === 'unitPrice') {
      items[idx].lineTotal = (items[idx].qty || 0) * (items[idx].unitPrice || 0);
    }
    if (field === 'unitPrice') {
      const cost = Number(items[idx].costPrice) || 0;
      const sale = Number(value) || 0;
      items[idx].marginRate = cost > 0 ? ((sale - cost) / cost * 100) : 0;
    }
    setDialog({ ...dialog, data: { ...dialog.data, items } });
  };

  const addItem = () => {
    const items = [...(dialog.data.items || [])];
    items.push({ materialId: '', gradeId: '', qty: 1, unitPrice: 0, costPrice: 0, guidePrice: 0, marginRate: 0, lineTotal: 0, remark: '' });
    setDialog({ ...dialog, data: { ...dialog.data, items } });
  };

  const removeItem = (idx) => {
    const items = [...(dialog.data.items || [])];
    items.splice(idx, 1);
    setDialog({ ...dialog, data: { ...dialog.data, items } });
  };

  // 获取物料+等级对应的最新成本价（基准单位），并转换为销售单位价格
  const fetchCostPrice = async (materialId, gradeId) => {
    if (!materialId) return { costPrice: 0, guidePrice: 0 };
    let baseCostPrice = 0;
    try {
      const params = { materialId };
      if (gradeId) params.gradeId = gradeId;
      const res = await api.get('/wms/cost-price/latest', { params });
      baseCostPrice = Number(res.data?.combinedCostPrice) || Number(res.data?.costPrice) || 0;
    } catch { /* ignore */ }
    const mat = materials.find(m => m.id === materialId);
    const costPrice = mat ? Number(baseUnitPriceToSales(baseCostPrice, mat)) : baseCostPrice;
    const guidePercent = getGuidePercent(materialId);
    const guidePrice = costPrice * (1 + guidePercent / 100);
    return { costPrice, guidePrice };
  };

  const onMaterialChange = async (idx, materialId) => {
    // 先选中物料，costPrice 初始为 0，异步获取后再更新
    const items = [...(dialog.data.items || [])];
    items[idx] = {
      ...items[idx],
      materialId,
      gradeId: '', // 物料变化时重置等级
      costPrice: 0,
      guidePrice: 0,
      unitPrice: 0,
      marginRate: 0,
      lineTotal: 0,
    };

    // 异步获取最新预计算成本价（物料+等级粒度，此处等级为空=无等级分组）
    const { costPrice, guidePrice } = await fetchCostPrice(materialId, null);

    const salePrice = guidePrice;
    const marginRate = costPrice > 0 ? ((salePrice - costPrice) / costPrice * 100) : 0;

    items[idx].costPrice = costPrice;
    items[idx].guidePrice = guidePrice;
    items[idx].unitPrice = guidePrice;
    items[idx].marginRate = marginRate;
    items[idx].lineTotal = (items[idx].qty || 0) * guidePrice;

    setDialog(prev => ({ ...prev, data: { ...prev.data, items } }));

    // 拉取库存（异步，不阻塞选中），传入当前等级
    if (materialId && dialog.data?.warehouseId) {
      try {
        const gradeId = items[idx]?.gradeId || '';
        const params = { materialId, warehouseId: dialog.data.warehouseId, pageSize: 1 };
        if (gradeId) params.gradeId = gradeId;
        const res = await api.get('/wms/inventory', { params });
        const inv = res.data?.list?.[0];
        const matForStock = materials.find(m => m.id === materialId);
        const stockKey = `${materialId}_${gradeId || ''}`;
        setStockMap(prev => ({ ...prev, [stockKey]: { qty: inv ? Number(inv.qty) : 0, lockedQty: inv ? Number(inv.lockedQty) : 0, availableQty: inv ? Number(inv.availableQty) : 0, unit: inv?.material?.unit || '', salesUnit: matForStock?.salesUnit || matForStock?.unit || '', salesConversionFactor: Number(matForStock?.salesConversionFactor || 1) } }));
      } catch { /* ignore */ }
    }
  };

  // 选择等级后重新获取成本价（成本价最小颗粒度=物料+等级）+ 刷新库存
  const onGradeChange = async (idx, gradeId) => {
    const items = [...(dialog.data.items || [])];
    const materialId = items[idx].materialId;

    // 先更新等级
    items[idx] = { ...items[idx], gradeId };
    setDialog(prev => ({ ...prev, data: { ...prev.data, items } }));

    if (!materialId) return;

    // 重新获取该物料+等级的成本价
    const { costPrice, guidePrice } = await fetchCostPrice(materialId, gradeId || null);
    const currentUnitPrice = Number(items[idx].unitPrice) || 0;
    const marginRate = costPrice > 0 ? ((currentUnitPrice - costPrice) / costPrice * 100) : 0;

    items[idx].costPrice = costPrice;
    items[idx].guidePrice = guidePrice;
    items[idx].marginRate = marginRate;

    setDialog(prev => ({ ...prev, data: { ...prev.data, items } }));

    // 刷新该物料+等级的库存
    if (dialog.data?.warehouseId) {
      try {
        const params = { materialId, warehouseId: dialog.data.warehouseId, pageSize: 1 };
        if (gradeId) params.gradeId = gradeId;
        const res = await api.get('/wms/inventory', { params });
        const inv = res.data?.list?.[0];
        const matForStock = materials.find(m => m.id === materialId);
        const stockKey = `${materialId}_${gradeId || ''}`;
        setStockMap(prev => ({ ...prev, [stockKey]: { qty: inv ? Number(inv.qty) : 0, lockedQty: inv ? Number(inv.lockedQty) : 0, availableQty: inv ? Number(inv.availableQty) : 0, unit: inv?.material?.unit || '', salesUnit: matForStock?.salesUnit || matForStock?.unit || '', salesConversionFactor: Number(matForStock?.salesConversionFactor || 1) } }));
      } catch { /* ignore */ }
    }
  };

  const refreshStockForAllItems = async (warehouseId, itemsArg) => {
    const items = itemsArg || dialog.data?.items;
    if (!warehouseId || !items?.length) return;
    const newMap = {};
    for (const it of items) {
      if (it.materialId) {
        try {
          const gradeId = it.gradeId || '';
          const params = { materialId: it.materialId, warehouseId, pageSize: 1 };
          if (gradeId) params.gradeId = gradeId;
          const res = await api.get('/wms/inventory', { params });
          const inv = res.data?.list?.[0];
          const mat = materials.find(m => m.id === it.materialId);
          const stockKey = `${it.materialId}_${gradeId || ''}`;
          newMap[stockKey] = { qty: inv ? Number(inv.qty) : 0, lockedQty: inv ? Number(inv.lockedQty) : 0, availableQty: inv ? Number(inv.availableQty) : 0, unit: inv?.material?.unit || '', salesUnit: mat?.salesUnit || mat?.unit || '', salesConversionFactor: Number(mat?.salesConversionFactor || 1) };
        } catch { /* ignore */ }
      }
    }
    setStockMap(newMap);
  };

  const calcTotal = () => {
    const items = dialog.data?.items || [];
    let total = 0;
    items.forEach(it => {
      total += (it.qty || 0) * (it.unitPrice || 0);
    });
    return { total };
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>销售订单</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField size="small" placeholder="订单/客户" value={keyword} onChange={e => setKeyword(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} sx={{ width: 160 }} />
          <TextField size="small" select label="状态" value={status} onChange={e => setStatus(e.target.value)} sx={{ width: 120 }}>
            <MenuItem value="">全部</MenuItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </TextField>
          <TextField size="small" select label="客户" value={filterCustomerId} onChange={e => setFilterCustomerId(e.target.value)} sx={{ width: 150 }}>
            <MenuItem value="">全部</MenuItem>
            {customers.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
          <TextField size="small" select label="目的地" value={filterWarehouseId} onChange={e => setFilterWarehouseId(e.target.value)} sx={{ width: 150 }}>
            <MenuItem value="">全部</MenuItem>
            {addresses.map(w => <MenuItem key={w.id} value={w.id}>{w.title || `${w.originName}至${w.destName}`}</MenuItem>)}
          </TextField>
          <TextField size="small" type="date" label="起始日期" value={filterDateStart} onChange={e => setFilterDateStart(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 140 }} />
          <TextField size="small" type="date" label="截止日期" value={filterDateEnd} onChange={e => setFilterDateEnd(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 140 }} />
          <Button variant="contained" onClick={loadData} size="small">查询</Button>
          <Button variant="outlined" size="small" startIcon={<RestartAlt />} onClick={() => { setKeyword(''); setStatus(''); setFilterCustomerId(''); setFilterWarehouseId(''); setFilterDateStart(''); setFilterDateEnd(''); }}>重置</Button>
          <Button variant="outlined" startIcon={<Add />} onClick={() => { const initData = { customerId: '', warehouseId: '', destinationAddress: '', salesRepId: user?.employee?.id || '', orderDate: new Date().toISOString().slice(0, 10), expectedDate: '', priceType: 'STANDARD', notes: '', items: [] }; setDialog({ open: true, mode: 'create', isCopy: false, data: initData }); setDialogOriginal(JSON.parse(JSON.stringify(initData))); }}>新增订单</Button>
        </Stack>
        {/* 筛选标签 */}
        {(() => {
          const chips = [];
          if (status) chips.push({ key: 'status', label: `状态: ${STATUS_LABELS[status]}`, onDelete: () => setStatus('') });
          if (filterCustomerId) { const c = customers.find(c => c.id === filterCustomerId); chips.push({ key: 'customerId', label: `客户: ${c?.name || filterCustomerId}`, onDelete: () => setFilterCustomerId('') }); }
          if (filterWarehouseId) { const w = addresses.find(w => w.id === filterWarehouseId); chips.push({ key: 'warehouseId', label: `目的地: ${w?.title || w?.originName || filterWarehouseId}`, onDelete: () => setFilterWarehouseId('') }); }
          if (filterDateStart) chips.push({ key: 'dateStart', label: `起始: ${filterDateStart}`, onDelete: () => setFilterDateStart('') });
          if (filterDateEnd) chips.push({ key: 'dateEnd', label: `截止: ${filterDateEnd}`, onDelete: () => setFilterDateEnd('') });
          if (keyword) chips.push({ key: 'keyword', label: `关键词: ${keyword}`, onDelete: () => setKeyword('') });
          return chips.length > 0 ? (
            <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap' }}>
              {chips.map(c => <Chip key={c.key} label={c.label} size="small" onDelete={c.onDelete} />)}
            </Stack>
          ) : null;
        })()}
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={{ width: 36 }} />
              <TableCell>订单编号</TableCell><TableCell>客户</TableCell><TableCell>业务员</TableCell><TableCell>仓库</TableCell><TableCell>发货日期</TableCell><TableCell>订单日期</TableCell>
              <TableCell>总金额</TableCell><TableCell>综合成本毛利率</TableCell><TableCell>最低成本毛利率</TableCell><TableCell>状态</TableCell><TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((r) => {
              const isOpen = expandedId === r.id;
              const detail = detailCache[r.id];
              return (
                <Fragment key={r.id}>
                  <TableRow
                    hover
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => handleRowClick(r)}
                  >
                    <TableCell padding="checkbox" sx={{ width: 36 }}>
                      <IconButton size="small" sx={{ p: 0.5 }}>
                        {isOpen ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ fontWeight: isOpen ? 'bold' : 'normal' }}>{r.orderNo}</TableCell>
                    <TableCell>{r.customer?.name}</TableCell>
                    <TableCell>{r.salesRep?.name || '-'}</TableCell>
                    <TableCell>{r.warehouse?.name || '-'}</TableCell>
                    <TableCell>{r.expectedDate?.slice(0, 10) || '-'}</TableCell>
                    <TableCell>{r.orderDate?.slice(0, 10)}</TableCell>
                    <TableCell>¥{Number(r.grandTotal).toLocaleString()}</TableCell>
                    <TableCell>
                      {r.items && r.items.length > 0 ? (() => {
                        // 综合成本毛利率 = (总收入 − 总成本) / 总成本 × 100（与审批流一致）
                        const totalCost = r.items.reduce((sum, it) => sum + ((it.qty || 0) * (Number(it.costPrice) || 0)), 0);
                        const totalRevenue = r.items.reduce((sum, it) => sum + ((it.qty || 0) * (Number(it.unitPrice) || 0)), 0);
                        if (totalCost === 0) return '-';
                        const orderMargin = (totalRevenue - totalCost) / totalCost * 100;
                        const color = orderMargin < 0 ? 'error.main' : orderMargin < 20 ? 'warning.main' : 'success.main';
                        return <Typography component="span" sx={{ color, fontWeight: 700 }}>{orderMargin.toFixed(1)}%</Typography>;
                      })() : '-'}
                    </TableCell>
                    <TableCell>
                      {r.items && r.items.length > 0 ? (() => {
                        const margins = r.items.filter(it => (Number(it.costPrice) || 0) > 0).map(it => ((Number(it.unitPrice) || 0) - (Number(it.costPrice) || 0)) / (Number(it.costPrice) || 1) * 100);
                        if (margins.length === 0) return '-';
                        const minMargin = Math.min(...margins);
                        const color = minMargin < 0 ? 'error.main' : minMargin < 20 ? 'warning.main' : 'success.main';
                        return <Typography component="span" sx={{ color, fontWeight: 700 }}>{minMargin.toFixed(1)}%</Typography>;
                      })() : '-'}
                    </TableCell>
                    <TableCell><Chip label={STATUS_LABELS[r.status]} color={STATUS_COLORS[r.status]} size="small" /></TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0.5}>
                        {(r.status === 'PENDING_APPROVAL' || r.status === 'DRAFT') && <>
                          <Button size="small" variant="contained" color="success" onClick={() => handleSubmitApproval(r.id)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>提交审批</Button>
                          <Button size="small" variant="contained" color="primary" onClick={() => handleEdit(r)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>编辑</Button>
                          <Button size="small" variant="contained" color="error" onClick={() => handleDelete(r.id)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>删除</Button>
                        </>}
                        {r.status === 'IN_APPROVAL' && <>
                          <Chip label="审批中" color="info" size="small" sx={{ mr: 1 }} />
                          <Typography variant="caption" color="text.secondary">等待审批人审核</Typography>
                        </>}
                        {r.status === 'REJECTED' && <>
                          <Button size="small" variant="contained" color="success" onClick={() => handleSubmitApproval(r.id)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>重新提交</Button>
                          <Button size="small" variant="contained" color="primary" onClick={() => handleEdit(r)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>编辑</Button>
                          <Button size="small" variant="contained" color="error" onClick={() => handleDelete(r.id)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>删除</Button>
                        </>}
                        {(r.status === 'APPROVED' || r.status === 'CONFIRMED' || r.status === 'SHIPPING' || r.status === 'DELIVERED' || r.status === 'CLOSED') && (
                          <Button size="small" variant="contained" color="primary" onClick={() => handleCopy(r)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>再次下单</Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow>
                      <TableCell colSpan={12} sx={{ py: 0, bgcolor: 'grey.50', width: '100%' }}>
                        {detail ? (
                          <Box sx={{ py: 1 }}>
                            {detail.status !== 'CANCELLED' && detail.status !== 'REJECTED' && (
                              <Stepper activeStep={FLOW_STEPS.indexOf(detail.status === 'IN_APPROVAL' ? 'PENDING_APPROVAL' : detail.status)} sx={{ mb: 1, mt: 1 }}>
                                {FLOW_STEPS.map(s => <Step key={s}><StepLabel>{STATUS_LABELS[s]}</StepLabel></Step>)}
                              </Stepper>
                            )}
                            {detail.status === 'IN_APPROVAL' && (
                              <Box sx={{ mb: 1, mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip label="审批中" color="info" />
                                <Typography variant="body2" color="text.secondary">正在审批流中等待审批人审核</Typography>
                              </Box>
                            )}
                            {detail.status === 'REJECTED' && (
                              <Box sx={{ mb: 1, mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip label="已拒绝" color="error" />
                                <Typography variant="body2" color="text.secondary">审批已被拒绝，可重新提交或删除订单</Typography>
                              </Box>
                            )}
                            <Table size="small" sx={{ mt: 1, mb: 1, width: '100%' }}>
                              <TableHead>
                                <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', bgcolor: 'grey.100' } }}>
                                  <TableCell>物料</TableCell><TableCell>等级</TableCell><TableCell>数量</TableCell><TableCell>成本价</TableCell>
                                  <TableCell>指导价</TableCell><TableCell>销售单价</TableCell><TableCell>销售金额</TableCell><TableCell>毛利率</TableCell><TableCell>备注</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {detail.items?.map(it => {
                                  const costPrice = Number(it.costPrice) || 0;
                                  const salePrice = Number(it.unitPrice) || 0;
                                  const marginRate = costPrice > 0 ? ((salePrice - costPrice) / costPrice * 100) : 0;
                                  const guidePrice = costPrice * (1 + getGuidePercent(it.materialId) / 100);
                                  const mat = it.material;
                                  const salesUnitLabel = mat && needsConversion(mat) ? `/${getDisplayUnit(mat, 'sales')}` : '';
                                  return (
                                    <TableRow key={it.id}>
                                      <TableCell>{it.material?.name}</TableCell>
                                      <TableCell>{it.grade?.name || '-'}</TableCell>
                                      <TableCell>{it.qty}{mat ? ` ${getDisplayUnit(mat, 'sales')}` : ''}</TableCell>
                                      <TableCell>¥{costPrice.toFixed(2)}{salesUnitLabel}</TableCell>
                                      <TableCell>¥{guidePrice.toFixed(2)}{salesUnitLabel}</TableCell>
                                      <TableCell>¥{salePrice.toFixed(2)}</TableCell>
                                      <TableCell>¥{Number(it.lineTotal).toLocaleString()}</TableCell>
                                      <TableCell sx={{ color: marginRate < 0 ? 'error.main' : 'success.main', fontWeight: 600 }}>{marginRate.toFixed(1)}%</TableCell>
                                      <TableCell>{it.remark || '-'}</TableCell>
                                    </TableRow>
                                  );
                                })}
                                <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', borderTop: '2px solid', borderColor: 'divider' } }}>
                                  <TableCell>合计</TableCell>
                                  <TableCell />
                                  <TableCell>{detail.items?.reduce((s, it) => s + Number(it.qty), 0)}</TableCell>
                                  <TableCell />
                                  <TableCell />
                                  <TableCell />
                                  <TableCell>¥{Number(detail.totalAmount).toLocaleString()}</TableCell>
                                  <TableCell />
                                  <TableCell />
                                </TableRow>
                              </TableBody>
                            </Table>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                            <CircularProgress size={24} />
                          </Box>
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
      <Dialog open={dialog.open} onClose={handleCloseDialog} maxWidth="xl" fullWidth sx={{ '& .MuiDialog-paper': { minHeight: '85vh', maxHeight: '92vh' } }}>
        <DialogTitle>{dialog.mode === 'edit' ? '编辑销售订单' : dialog.isCopy ? '复制新建销售订单' : '新增销售订单'}</DialogTitle>
        <DialogContent>
          {dialog.data && (
            <Box sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={4}><TextField fullWidth select label="客户" required value={dialog.data.customerId} onChange={e => { const cid = e.target.value; const customer = customers.find(c => c.id === cid); setDialog({ ...dialog, data: { ...dialog.data, customerId: cid, destinationAddress: customer?.address || dialog.data.destinationAddress || '' } }); }}>{customers.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</TextField></Grid>
                <Grid item xs={4}>
                  <TextField fullWidth label="目的地 *" value={dialog.data.destinationAddress || ''}
                    onChange={e => setDialog({ ...dialog, data: { ...dialog.data, destinationAddress: e.target.value } })}
                    placeholder="点击右侧地图图标选点，或手动输入"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip title="在地图上选择地址">
                            <IconButton size="small" onClick={() => setMapOpen(true)} edge="end" sx={{ p: 0.5 }}>
                              <MapIcon fontSize="small" color="primary" />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      ),
                    }} />
                </Grid>
                <Grid item xs={2}><TextField fullWidth label="公里数" value={dialog.data.kilometers ?? ''} InputProps={{ readOnly: true }} sx={{ '& .MuiInputBase-input': { color: 'text.secondary' } }} /></Grid>
                <Grid item xs={2}><TextField fullWidth label="业务员" value={employees.find(e => e.id === dialog.data.salesRepId)?.name || user?.employee?.name || '-'} InputProps={{ readOnly: true }} sx={{ '& .MuiInputBase-input': { color: 'text.secondary', cursor: 'default' } }} /></Grid>
                <Grid item xs={3}><TextField fullWidth select label="仓库" value={dialog.data.warehouseId || ''} onChange={async e => { const wid = e.target.value; const warehouse = warehouseList.find(w => w.id === wid); setDialog({ ...dialog, data: { ...dialog.data, warehouseId: wid } }); refreshStockForAllItems(wid); if (dialog.data.destinationAddress && warehouse?.address) { setCalculatingDistance(true); try { const dRes = await api.get('/address/calc-distance', { params: { origin: warehouse.address, dest: dialog.data.destinationAddress } }); if (dRes.success && dRes.data?.distance != null) { setDialog(prev => ({ ...prev, data: { ...prev.data, kilometers: dRes.data.distance } })); } } catch {} setCalculatingDistance(false); } }}>{warehouseList.map(w => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}</TextField></Grid>
                <Grid item xs={3}><TextField fullWidth type="date" label="订单日期" value={dialog.data.orderDate} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, orderDate: e.target.value } })} InputLabelProps={{ shrink: true }} /></Grid>
                <Grid item xs={3}><TextField fullWidth type="date" label="发货日期" required value={dialog.data.expectedDate} onChange={e => setDialog({ ...dialog, data: { ...dialog.data, expectedDate: e.target.value } })} InputLabelProps={{ shrink: true }} /></Grid>
                <Grid item xs={3}>
                  {(() => {
                    const items = dialog.data?.items || [];
                    const totalCost = items.reduce((s, it) => s + ((it.qty || 0) * (Number(it.costPrice) || 0)), 0);
                    const totalRevenue = items.reduce((s, it) => s + ((it.qty || 0) * (Number(it.unitPrice) || 0)), 0);
                    const orderMargin = totalCost > 0 ? (totalRevenue - totalCost) / totalCost * 100 : 0;
                    const margins = items.filter(it => (it.costPrice || 0) > 0).map(it => ((Number(it.unitPrice) || 0) - (Number(it.costPrice) || 0)) / (Number(it.costPrice) || 1) * 100);
                    const minMargin = margins.length > 0 ? Math.min(...margins) : 0;
                    return (
                      <Grid container spacing={1} sx={{ height: '100%' }}>
                        <Grid item xs={6} sx={{ display: 'flex' }}>
                          <TextField fullWidth label="综合毛利率" value={`${orderMargin.toFixed(1)}%`} InputProps={{ readOnly: true }}
                            sx={{ '& .MuiInputBase-input': { color: orderMargin < 0 ? 'error.main' : orderMargin < 20 ? 'warning.main' : 'success.main', cursor: 'default', fontWeight: 700, fontSize: '0.85rem' } }} />
                        </Grid>
                        <Grid item xs={6} sx={{ display: 'flex' }}>
                          <TextField fullWidth label="最低毛利率" value={`${minMargin.toFixed(1)}%`} InputProps={{ readOnly: true }}
                            sx={{ '& .MuiInputBase-input': { color: minMargin < 0 ? 'error.main' : minMargin < 20 ? 'warning.main' : 'success.main', cursor: 'default', fontWeight: 700, fontSize: '0.85rem' } }} />
                        </Grid>
                      </Grid>
                    );
                  })()}
                </Grid>
              </Grid>

              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" fontWeight={600}>订单明细</Typography>
                <Button size="small" variant="outlined" startIcon={<Add />} onClick={addItem}>添加明细</Button>
              </Box>
              <TableContainer component={Paper} sx={{ mt: 1 }}>
                <Table size="small">
                  <TableHead><TableRow><TableCell>物料</TableCell><TableCell>等级</TableCell><TableCell>实际库存</TableCell><TableCell>可用库存</TableCell><TableCell>数量</TableCell><TableCell>成本价</TableCell><TableCell>指导价</TableCell><TableCell>销售单价</TableCell><TableCell>销售金额</TableCell><TableCell>毛利率</TableCell><TableCell>备注</TableCell><TableCell>操作</TableCell></TableRow></TableHead>
                  <TableBody>
                    {(dialog.data.items || []).map((it, idx) => {
                      const stockKey = `${it.materialId}_${it.gradeId || ''}`;
                      const stock = stockMap[stockKey];
                      const insufficient = stock && stock.availableQty < (it.qty || 0);
                      return (
                      <TableRow key={idx}>
                        <TableCell>
                          <TextField
                            select size="small"
                            value={it.materialId}
                            onChange={e => onMaterialChange(idx, e.target.value)}
                            sx={{ width: 150 }}
                            SelectProps={{
                              MenuProps: {
                                disableAutoFocusItem: false,
                                PaperProps: { style: { maxHeight: 320 } },
                                anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
                                transformOrigin: { vertical: 'top', horizontal: 'left' },
                                sx: { '& .MuiMenuItem-root': { py: 1, fontSize: '0.875rem' } }
                              }
                            }}
                          >
                            {materials.map(m => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
                          </TextField>
                        </TableCell>
                        <TableCell>
                          {it.materialId ? (() => {
                            const selectedMaterial = materials.find(m => m.id === it.materialId);
                            const gradeOptions = selectedMaterial?.materialGrades?.map(mg => mg.grade) || [];
                            return gradeOptions.length > 0 ? (
                              <TextField
                                select
                                size="small"
                                value={it.gradeId || ''}
                                onChange={e => onGradeChange(idx, e.target.value)}
                                sx={{ width: 100 }}
                              >
                                <MenuItem value="">请选择等级</MenuItem>
                                {gradeOptions.map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
                              </TextField>
                            ) : <Typography variant="caption" color="textSecondary">无等级</Typography>;
                          })() : '-'}
                        </TableCell>
                        <TableCell>
                          {stock ? (
                            <Typography variant="caption" color="textSecondary">
                              {stock.salesConversionFactor !== 1 ? baseQtyToSales(stock.qty, { salesConversionFactor: stock.salesConversionFactor }) : stock.qty} {stock.salesUnit || stock.unit}
                              {stock.salesConversionFactor !== 1 && <span style={{ color: '#999' }}>({getConversionDesc({ unit: stock.unit, salesUnit: stock.salesUnit, salesConversionFactor: stock.salesConversionFactor }, 'sales')})</span>}
                            </Typography>
                          ) : it.materialId ? <Typography variant="caption" color="textSecondary">...</Typography> : '-'}
                        </TableCell>
                        <TableCell>
                          {stock ? (() => {
                            const displayQty = Math.floor(stock.salesConversionFactor !== 1 ? baseQtyToSales(stock.availableQty, { salesConversionFactor: stock.salesConversionFactor }) : stock.availableQty);
                            const displayLocked = Math.floor(stock.salesConversionFactor !== 1 ? baseQtyToSales(stock.lockedQty, { salesConversionFactor: stock.salesConversionFactor }) : stock.lockedQty);
                            return (
                            <Typography variant="caption" sx={{ fontWeight: 600, color: displayQty <= 0 ? 'error.main' : insufficient ? 'warning.main' : 'success.main' }}>
                              {displayQty} {stock.salesUnit || stock.unit}
                              {stock.lockedQty > 0 && <span style={{ color: '#999', fontWeight: 400 }}> (锁{displayLocked})</span>}
                              {insufficient && ' ⚠'}
                            </Typography>
                            );
                          })() : it.materialId ? <Typography variant="caption" color="textSecondary">...</Typography> : '-'}
                        </TableCell>
                        <TableCell sx={{ verticalAlign: 'middle' }}><Box sx={{ display: 'flex', alignItems: 'center' }}><TextField size="small" type="number" value={it.qty ?? ''} onChange={e => updateItem(idx, 'qty', e.target.value === '' ? '' : Number(e.target.value))} inputProps={{ min: 0, onFocus: e => e.target.select() }} sx={{ width: 80 }} />{(() => { const mat = materials.find(m => m.id === it.materialId); return mat ? <Typography variant="caption" color="textSecondary" sx={{ ml: 0.5 }}>{getDisplayUnit(mat, 'sales')}</Typography> : null; })()}</Box></TableCell>
                        <TableCell><Typography variant="caption">¥{(Number(it.costPrice) || 0).toFixed(2)}{(() => { const mat = materials.find(m => m.id === it.materialId); return mat && needsConversion(mat) ? <span style={{ color: '#999' }}>/{getDisplayUnit(mat, 'sales')}</span> : ''; })()}</Typography></TableCell>
                        <TableCell><Typography variant="caption">¥{(Number(it.guidePrice) || 0).toFixed(2)}{(() => { const mat = materials.find(m => m.id === it.materialId); return mat && needsConversion(mat) ? <span style={{ color: '#999' }}>/{getDisplayUnit(mat, 'sales')}</span> : ''; })()}</Typography></TableCell>
                        <TableCell><TextField size="small" type="number" value={it.unitPrice ?? ''} onChange={e => updateItem(idx, 'unitPrice', e.target.value === '' ? '' : Number(e.target.value))} inputProps={{ min: 0, step: '0.01', onFocus: e => e.target.select() }} sx={{ width: 100 }} /></TableCell>
                        <TableCell>¥{((it.qty || 0) * (it.unitPrice || 0)).toLocaleString()}</TableCell>
                        <TableCell><Typography variant="caption" sx={{ fontWeight: 600, color: (Number(it.marginRate) || 0) < 0 ? 'error.main' : 'success.main' }}>{(Number(it.marginRate) || 0).toFixed(1)}%</Typography></TableCell>
                        <TableCell><TextField size="small" value={it.remark || ''} onChange={e => updateItem(idx, 'remark', e.target.value)} placeholder="备注" sx={{ width: 100 }} /></TableCell>
                        <TableCell><Button size="small" variant="contained" color="error" onClick={() => removeItem(idx)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>删除</Button></TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              {(() => { const t = calcTotal(); return (
                <Box sx={{ mt: 1, textAlign: 'right' }}>
                  <Typography>合计: ¥{t.total.toLocaleString()}</Typography>
                </Box>
              ); })()}
            </Box>
          )}
        </DialogContent>
        <DialogActions><Button onClick={handleCloseDialog}>取消</Button><Button variant="contained" onClick={handleSave}>保存</Button></DialogActions>
      </Dialog>

      {/* ===== 地图选点弹窗 ===== */}
      <MapPicker open={mapOpen} onClose={() => setMapOpen(false)}
        onConfirm={(data) => { setDialog(prev => ({ ...prev, data: { ...prev.data, destinationAddress: data.address } })); setMapOpen(false); }}
        title="选择目的地" />

      {/* ===== 关闭确认弹窗 ===== */}
      <Dialog open={confirmClose} onClose={() => setConfirmClose(false)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 600 }}>未保存的更改</DialogTitle>
        <DialogContent>
          <Typography>您有尚未保存的更改，确定要关闭吗？关闭后所有更改将丢失。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClose(false)}>继续编辑</Button>
          <Button onClick={() => { setConfirmClose(false); setDialog({ open: false, mode: 'create', data: null, isCopy: false }); setDialogOriginal(null); }} color="error" variant="contained">放弃更改</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
