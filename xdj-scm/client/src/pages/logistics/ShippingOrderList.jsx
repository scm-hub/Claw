import { useState, useEffect, Fragment } from 'react';
import {
  Box, Typography, Button, TextField, Grid, Stack, Paper, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, Select, MenuItem, InputLabel, FormControl,
  Divider, CircularProgress, Autocomplete,
} from '@mui/material';
import { Add, Print, KeyboardArrowDown, KeyboardArrowUp, Search, RestartAlt, AutoAwesome } from '@mui/icons-material';
import { api } from '../../lib/api';
import PrintDialog from '../../components/PrintDialog';
import MapPicker from '../../components/MapPicker';
import MergeSuggestionPanel from './MergeSuggestionPanel';

const STATUS_MAP = { PENDING: { label: '待发货', color: 'default' }, SHIPPED: { label: '已发货', color: 'warning' }, DELIVERED: { label: '已送达', color: 'success' }, RETURNED: { label: '已退回', color: 'error' }, CANCELLED: { label: '已取消', color: 'default' } };

const STOCKING_MAP = {
  PENDING: { label: '未备货', color: 'warning' },
  READY: { label: '已备货', color: 'success' },
};
const SHIPPING_MAP = {
  PENDING: { label: '未发货', color: 'warning' },
  SHIPPED: { label: '已发货', color: 'success' },
};
const LOGISTICS_MAP = {
  PENDING: { label: '未安排', color: 'warning' },
  ARRANGED: { label: '已安排', color: 'success' },
};

