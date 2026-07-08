import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, InputAdornment, CircularProgress,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton,
  MenuItem, Stepper, Step, StepLabel, List, ListItem, ListItemText, Divider, Alert,
} from '@mui/material';
import { Search, Add, Visibility, ChevronRight, ContentCopy } from '@mui/icons-material';
import api from './api';

const STATUS_LABELS = { DRAFT: '草稿', CONFIRMED: '已确认', SHIPPING: '发货中', DELIVERED: '已送达', CLOSED: '已关闭', CANCELLED: '已取消' };
const STATUS_COLORS = { DRAFT: 'default', CONFIRMED: 'info', SHIPPING: 'warning', DELIVERED: 'success', CLOSED: 'default', CANCELLED: 'error' };
const FLOW_STEPS = ['DRAFT', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CLOSED'];

export default function SalesOrders() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [detail, setDetail] = useState(null);
  const [createDialog, setCreateDialog] = useState({ open: false });
  const [customers, setCustomers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [form, setForm] = useState({ customerId: '', warehouseId: '', items: [] });
  const [stockMap, setStockMap] = useState({}); // { [materialId]: { qty, unit, warehouseName } }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: 1, pageSize: 50 });
      if (keyword) params.set('keyword', keyword);
      if (status) params.set('status', status);
      const res = await api.get(`/sales/orders?${params}`);
      setList(res.data?.list || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [keyword, status]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadOptions = async () => {
    try {
      const [c, w, m] = await Promise.all([
        api.get('/master/customers?page=1&pageSize=999'),
        api.get('/master/warehouses'),
        api.get('/master/materials?page=1&pageSize=999'),
      ]);
      setCustomers(c.data?.list || []);
      setWarehouses(w.data || []);
      setMaterials(m.data?.list || []);
    } catch (e) { console.error(e); }
  };

  const handleViewDetail = async (id) => {
    try {
      const res = await api.get(`/sales/orders/${id}`);
      setDetail(res.data);
    } catch (e) { alert(e.message); }
  };

  const handleStatusChange = async (id, newStatus) => {
    if (!confirm(`确认将订单状态变更为「${STATUS_LABELS[newStatus]}」？`)) return;
    try {
      await api.put(`/sales/orders/${id}/status`, { status: newStatus });
      alert('状态更新成功');
      setDetail(null);
      loadData();
    } catch (e) { alert(e.message); }
  };

  const handleOpenCreate = async () => {
    await loadOptions();
    setForm({ customerId: '', warehouseId: '', items: [{ materialId: '', qty: 1, unitPrice: 0 }] });
    setCreateDialog({ open: true });
  };

  const handleCopyOrder = async (order) => {
    try {
      await loadOptions();
      const res = await api.get(`/sales/orders/${order.id}`);
      const d = res.data;
      const items = (d.items || []).map((it) => ({
        materialId: it.materialId,
        qty: it.qty,
        unitPrice: Number(it.unitPrice),
      }));
      setForm({
        customerId: d.customerId,
        warehouseId: d.warehouseId,
        items: items.length ? items : [{ materialId: '', qty: 1, unitPrice: 0 }],
      });
      setDetail(null);
      setCreateDialog({ open: true, sourceOrderNo: d.orderNo });
    } catch (e) { alert('获取订单详情失败: ' + e.message); }
  };

  const handleCreate = async () => {
    if (!form.customerId || !form.warehouseId) { alert('请选择客户和仓库'); return; }
    if (!form.items.length || !form.items[0].materialId) { alert('请至少添加一条明细'); return; }
    try {
      const items = form.items.map((it) => ({
        materialId: it.materialId,
        qty: Number(it.qty),
        unitPrice: Number(it.unitPrice),
        taxRate: 13,
      }));
      await api.post('/sales/orders', { ...form, items });
      alert('销售订单创建成功');
      setCreateDialog({ open: false });
      loadData();
    } catch (e) { alert(e.message); }
  };

  const updateFormItem = (idx, field, val) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: val };
    setForm({ ...form, items });
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { materialId: '', qty: 1, unitPrice: 0 }] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const fetchStock = async (materialId, warehouseId) => {
    if (!materialId || !warehouseId) return null;
    try {
      const res = await api.get('/wms/inventory', { params: { materialId, warehouseId, pageSize: 1 } });
      const inv = res.data?.list?.[0];
      if (inv) return { qty: Number(inv.qty), lockedQty: Number(inv.lockedQty), availableQty: Number(inv.availableQty), unit: inv.material?.unit || '', warehouseName: inv.warehouse?.name || '' };
      return { qty: 0, lockedQty: 0, availableQty: 0, unit: '', warehouseName: '' };
    } catch { return null; }
  };

  const onMaterialSelect = async (idx, materialId) => {
    updateFormItem(idx, 'materialId', materialId);
    if (materialId && form.warehouseId) {
      const stock = await fetchStock(materialId, form.warehouseId);
      if (stock) setStockMap((prev) => ({ ...prev, [materialId]: stock }));
    }
  };

  const totalAmount = form.items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0);

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>销售订单</Typography>
        <Button size="small" variant="contained" startIcon={<Add />} onClick={handleOpenCreate}>新建</Button>
      </Box>

      <TextField
        fullWidth size="small" placeholder="搜索订单号"
        value={keyword} onChange={(e) => setKeyword(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
        sx={{ mb: 1 }}
      />

      <Box sx={{ display: 'flex', gap: 1, mb: 2, overflowX: 'auto' }}>
        <Chip label="全部" onClick={() => setStatus('')} color={status === '' ? 'primary' : 'default'} size="small" />
        {Object.entries(STATUS_LABELS).map(([k, v]) => (
          <Chip key={k} label={v} onClick={() => setStatus(k)} color={status === k ? 'primary' : 'default'} size="small" />
        ))}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : list.length === 0 ? (
        <Typography sx={{ textAlign: 'center', py: 4 }} color="textSecondary">暂无数据</Typography>
      ) : (
        list.map((order) => (
          <Card key={order.id} sx={{ mb: 1.5, cursor: 'pointer' }} onClick={() => handleViewDetail(order.id)}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{order.orderNo}</Typography>
                  <Typography variant="body2" color="textSecondary">{order.customer?.name}</Typography>
                  <Box sx={{ mt: 0.5, display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography variant="h6" color="primary.main" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                      ¥{Number(order.grandTotal).toLocaleString()}
                    </Typography>
                    <Chip label={STATUS_LABELS[order.status]} color={STATUS_COLORS[order.status]} size="small" />
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    {order._count?.items || 0} 项 | {order.orderDate?.slice(0, 10)}
                  </Typography>
                </Box>
                <ChevronRight color="action" />
              </Box>
            </CardContent>
          </Card>
        ))
      )}

      {/* 详情弹窗 */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} fullWidth maxWidth="sm">
        {detail && (
          <>
            <DialogTitle>{detail.orderNo}</DialogTitle>
            <DialogContent>
              <Stepper activeStep={FLOW_STEPS.indexOf(detail.status)} sx={{ mb: 2 }} alternativeLabel>
                {FLOW_STEPS.map((s) => <Step key={s}><StepLabel>{STATUS_LABELS[s]}</StepLabel></Step>)}
              </Stepper>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">客户</Typography>
                <Typography variant="body1">{detail.customer?.name}</Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>仓库</Typography>
                <Typography variant="body1">{detail.warehouse?.name}</Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>订单日期</Typography>
                <Typography variant="body1">{detail.orderDate?.slice(0, 10)}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>订单明细</Typography>
              {detail.items?.map((it) => (
                <Box key={it.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                  <Box>
                    <Typography variant="body2">{it.material?.name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {it.qty} {it.material?.unit} × ¥{Number(it.unitPrice).toFixed(2)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>¥{Number(it.lineTotal).toFixed(2)}</Typography>
                </Box>
              ))}
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2">合计</Typography>
                <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 700 }}>
                  ¥{Number(detail.grandTotal).toLocaleString()}
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              {detail.status === 'DRAFT' && <Button onClick={() => handleStatusChange(detail.id, 'CONFIRMED')} color="primary">确认订单</Button>}
              {detail.status === 'CONFIRMED' && <Button onClick={() => handleStatusChange(detail.id, 'SHIPPING')} color="warning">开始发货</Button>}
              {detail.status === 'SHIPPING' && <Button onClick={() => handleStatusChange(detail.id, 'DELIVERED')} color="success">确认送达</Button>}
              {(detail.status === 'DRAFT' || detail.status === 'CONFIRMED') && <Button onClick={() => handleStatusChange(detail.id, 'CANCELLED')} color="error">取消</Button>}
              <Button onClick={() => handleCopyOrder(detail)} startIcon={<ContentCopy />} color="primary" variant="outlined">再来一单</Button>
              <Button onClick={() => setDetail(null)}>关闭</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* 新建订单弹窗 */}
      <Dialog open={createDialog.open} onClose={() => setCreateDialog({ open: false })} fullWidth maxWidth="sm">
        <DialogTitle>新建销售订单</DialogTitle>
        <DialogContent>
          {createDialog.sourceOrderNo && (
            <Alert severity="info" sx={{ mb: 2 }}>已从订单 {createDialog.sourceOrderNo} 复制明细，请核对后提交</Alert>
          )}
          <TextField fullWidth select label="客户" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} sx={{ mt: 1, mb: 2 }} size="small">
            {customers.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
          <TextField
                fullWidth select label="仓库" value={form.warehouseId}
                onChange={async (e) => {
                  const wid = e.target.value;
                  setForm({ ...form, warehouseId: wid });
                  // 重新拉取已选物料的库存
                  const newMap = {};
                  for (const it of form.items) {
                    if (it.materialId) {
                      const s = await fetchStock(it.materialId, wid);
                      if (s) newMap[it.materialId] = s;
                    }
                  }
                  setStockMap(newMap);
                }}
                sx={{ mb: 2 }} size="small"
              >
            {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
          </TextField>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>订单明细</Typography>
          {form.items.map((it, idx) => (
            <Box key={idx} sx={{ mb: 1, p: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <TextField fullWidth select label="物料" value={it.materialId} onChange={(e) => onMaterialSelect(idx, e.target.value)} size="small" sx={{ mb: 0.5 }}>
                {materials.map((m) => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
              </TextField>
              {it.materialId && stockMap[it.materialId] && (
                <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="caption" color="textSecondary">
                    物理: {stockMap[it.materialId].qty} {stockMap[it.materialId].unit}
                  </Typography>
                  <Typography variant="caption" sx={{
                    color: stockMap[it.materialId].availableQty <= 0 ? 'error.main'
                      : stockMap[it.materialId].availableQty < (Number(it.qty) || 0) ? 'warning.main'
                      : 'success.main',
                    fontWeight: 600,
                  }}>
                    可用: {stockMap[it.materialId].availableQty} {stockMap[it.materialId].unit}
                  </Typography>
                  {stockMap[it.materialId].lockedQty > 0 && (
                    <Typography variant="caption" color="textSecondary">(锁定 {stockMap[it.materialId].lockedQty})</Typography>
                  )}
                  {stockMap[it.materialId].availableQty < (Number(it.qty) || 0) && (
                    <Typography variant="caption" color="error.main">⚠ 可用不足</Typography>
                  )}
                </Box>
              )}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField label="数量" type="number" value={it.qty} onChange={(e) => updateFormItem(idx, 'qty', e.target.value)} size="small" sx={{ flex: 1 }} />
                <TextField label="单价" type="number" value={it.unitPrice} onChange={(e) => updateFormItem(idx, 'unitPrice', e.target.value)} size="small" sx={{ flex: 1 }} />
                {form.items.length > 1 && <IconButton size="small" color="error" onClick={() => removeItem(idx)}>✕</IconButton>}
              </Box>
            </Box>
          ))}
          <Button size="small" startIcon={<Add />} onClick={addItem} sx={{ mb: 1 }}>添加明细</Button>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="subtitle2">合计: ¥{totalAmount.toLocaleString()}</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog({ open: false })}>取消</Button>
          <Button variant="contained" onClick={handleCreate}>创建</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