export default function ShippingOrderList() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [filterCustomerId, setFilterCustomerId] = useState('');
  const [filterWarehouseId, setFilterWarehouseId] = useState('');
  const [filterProviderId, setFilterProviderId] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ salesOrderId: '', customerId: '', warehouseId: '', logisticsProviderId: '', carrier: '', transportCost: '', notes: '' });
  const [salesOrders, setSalesOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [providers, setProviders] = useState([]);
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });
  const [printOpen, setPrintOpen] = useState(false);
  const [printRow, setPrintRow] = useState(null);
  const [logisticsOpen, setLogisticsOpen] = useState(false);
  const [logisticsForm, setLogisticsForm] = useState({ id: '', origin: '', destination: '', transportCost: '', shippingDate: '', kilometers: '', logisticsNotes: '', logisticsProviderId: '', vehicleId: '', vehicleType: '', waypoints: '[]' });
  const [vehicles, setVehicles] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [logisticsReadOnly, setLogisticsReadOnly] = useState(false);
  const [waypointMapOpen, setWaypointMapOpen] = useState(false);
  const [waypointMapIndex, setWaypointMapIndex] = useState(-1);
  const [calcLoadingIdx, setCalcLoadingIdx] = useState(-1);
  const [lastToDestDist, setLastToDestDist] = useState(null); // 最后途径地→目的地距离
  const [expandedId, setExpandedId] = useState(null);
  const [detailCache, setDetailCache] = useState({});
  const [loadingDetailId, setLoadingDetailId] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [confirmCreateClose, setConfirmCreateClose] = useState(false);
  const [createFormOriginal, setCreateFormOriginal] = useState(null);
  const [confirmLogisticsClose, setConfirmLogisticsClose] = useState(false);
  const [logisticsFormOriginal, setLogisticsFormOriginal] = useState(null);
  const [shipmentOpen, setShipmentOpen] = useState(false);
  const [shipmentRow, setShipmentRow] = useState(null);
  const [shipmentItems, setShipmentItems] = useState([]);
  const [shipmentLoading, setShipmentLoading] = useState(false);

  // 检查新建发货单表单是否有未保存的改动
  const hasCreateFormChanges = () => {
    if (!createOpen) return false;
    if (!createFormOriginal) return true;
    const keys = ['salesOrderId', 'customerId', 'warehouseId', 'logisticsProviderId', 'carrier', 'transportCost', 'notes'];
    return keys.some(k => String(form[k] ?? '') !== String(createFormOriginal[k] ?? ''));
  };

  // 检查物流表单是否有未保存的改动
  const hasLogisticsFormChanges = () => {
    if (!logisticsOpen) return false;
    if (!logisticsFormOriginal) return true;
    const keys = ['origin', 'destination', 'transportCost', 'shippingDate', 'kilometers', 'logisticsNotes', 'logisticsProviderId', 'vehicleId', 'vehicleType', 'waypoints'];
    return keys.some(k => String(logisticsForm[k] ?? '') !== String(logisticsFormOriginal[k] ?? ''));
  };

  // 尝试关闭新建发货单弹窗
  const handleCloseCreateDialog = () => {
    if (hasCreateFormChanges()) {
      setConfirmCreateClose(true);
    } else {
      setCreateOpen(false);
      setForm({ salesOrderId: '', customerId: '', warehouseId: '', logisticsProviderId: '', carrier: '', transportCost: '', notes: '' });
      setCreateFormOriginal(null);
    }
  };

  // 尝试关闭物流弹窗
  const handleCloseLogisticsDialog = () => {
    if (hasLogisticsFormChanges()) {
      setConfirmLogisticsClose(true);
    } else {
      setLogisticsOpen(false);
      setLogisticsFormOriginal(null);
    }
  };

  const [shipmentQtyCache, setShipmentQtyCache] = useState({});

  // 点击行展开：懒加载销售订单明细 + 装车数量（含缓存）
  const handleRowExpand = async (row) => {
    if (expandedId === row.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(row.id);
    if (!detailCache[row.salesOrderId] && row.salesOrderId) {
      setLoadingDetailId(row.id);
      try {
        const res = await api.get(`/sales/orders/${row.salesOrderId}`);
        setDetailCache(prev => ({ ...prev, [row.salesOrderId]: res.data.data || res.data }));
      } catch {
        setDetailCache(prev => ({ ...prev, [row.salesOrderId]: null }));
      } finally {
        setLoadingDetailId(null);
      }
    }
    // 同时加载装车数量（已发货的才有数据）
    if (!shipmentQtyCache[row.id] && row.shippingStatus === 'SHIPPED') {
      try {
        const res = await api.get(`/logistics/shipping-orders/${row.id}/shipping-items`);
        const qtyMap = {};
        (res.data.items || []).forEach(it => { qtyMap[it.salesOrderItemId] = it.actualQty; });
        setShipmentQtyCache(prev => ({ ...prev, [row.id]: qtyMap }));
      } catch {
        setShipmentQtyCache(prev => ({ ...prev, [row.id]: null }));
      }
    }
  };

  const loadData = () => {
    const params = { page, pageSize: 20 };
    if (statusFilter) params.status = statusFilter;
    if (keyword) params.keyword = keyword;
    if (filterCustomerId) params.customerId = filterCustomerId;
    if (filterWarehouseId) params.warehouseId = filterWarehouseId;
    if (filterProviderId) params.logisticsProviderId = filterProviderId;
    if (filterDateStart) params.dateStart = filterDateStart;
    if (filterDateEnd) params.dateEnd = filterDateEnd;
    api.get('/logistics/shipping-orders', { params }).then((res) => { setList(res.data.list || []); setTotal(res.data.total || 0); });
  };
  useEffect(() => { loadData(); }, [page]);
  useEffect(() => { setExpandedId(null); }, [page]);
  useEffect(() => {
    api.get('/sales/orders', { params: { page: 1, pageSize: 99, status: 'APPROVED' } }).then((res) => setSalesOrders(res.data.list || []));
    api.get('/master/customers', { params: { page: 1, pageSize: 999 } }).then((res) => setCustomers(res.data.list || []));
    api.get('/master/warehouses').then((res) => setWarehouses(res.data || []));
    api.get('/logistics/providers', { params: { status: 'ACTIVE' } }).then((res) => setProviders(res.data || []));
    api.get('/address', { params: { status: 'ACTIVE' } }).then((res) => setAddresses(res.data?.list || []));
  }, []);

  const handleCreate = () => {
    api.post('/logistics/shipping-orders', { ...form, transportCost: Number(form.transportCost) || 0 }).then(() => {
      setSnack({ open: true, msg: '发货单创建成功', sev: 'success' }); setCreateOpen(false); setForm({ salesOrderId: '', customerId: '', warehouseId: '', logisticsProviderId: '', carrier: '', transportCost: '', notes: '' }); setCreateFormOriginal(null); loadData();
    }).catch((e) => setSnack({ open: true, msg: e.response?.data?.message || '失败', sev: 'error' }));
  };
  const handleStatus = (id, status) => {
    api.put(`/logistics/shipping-orders/${id}/status`, { status }).then(() => { setSnack({ open: true, msg: '状态更新', sev: 'success' }); loadData(); }).catch((e) => setSnack({ open: true, msg: e.response?.data?.message || '失败', sev: 'error' }));
  };

  const handleStockingStatus = (id, val) => {
    api.put(`/logistics/shipping-orders/${id}/stocking-status`, { stockingStatus: val }).then(() => { setSnack({ open: true, msg: '备货状态已更新', sev: 'success' }); loadData(); }).catch((e) => setSnack({ open: true, msg: e.response?.data?.message || '失败', sev: 'error' }));
  };
  const handleShippingStatus = async (row) => {
    if (row.logisticsStatus !== 'ARRANGED') {
      setSnack({ open: true, msg: '请先安排物流后再发货', sev: 'warning' });
      return;
    }
    if (row.stockingStatus !== 'READY') {
      setSnack({ open: true, msg: '请先完成备货后再发货', sev: 'warning' });
      return;
    }
    // 打开确认发货弹窗，加载明细
    setShipmentRow(row);
    setShipmentLoading(true);
    setShipmentOpen(true);
    try {
      const res = await api.get(`/logistics/shipping-orders/${row.id}/shipping-items`);
      setShipmentItems(res.data.items || []);
    } catch (e) {
      setSnack({ open: true, msg: e.message || '加载明细失败', sev: 'error' });
      setShipmentOpen(false);
    } finally {
      setShipmentLoading(false);
    }
  };
  const handleFinalConfirm = (row) => {
    if (!confirm(`确认完成发货单 ${row.shippingNo} 的全部流程？\n确认后将推送出入库记录到仓储WMS，完成后将无法撤销。`)) return;
    api.put(`/logistics/shipping-orders/${row.id}/final-confirm`).then(() => {
      setSnack({ open: true, msg: '最终确认成功，出入库记录已推送', sev: 'success' });
      loadData();
    }).catch((e) => setSnack({ open: true, msg: e.response?.data?.message || '确认失败', sev: 'error' }));
  };

  const handleShipmentQtyChange = (index, value) => {
    const newItems = [...shipmentItems];
    newItems[index].actualQty = value === '' ? '' : Number(value);
    setShipmentItems(newItems);
  };
  const handleConfirmShipment = () => {
    const items = shipmentItems.map(it => ({
      salesOrderItemId: it.salesOrderItemId,
      materialId: it.materialId,
      orderQty: it.orderQty,
      actualQty: it.actualQty === '' || it.actualQty === undefined ? 0 : Number(it.actualQty),
    }));
    api.put(`/logistics/shipping-orders/${shipmentRow.id}/confirm-shipment`, { items }).then(() => {
      setSnack({ open: true, msg: '发货确认成功', sev: 'success' });
      setShipmentOpen(false);
      setShipmentRow(null);
      setShipmentItems([]);
      loadData();
    }).catch((e) => setSnack({ open: true, msg: e.message || '发货确认失败', sev: 'error' }));
  };
  const handleLogisticsStatus = (row, val) => {
    if (val === 'ARRANGED') {
      const lForm = {
        id: row.id,
        origin: row.origin || '',
        destination: row.destination || '',
        transportCost: row.transportCost ? String(row.transportCost) : '',
        shippingDate: row.shippingDate ? new Date(row.shippingDate).toISOString().slice(0, 10) : '',
        kilometers: row.kilometers ? String(row.kilometers) : '',
        logisticsNotes: row.logisticsNotes || '',
        logisticsProviderId: row.logisticsProviderId || '',
        vehicleId: row.vehicleId || '',
        vehicleType: row.vehicle?.vehicleType || '',
        waypoints: row.waypoints ? JSON.stringify(row.waypoints) : '[]',
      };
      setLogisticsForm(lForm);
      setLogisticsFormOriginal(JSON.parse(JSON.stringify(lForm)));
      setLastToDestDist(null);
      setLogisticsReadOnly(row.shippingStatus === 'SHIPPED');
      if (row.logisticsProviderId) {
        api.get(`/logistics/providers/${row.logisticsProviderId}/vehicles`).then((res) => setVehicles(res.data || [])).catch(() => setVehicles([]));
      } else {
        setVehicles([]);
      }
      setLogisticsOpen(true);
      return;
    }
    api.put(`/logistics/shipping-orders/${row.id}/logistics-status`, { logisticsStatus: val }).then(() => { setSnack({ open: true, msg: '物流状态已更新', sev: 'success' }); loadData(); }).catch((e) => setSnack({ open: true, msg: e.response?.data?.message || '失败', sev: 'error' }));
  };
  const handleProviderChange = (providerId) => {
    setLogisticsForm({ ...logisticsForm, logisticsProviderId: providerId, vehicleId: '' });
    if (providerId) {
      api.get(`/logistics/providers/${providerId}/vehicles`).then((res) => setVehicles(res.data || [])).catch(() => setVehicles([]));
    } else {
      setVehicles([]);
    }
  };
  const handleLogisticsSubmit = () => {
    const { id, origin, destination, transportCost, shippingDate, kilometers, logisticsNotes, logisticsProviderId, vehicleId, waypoints } = logisticsForm;
    let parsedWaypoints;
    try { parsedWaypoints = JSON.parse(waypoints || '[]'); } catch { parsedWaypoints = []; }
    api.put(`/logistics/shipping-orders/${id}/logistics-status`, {
      logisticsStatus: 'ARRANGED', origin, destination, transportCost: Number(transportCost) || 0, shippingDate, kilometers, logisticsNotes, logisticsProviderId, vehicleId,
      waypoints: parsedWaypoints.length > 0 ? parsedWaypoints : undefined,
    }).then(() => {
      setSnack({ open: true, msg: '物流信息已保存', sev: 'success' }); setLogisticsOpen(false); setLogisticsFormOriginal(null); loadData();
    }).catch((e) => setSnack({ open: true, msg: e.response?.data?.message || '失败', sev: 'error' }));
  };

  // ===== 途径地管理 =====
  const getWaypoints = () => {
    try { return JSON.parse(logisticsForm.waypoints || '[]'); } catch { return []; }
  };
  const setWaypoints = (wps) => {
    setLogisticsForm({ ...logisticsForm, waypoints: JSON.stringify(wps) });
  };
  const handleAddWaypoint = () => {
    const wps = getWaypoints();
    setWaypoints([...wps, { name: '', address: '', lng: '', lat: '', distanceFromPrev: '' }]);
    setWaypointMapIndex(wps.length);
    setWaypointMapOpen(true);
  };
  const handleRemoveWaypoint = (idx) => {
    const wps = getWaypoints();
    wps.splice(idx, 1);
    setWaypoints(wps);
    // 重新计算后续途径地距离
    recalcWaypointDistances(wps, idx);
    // 更新最后途径地→目的地距离
    if (wps.length > 0) {
      calcLastToDest(wps);
    } else {
      setLastToDestDist(null);
    }
  };
  const handleWaypointMapConfirm = (loc) => {
    const wps = getWaypoints();
    const idx = waypointMapIndex;
    if (idx < 0 || idx >= wps.length) return;
    wps[idx] = {
      ...wps[idx],
      name: loc.name || loc.address || '',
      address: loc.address || loc.name || '',
      lng: loc.lng || '',
      lat: loc.lat || '',
    };
    setWaypoints(wps);
    setWaypointMapOpen(false);
    setWaypointMapIndex(-1);
    // 自动计算距离（传入已更新的 wps，避免异步 state 延迟）
    calcWaypointDistance(idx, wps);
  };
  // 计算从上一个点到当前途径地的距离（可选传入 wps 避免异步延迟）
  const calcWaypointDistance = async (idx, currentWps) => {
    const wps = currentWps || getWaypoints();
    if (idx < 0 || idx >= wps.length) return;
    // 获取上一个点的经纬度
    let prevLng, prevLat;
    if (idx === 0) {
      // 第一个途径地：从始发地开始计算
      const selectedAddr = addresses.find(a => a.title === logisticsForm.origin && a.destName === logisticsForm.destination);
      if (!selectedAddr?.originLng || !selectedAddr?.originLat) return;
      prevLng = selectedAddr.originLng;
      prevLat = selectedAddr.originLat;
    } else {
      prevLng = wps[idx - 1].lng;
      prevLat = wps[idx - 1].lat;
    }
    const curr = wps[idx];
    if (!curr.lng || !curr.lat || !prevLng || !prevLat) return;
    setCalcLoadingIdx(idx);
    try {
      const res = await api.get('/address/distance', { params: { originLng: prevLng, originLat: prevLat, destLng: curr.lng, destLat: curr.lat } });
      if (res.data?.distance != null) {
        wps[idx].distanceFromPrev = res.data.distance;
        setWaypoints(wps);
      }
    } catch { /* ignore */ }
    // 如果是最后一个途径地，同时计算最后途径地→目的地的距离
    if (idx === wps.length - 1) {
      await calcLastToDest(wps);
    }
    setCalcLoadingIdx(-1);
  };
  // 批量重新计算从 startIdx 开始的途径地距离
  const recalcWaypointDistances = async (wps, startIdx) => {
    for (let i = startIdx; i < wps.length; i++) {
      let prevLng, prevLat;
      if (i === 0) {
        const selectedAddr = addresses.find(a => a.title === logisticsForm.origin && a.destName === logisticsForm.destination);
        if (!selectedAddr?.originLng || !selectedAddr?.originLat) continue;
        prevLng = selectedAddr.originLng;
        prevLat = selectedAddr.originLat;
      } else {
        prevLng = wps[i - 1].lng;
        prevLat = wps[i - 1].lat;
      }
      const curr = wps[i];
      if (!curr.lng || !curr.lat || !prevLng || !prevLat) continue;
      setCalcLoadingIdx(i);
      try {
        const res = await api.get('/address/distance', { params: { originLng: prevLng, originLat: prevLat, destLng: curr.lng, destLat: curr.lat } });
        if (res.data?.distance != null) {
          wps[i].distanceFromPrev = res.data.distance;
          setWaypoints([...wps]);
        }
      } catch { /* ignore */ }
      setCalcLoadingIdx(-1);
    }
    // 更新最后途径地→目的地距离
    if (wps.length > 0) calcLastToDest(wps);
  };
  // 计算最后途径地到目的地的距离
  const calcLastToDest = async (wps) => {
    if (!wps || wps.length === 0) { setLastToDestDist(null); return; }
    const lastWp = wps[wps.length - 1];
    if (!lastWp.lng || !lastWp.lat) { setLastToDestDist(null); return; }
    const selectedAddr = addresses.find(a => a.title === logisticsForm.origin && a.destName === logisticsForm.destination);
    if (!selectedAddr?.destLng || !selectedAddr?.destLat) { setLastToDestDist(null); return; }
    try {
      const res = await api.get('/address/distance', { params: { originLng: lastWp.lng, originLat: lastWp.lat, destLng: selectedAddr.destLng, destLat: selectedAddr.destLat } });
      if (res.data?.distance != null) {
        setLastToDestDist(res.data.distance);
      } else {
        setLastToDestDist(null);
      }
    } catch { setLastToDestDist(null); }
  };
  // 计算总里程（有途径地时：途径段之和 + 最后途径地→目的地；无途径地：直接基础公里）
  const getTotalKilometers = () => {
    const wps = getWaypoints();
    if (wps.length === 0) return (parseFloat(logisticsForm.kilometers) || 0).toFixed(2);
    const wpSum = wps.reduce((sum, w) => sum + (parseFloat(w.distanceFromPrev) || 0), 0);
    const destDist = parseFloat(lastToDestDist) || 0;
    return (wpSum + destDist).toFixed(2);
  };

  const handlePrint = async (row) => {
    // 获取销售订单明细用于打印模板变量
    try {
      const res = await api.get(`/sales/orders/${row.salesOrderId}`);
      setPrintRow({ ...row, salesOrderDetail: res.data });
    } catch {
      setPrintRow(row);
    }
    setPrintOpen(true);
  };

  // 构造打印模板变量数据
  const getPrintData = () => {
    if (!printRow) return {};
    const items = printRow.salesOrderDetail?.items || [];
    return {
      shippingNo: printRow.shippingNo,
      salesOrderNo: printRow.salesOrder?.orderNo || '-',
      customerName: printRow.customer?.name || '-',
      customerPhone: printRow.customer?.contactPhone || '-',
      warehouseName: printRow.warehouse?.name || '-',
      carrierName: printRow.logisticsProvider?.name || printRow.carrier || '-',
      trackingNo: printRow.trackingNo || '-',
      shippingDate: printRow.shippingDate ? new Date(printRow.shippingDate).toLocaleDateString('zh-CN') : '-',
      transportCost: Number(printRow.transportCost || 0).toFixed(2),
      items: items.map((it, i) => ({
        index: i + 1,
        materialName: it.material?.name || '-',
        spec: it.material?.spec || '-',
        unit: it.material?.unit || '-',
        qty: it.qty,
        // 质量检验报告相关变量
        productName: it.material?.name || '-',
        batchNo: it.batchNo || '-',
        quantity: it.qty,
        unitPrice: it.unitPrice ? Number(it.unitPrice).toFixed(2) : '-',
      })),
      // 质量检验报告变量
      productName: items[0]?.material?.name || '-',
      batchNo: items[0]?.batchNo || '-',
      spec: items[0]?.material?.spec || '-',
      quantity: items.reduce((s, it) => s + (it.qty || 0), 0),
      sampleQty: '-',
      inspectorName: '-',
      inspectorDate: '-',
      reviewerName: '-',
      reviewerDate: '-',
      conclusion: '-',
    };
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>发货管理</Typography>
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
        <Tab label="发货列表" />
        <Tab label="智能建议" icon={<AutoAwesome fontSize="small" />} iconPosition="start" />
      </Tabs>
      {activeTab === 1 ? (
        <MergeSuggestionPanel providers={providers} vehicles={vehicles} onMergeSuccess={() => { setActiveTab(0); loadData(); }} />
      ) : (<>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap">
        <TextField size="small" placeholder="单号/客户/销售订单" value={keyword} onChange={e => setKeyword(e.target.value)} sx={{ width: 180 }} InputProps={{ startAdornment: <Search fontSize="small" sx={{ mr: 0.5 }} /> }} />
        <TextField size="small" select label="状态" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} sx={{ width: 120 }}>
          <MenuItem value="">全部</MenuItem>{Object.entries(STATUS_MAP).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
        </TextField>
        <TextField size="small" select label="客户" value={filterCustomerId} onChange={e => setFilterCustomerId(e.target.value)} sx={{ width: 150 }}>
          <MenuItem value="">全部</MenuItem>{customers.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
        </TextField>
        <TextField size="small" select label="仓库" value={filterWarehouseId} onChange={e => setFilterWarehouseId(e.target.value)} sx={{ width: 150 }}>
          <MenuItem value="">全部</MenuItem>{warehouses.map(w => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
        </TextField>
        <TextField size="small" select label="承运商" value={filterProviderId} onChange={e => setFilterProviderId(e.target.value)} sx={{ width: 150 }}>
          <MenuItem value="">全部</MenuItem>{providers.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
        </TextField>
        <TextField size="small" type="date" label="起始日期" value={filterDateStart} onChange={e => setFilterDateStart(e.target.value)} sx={{ width: 140 }} InputLabelProps={{ shrink: true }} />
        <TextField size="small" type="date" label="截止日期" value={filterDateEnd} onChange={e => setFilterDateEnd(e.target.value)} sx={{ width: 140 }} InputLabelProps={{ shrink: true }} />
        <Button variant="contained" size="small" onClick={loadData}>查询</Button>
        <Button variant="outlined" size="small" startIcon={<RestartAlt />} onClick={() => { setKeyword(''); setStatusFilter(''); setFilterCustomerId(''); setFilterWarehouseId(''); setFilterProviderId(''); setFilterDateStart(''); setFilterDateEnd(''); }}>重置</Button>
        <Button variant="outlined" startIcon={<Add />} onClick={() => { const initForm = { salesOrderId: '', customerId: '', warehouseId: '', logisticsProviderId: '', carrier: '', transportCost: '', notes: '' }; setForm(initForm); setCreateFormOriginal(JSON.parse(JSON.stringify(initForm))); setCreateOpen(true); }}>新建发货单</Button>
        {(keyword || statusFilter || filterCustomerId || filterWarehouseId || filterProviderId || filterDateStart || filterDateEnd) && (
          <Stack direction="row" spacing={0.5} sx={{ ml: 1 }}>
            {keyword && <Chip label={`关键词: ${keyword}`} size="small" onDelete={() => { setKeyword(''); loadData(); }} />}
            {statusFilter && <Chip label={`状态: ${STATUS_MAP[statusFilter]?.label || statusFilter}`} size="small" onDelete={() => { setStatusFilter(''); loadData(); }} />}
            {filterCustomerId && <Chip label={`客户: ${customers.find(c => c.id === filterCustomerId)?.name || filterCustomerId}`} size="small" onDelete={() => { setFilterCustomerId(''); loadData(); }} />}
            {filterWarehouseId && <Chip label={`仓库: ${warehouses.find(w => w.id === filterWarehouseId)?.name || filterWarehouseId}`} size="small" onDelete={() => { setFilterWarehouseId(''); loadData(); }} />}
            {filterProviderId && <Chip label={`承运商: ${providers.find(p => p.id === filterProviderId)?.name || filterProviderId}`} size="small" onDelete={() => { setFilterProviderId(''); loadData(); }} />}
            {(filterDateStart || filterDateEnd) && <Chip label={`日期: ${filterDateStart || '?'} ~ ${filterDateEnd || '?'}`} size="small" onDelete={() => { setFilterDateStart(''); setFilterDateEnd(''); loadData(); }} />}
          </Stack>
        )}
      </Stack>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={{ width: 36 }} />
              <TableCell>发货单号</TableCell>
              <TableCell>销售订单</TableCell>
              <TableCell>客户</TableCell>
              <TableCell>仓库</TableCell>
              <TableCell>承运商</TableCell>
              <TableCell>物流状态</TableCell>
              <TableCell>备货状态</TableCell>
              <TableCell>发货状态</TableCell>
              <TableCell>发货日期</TableCell>
              <TableCell>运费</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((row) => {
              const isOpen = expandedId === row.id;
              return (
                <Fragment key={row.id}>
                  <TableRow
                    hover
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => handleRowExpand(row)}
                  >
                    <TableCell padding="checkbox" sx={{ width: 36 }}>
                      <IconButton size="small" sx={{ p: 0.5 }}>
                        {isOpen ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ fontWeight: isOpen ? 'bold' : 'normal' }}>
                      {row.isMerged ? (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Chip label="合并单" size="small" color="secondary" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                          {row.shippingNo}
                        </Stack>
                      ) : row.shippingNo}
                    </TableCell>
                    <TableCell>{row.isMerged ? (row.mergedFromIds?.length ? `合并${row.mergedFromIds.length}单` : '-') : (row.salesOrder?.orderNo || '-')}</TableCell>
                    <TableCell>{row.customer?.name || '-'}</TableCell>
                    <TableCell>{row.warehouse?.name || '-'}</TableCell>
                    <TableCell>{row.logisticsProvider?.name || row.carrier || '-'}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {(row.logisticsStatus === 'ARRANGED') ? (
                        <Chip label="已安排" color="success" size="small" clickable onClick={() => handleLogisticsStatus(row, 'ARRANGED')} />
                      ) : (
                        <Button
                          size="small"
                          variant="contained"
                          color="warning"
                          onClick={() => handleLogisticsStatus(row, 'ARRANGED')}
                          sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}
                        >
                          未安排
                        </Button>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {(row.stockingStatus === 'READY') ? (
                        <Chip label="已备货" color="success" size="small" />
                      ) : (
                        <Button
                          size="small"
                          variant="contained"
                          color="warning"
                          onClick={() => handleStockingStatus(row.id, 'READY')}
                          sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}
                        >
                          未备货
                        </Button>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {(row.shippingStatus === 'SHIPPED') ? (
                        <Chip label="已发货" color="success" size="small" />
                      ) : (
                        <Button
                          size="small"
                          variant="contained"
                          color="warning"
                          onClick={() => handleShippingStatus(row)}
                          sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}
                        >
                          未发货
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>{row.shippingDate ? new Date(row.shippingDate).toLocaleDateString('zh-CN') : '-'}</TableCell>
                    <TableCell>{Number(row.transportCost).toFixed(2)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0.5}>
                        <Button size="small" variant="contained" color="primary" startIcon={<Print sx={{ fontSize: '0.9rem' }} />} onClick={() => handlePrint(row)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>打印</Button>
                        {row.logisticsStatus === 'ARRANGED' && row.stockingStatus === 'READY' && row.shippingStatus === 'SHIPPED' && row.status !== 'DELIVERED' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => handleFinalConfirm(row)}
                            sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}
                          >
                            确认
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow>
                      <TableCell colSpan={12} sx={{ py: 0, bgcolor: 'grey.50' }}>
                        <Box sx={{ p: 2 }}>
                          {/* ===== 物流信息 ===== */}
                          <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: 'text.secondary' }}>物流信息</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                            {                            [
                              ['地址', row.origin],
                              ['司机', row.vehicle?.driverName],
                              ['电话', row.vehicle?.driverPhone],
                              ['公里数', row.kilometers ? `${row.kilometers} km` : null],
                              ['车牌号', row.vehicle?.plateNo],
                              ['车型', row.vehicle?.vehicleType],
                            ].filter(([, v]) => v).map(([label, val]) => (
                              <Box key={label} sx={{ minWidth: 120 }}>
                                <Typography variant="caption" color="text.secondary">{label}</Typography>
                                <Typography variant="body2" sx={{ fontSize: '13px' }}>{val || '-'}</Typography>
                              </Box>
                            ))}
                          </Box>
                          {row.logisticsNotes && (
                            <Box sx={{ mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">备注</Typography>
                              <Typography variant="body2" sx={{ fontSize: '13px' }}>{row.logisticsNotes}</Typography>
                            </Box>
                          )}

                          {/* ===== 分割线 ===== */}
                          <Divider sx={{ my: 2 }} />

                          {/* ===== 销售订单明细 ===== */}
                          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}>
                            销售订单明细
                            {row.salesOrder?.orderNo && (
                              <Chip label={row.salesOrder.orderNo} size="small" variant="outlined" sx={{ ml: 1, height: 20, fontSize: 11 }} />
                            )}
                          </Typography>
                          {loadingDetailId === row.id ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                              <CircularProgress size={16} />
                              <Typography variant="body2" color="text.secondary">加载明细中...</Typography>
                            </Box>
                          ) : (() => {
                            const soDetail = detailCache[row.salesOrderId];
                            if (!row.salesOrderId) return <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>暂无关联销售订单</Typography>;
                            if (soDetail === null) return <Typography variant="body2" color="error" sx={{ py: 1 }}>明细加载失败</Typography>;
                            if (!soDetail) return null;
                            const items = soDetail.items || [];
                            if (!items.length) return <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>暂无明细数据</Typography>;
                            const totalQty = items.reduce((s, it) => s + Number(it.qty || 0), 0);
                            const totalAmount = items.reduce((s, it) => s + Number(it.lineTotal || 0), 0);
                            return (
                              <Table size="small">
                                <TableHead>
                                  <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 600, bgcolor: 'grey.100', py: 0.75 } }}>
                                    <TableCell>序号</TableCell>
                                    <TableCell>物料名称</TableCell>
                                    <TableCell>规格</TableCell>
                                    <TableCell>单位</TableCell>
                                    <TableCell align="right">数量</TableCell>
                                    <TableCell align="right">装车数量</TableCell>
                                    <TableCell align="right">单价（元）</TableCell>
                                    <TableCell align="right">税率</TableCell>
                                    <TableCell align="right">金额（元）</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {items.map((it, idx) => (
                                    <TableRow key={it.id}>
                                      <TableCell sx={{ color: 'text.secondary' }}>{idx + 1}</TableCell>
                                      <TableCell sx={{ fontWeight: 500 }}>{it.material?.name || '-'}</TableCell>
                                      <TableCell>{it.material?.spec || '-'}</TableCell>
                                      <TableCell>{it.material?.salesUnit || it.material?.unit || '-'}</TableCell>
                                      <TableCell align="right">{Number(it.qty)}</TableCell>
                                      <TableCell align="right">{shipmentQtyCache[row.id]?.[it.id] ?? (row.shippingStatus === 'SHIPPED' ? '-' : '')}</TableCell>
                                      <TableCell align="right">{Number(it.unitPrice).toFixed(2)}</TableCell>
                                      <TableCell align="right">{it.taxRate ? `${Number(it.taxRate)}%` : '-'}</TableCell>
                                      <TableCell align="right" sx={{ fontWeight: 600, color: 'primary.main' }}>{Number(it.lineTotal || 0).toFixed(2)}</TableCell>
                                    </TableRow>
                                  ))}
                                  <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 700, borderTop: '2px solid', borderColor: 'divider', bgcolor: 'grey.50' } }}>
                                    <TableCell colSpan={4} align="right">合计</TableCell>
                                    <TableCell align="right">{totalQty}</TableCell>
                                    <TableCell align="right">{shipmentQtyCache[row.id] ? items.reduce((s, it) => s + (shipmentQtyCache[row.id][it.id] || 0), 0) : ''}</TableCell>
                                    <TableCell />
                                    <TableCell />
                                    <TableCell align="right" sx={{ color: 'primary.main' }}>{totalAmount.toFixed(2)}</TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            );
                          })()}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
            {!list.length && <TableRow><TableCell colSpan={12} align="center">暂无数据</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={createOpen} onClose={handleCloseCreateDialog} maxWidth="sm" fullWidth>
        <DialogTitle>新建发货单</DialogTitle>
        <DialogContent><Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}><FormControl fullWidth size="small"><InputLabel>销售订单</InputLabel><Select value={form.salesOrderId} onChange={(e) => { const so = salesOrders.find(o => o.id === e.target.value); setForm({ ...form, salesOrderId: e.target.value, customerId: so?.customerId || '', warehouseId: so?.warehouseId || '' }); }} label="销售订单">{salesOrders.map((o) => <MenuItem key={o.id} value={o.id}>{o.orderNo}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={6}><FormControl fullWidth size="small"><InputLabel>客户</InputLabel><Select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} label="客户">{customers.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={6}><FormControl fullWidth size="small"><InputLabel>仓库</InputLabel><Select value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })} label="仓库">{warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={6}><FormControl fullWidth size="small"><InputLabel>承运商</InputLabel><Select value={form.logisticsProviderId} onChange={(e) => setForm({ ...form, logisticsProviderId: e.target.value })} label="承运商"><MenuItem value="">无</MenuItem>{providers.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={6}><TextField label="运费" type="number" fullWidth size="small" value={form.transportCost} onChange={(e) => setForm({ ...form, transportCost: e.target.value })} /></Grid>
          <Grid item xs={12}><TextField label="备注" fullWidth size="small" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Grid>
        </Grid></DialogContent>
        <DialogActions><Button onClick={handleCloseCreateDialog}>取消</Button><Button variant="contained" onClick={handleCreate}>创建</Button></DialogActions>
      </Dialog>
      <Dialog open={logisticsOpen} onClose={handleCloseLogisticsDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{logisticsReadOnly ? '查看物流信息' : '安排物流'}</DialogTitle>
        <DialogContent><Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={6}><FormControl fullWidth size="small" disabled={logisticsReadOnly}><InputLabel>承运商</InputLabel><Select value={logisticsForm.logisticsProviderId} onChange={(e) => handleProviderChange(e.target.value)} label="承运商"><MenuItem value="">无</MenuItem>{providers.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={6}><FormControl fullWidth size="small" disabled={logisticsReadOnly || !logisticsForm.logisticsProviderId}><InputLabel>车辆</InputLabel><Select value={logisticsForm.vehicleId} onChange={(e) => { const v = vehicles.find(v => v.id === e.target.value); setLogisticsForm({ ...logisticsForm, vehicleId: e.target.value, vehicleType: v?.vehicleType || '' }); }} label="车辆"><MenuItem value="">无</MenuItem>{vehicles.map((v) => <MenuItem key={v.id} value={v.id}>{v.plateNo}（{v.driverName}）</MenuItem>)}</Select></FormControl></Grid>
          <Grid item xs={6}><TextField label="车型" fullWidth size="small" value={logisticsForm.vehicleType} InputProps={{ readOnly: true }} /></Grid>
          <Grid item xs={6}><FormControl fullWidth size="small" disabled={logisticsReadOnly}>
            <Autocomplete
              options={addresses}
              getOptionLabel={(a) => a.title || `${a.originName}至${a.destName}`}
              value={addresses.find(a => a.title === logisticsForm.origin && a.destName === logisticsForm.destination) || null}
              onChange={(_, addr) => {
                if (addr) {
                  setLogisticsForm({ ...logisticsForm,
                    origin: addr.title || `${addr.originName}至${addr.destName}`,
                    destination: addr.destName,
                    kilometers: addr.distance != null ? String(Number(addr.distance)) : logisticsForm.kilometers,
                    _originLng: addr.originLng,
                    _originLat: addr.originLat,
                    _destLng: addr.destLng,
                    _destLat: addr.destLat,
                  });
                  // 地址变更后重新计算最后途径地→目的地
                  const wps = getWaypoints();
                  if (wps.length > 0 && addr.destLng && addr.destLat) {
                    const lastWp = wps[wps.length - 1];
                    if (lastWp.lng && lastWp.lat) {
                      api.get('/address/distance', { params: { originLng: lastWp.lng, originLat: lastWp.lat, destLng: addr.destLng, destLat: addr.destLat } })
                        .then(res => { if (res.data?.distance != null) setLastToDestDist(res.data.distance); })
                        .catch(() => {});
                    }
                  }
                }
              }}
              isOptionEqualToValue={(opt, val) => opt.id === val?.id}
              renderInput={(params) => <TextField {...params} label="地址" size="small" placeholder="搜索地址标题…" />}
              noOptionsText="无匹配地址"
              disabled={logisticsReadOnly}
            />
          </FormControl></Grid>
          <Grid item xs={6}><TextField label="运费" type="number" fullWidth size="small" value={logisticsForm.transportCost} onChange={(e) => setLogisticsForm({ ...logisticsForm, transportCost: e.target.value })} disabled={logisticsReadOnly} /></Grid>
          <Grid item xs={6}><TextField label="发货日期" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} value={logisticsForm.shippingDate} onChange={(e) => setLogisticsForm({ ...logisticsForm, shippingDate: e.target.value })} disabled={logisticsReadOnly} /></Grid>
          <Grid item xs={6}><TextField label="公里数" type="number" fullWidth size="small" value={logisticsForm.kilometers} onChange={(e) => setLogisticsForm({ ...logisticsForm, kilometers: e.target.value })} disabled={logisticsReadOnly} /></Grid>
          {/* ===== 途径地管理 ===== */}
          <Grid item xs={12}>
            <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2, p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: getWaypoints().length > 0 ? 1.5 : 0 }}>
                <Typography variant="subtitle2" color="text.secondary">途径地点</Typography>
                {!logisticsReadOnly && (
                  <Button size="small" variant="outlined" onClick={handleAddWaypoint}
                    sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>
                    + 添加途径地
                  </Button>
                )}
              </Box>
              {getWaypoints().map((wp, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Chip label={idx + 1} size="small" color="primary" sx={{ minWidth: 28, fontSize: '0.7rem' }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                      {wp.name || wp.address || '未选择'}
                    </Typography>
                    {wp.address && (
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {wp.address}
                      </Typography>
                    )}
                  </Box>
                  <TextField
                    label="公里"
                    type="number"
                    size="small"
                    value={wp.distanceFromPrev}
                    InputProps={{
                      endAdornment: calcLoadingIdx === idx ? <CircularProgress size={14} /> : null,
                      readOnly: true,
                    }}
                    sx={{ width: 90, '& .MuiInputBase-input': { fontSize: '0.75rem', textAlign: 'right' } }}
                  />
                  {!logisticsReadOnly && (
                    <>
                      <Button size="small" variant="contained" color="primary"
                        onClick={() => { setWaypointMapIndex(idx); setWaypointMapOpen(true); }}
                        sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>
                        {wp.name ? '重选' : '选位置'}
                      </Button>
                      <Button size="small" variant="contained" color="error"
                        onClick={() => handleRemoveWaypoint(idx)}
                        sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>
                        删除
                      </Button>
                    </>
                  )}
                </Box>
              ))}
              {getWaypoints().length > 0 && (
                <Box sx={{ textAlign: 'right', mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    途经 {getWaypoints().reduce((s, w) => s + (parseFloat(w.distanceFromPrev) || 0), 0).toFixed(2)}km
                    {lastToDestDist != null && <> + 最后→目的地 {Number(lastToDestDist).toFixed(2)}km</>}
                    {' = '}
                    <Typography component="span" variant="body2" color="primary.main" fontWeight={700}>
                      总 {getTotalKilometers()}km
                    </Typography>
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
          <Grid item xs={12}><TextField label="备注" fullWidth size="small" multiline rows={2} value={logisticsForm.logisticsNotes} onChange={(e) => setLogisticsForm({ ...logisticsForm, logisticsNotes: e.target.value })} disabled={logisticsReadOnly} /></Grid>
        </Grid></DialogContent>
        <DialogActions><Button onClick={handleCloseLogisticsDialog}>{logisticsReadOnly ? '关闭' : '取消'}</Button>{!logisticsReadOnly && <Button variant="contained" onClick={handleLogisticsSubmit}>确认安排</Button>}</DialogActions>
      </Dialog>
      {/* ===== 途径地地图选点 ===== */}
      <MapPicker
        open={waypointMapOpen}
        onClose={() => { setWaypointMapOpen(false); setWaypointMapIndex(-1); }}
        onConfirm={handleWaypointMapConfirm}
        title="选择途径地点"
      />
      {/* ===== 确认发货弹窗 ===== */}
      <Dialog open={shipmentOpen} onClose={() => { setShipmentOpen(false); setShipmentRow(null); setShipmentItems([]); }} maxWidth="md" fullWidth>
        <DialogTitle>确认发货 — {shipmentRow?.shippingNo || ''}</DialogTitle>
        <DialogContent>
          {shipmentLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">加载明细中...</Typography>
            </Box>
          ) : shipmentItems.length > 0 ? (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 600, bgcolor: 'grey.100' } }}>
                  <TableCell>序号</TableCell>
                  <TableCell>物料名称</TableCell>
                  <TableCell>规格</TableCell>
                  <TableCell>单位</TableCell>
                  <TableCell align="right">订单数量</TableCell>
                  <TableCell align="right">实际装车数量</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {shipmentItems.map((it, idx) => (
                  <TableRow key={it.salesOrderItemId || idx}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{it.materialName}</TableCell>
                    <TableCell>{it.materialSpec || '-'}</TableCell>
                    <TableCell>{it.materialSalesUnit || '-'}</TableCell>
                    <TableCell align="right">{it.orderQty}</TableCell>
                    <TableCell align="right">
                      <TextField
                        type="number"
                        size="small"
                        value={it.actualQty ?? ''}
                        placeholder="0"
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleShipmentQtyChange(idx, e.target.value)}
                        sx={{ width: 100 }}
                        inputProps={{ min: 0, max: it.orderQty, style: { textAlign: 'right' } }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 700, borderTop: '2px solid', borderColor: 'divider', bgcolor: 'grey.50' } }}>
                  <TableCell colSpan={4} align="right">合计</TableCell>
                  <TableCell align="right">{shipmentItems.reduce((s, it) => s + it.orderQty, 0)}</TableCell>
                  <TableCell align="right" sx={{ color: 'primary.main' }}>{shipmentItems.reduce((s, it) => s + (it.actualQty || 0), 0)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>暂无明细数据</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setShipmentOpen(false); setShipmentRow(null); setShipmentItems([]); }}>取消</Button>
          <Button variant="contained" color="success" disabled={shipmentLoading || shipmentItems.length === 0} onClick={handleConfirmShipment}>确认发货</Button>
        </DialogActions>
      </Dialog>

      <Snackbar anchorOrigin={{ vertical: 'top', horizontal: 'center' }} open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}><Alert severity={snack.sev}>{snack.msg}</Alert></Snackbar>

      {/* ===== 新建发货单关闭确认弹窗 ===== */}
      <Dialog open={confirmCreateClose} onClose={() => setConfirmCreateClose(false)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 600 }}>未保存的更改</DialogTitle>
        <DialogContent>
          <Typography>您有尚未保存的更改，确定要关闭吗？关闭后所有更改将丢失。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmCreateClose(false)}>继续编辑</Button>
          <Button onClick={() => { setConfirmCreateClose(false); setCreateOpen(false); setForm({ salesOrderId: '', customerId: '', warehouseId: '', logisticsProviderId: '', carrier: '', transportCost: '', notes: '' }); setCreateFormOriginal(null); }} color="error" variant="contained">放弃更改</Button>
        </DialogActions>
      </Dialog>

      {/* ===== 安排物流关闭确认弹窗 ===== */}
      <Dialog open={confirmLogisticsClose} onClose={() => setConfirmLogisticsClose(false)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 600 }}>未保存的更改</DialogTitle>
        <DialogContent>
          <Typography>您有尚未保存的更改，确定要关闭吗？关闭后所有更改将丢失。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmLogisticsClose(false)}>继续编辑</Button>
          <Button onClick={() => { setConfirmLogisticsClose(false); setLogisticsOpen(false); setLogisticsFormOriginal(null); }} color="error" variant="contained">放弃更改</Button>
        </DialogActions>
      </Dialog>

      {/* ===== 打印模板选择 ===== */}
      <PrintDialog
        open={printOpen}
        moduleTypes={['logistics_shipping', 'quality_inspection', 'quality_certificate']}
        data={getPrintData()}
        onClose={() => { setPrintOpen(false); setPrintRow(null); }}
      />
      </>)}
    </Box>
  );
}
