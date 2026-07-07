import { useState, useEffect, Fragment } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid, MenuItem, InputAdornment,
  TablePagination, Chip, Divider,
} from '@mui/material';
import { Search, SwapVert, Add, KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import api from '../../lib/api';

const TYPE_MAP = {
  PURCHASE_RECEIPT: '采购入库', MANUAL_IN: '手动入库', MANUAL_OUT: '手动出库',
  STOCK_TAKE_ADJUST: '盘点调整', SALES_OUT: '销售出库', SALES_OUTBOUND: '发货出库', TRANSFER: '调拨',
};

export default function StockMovementList() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [keyword, setKeyword] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [direction, setDirection] = useState('');
  const [movementType, setMovementType] = useState('');
  const [dialog, setDialog] = useState({ open: false });
  const [form, setForm] = useState({});
  const [warehouses, setWarehouses] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [batches, setBatches] = useState([]);
  const [grades, setGrades] = useState([]);
  const [locations, setLocations] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  // 翻页时重置展开状态
  useEffect(() => { setExpandedId(null); }, [page]);

  const loadList = async () => {
    try {
      const res = await api.get(`/wms/movements?page=${page + 1}&pageSize=${rowsPerPage}&keyword=${keyword}&warehouseId=${warehouseId}&direction=${direction}&movementType=${movementType}`);
      setList(res.data.list || []);
      setTotal(res.data.total || 0);
    } catch (err) { console.error(err); }
  };

  const loadOptions = async () => {
    try {
      const [wRes, mRes] = await Promise.all([
        api.get('/master/warehouses'),
        api.get('/master/materials?page=1&pageSize=999'),
      ]);
      setWarehouses(wRes.data || []);
      setMaterials(mRes.data.list || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { loadList(); }, [page, rowsPerPage, keyword, warehouseId, direction, movementType]);
  useEffect(() => { loadOptions(); }, []);

  const handleSearch = () => { setPage(0); };

  const handleOpen = () => {
    setForm({ warehouseId: '', locationId: '', materialId: '', batchId: '', movementType: 'MANUAL_IN', direction: 'IN', qty: '', remark: '' });
    setDialog({ open: true });
  };

  const loadWarehouseData = async (whId) => {
    setForm({ ...form, warehouseId: whId });
    if (!whId) { setLocations([]); setBatches([]); return; }
    try {
      const wh = warehouses.find((w) => w.id === whId);
      const allLocs = [];
      if (wh?.zones?.length) {
        for (const z of wh.zones) {
          const res = await api.get(`/master/zones/${z.id}/locations`);
          allLocs.push(...(res.data || []));
        }
      }
      setLocations(allLocs);
      const bRes = await api.get(`/traceability/batches?page=1&pageSize=999&status=ACTIVE`);
      setBatches(bRes.data.list || []);
    } catch (err) { console.error(err); }
  };

  const handleSave = async () => {
    try {
      await api.post('/wms/movements', { ...form, qty: form.qty === '' || form.qty === undefined ? 0 : Number(form.qty), gradeId: form.gradeId || undefined });
      setDialog({ open: false });
      loadList();
    } catch (err) { alert(err.message); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">出入库记录</Typography>
        <Button variant="contained" startIcon={<SwapVert />} onClick={handleOpen}>手动出入库</Button>
      </Box>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={3}>
              <TextField fullWidth size="small" label="搜索（编号）" value={keyword} onChange={(e) => setKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={handleSearch}><Search /></IconButton></InputAdornment> }} />
            </Grid>
            <Grid item xs={2}>
              <TextField select fullWidth size="small" label="仓库" value={warehouseId} onChange={(e) => { setWarehouseId(e.target.value); setPage(0); }}>
                <MenuItem value="">全部</MenuItem>
                {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={2}>
              <TextField select fullWidth size="small" label="方向" value={direction} onChange={(e) => { setDirection(e.target.value); setPage(0); }}>
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="IN">入库</MenuItem><MenuItem value="OUT">出库</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={2}>
              <TextField select fullWidth size="small" label="类型" value={movementType} onChange={(e) => { setMovementType(e.target.value); setPage(0); }}>
                <MenuItem value="">全部</MenuItem>
                {Object.entries(TYPE_MAP).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={{ width: 36 }} />
              <TableCell>编号</TableCell><TableCell>出入库日期</TableCell><TableCell>类型</TableCell>
              <TableCell>方向</TableCell><TableCell>仓库</TableCell><TableCell>库位</TableCell>
              <TableCell>物料</TableCell><TableCell>批次</TableCell><TableCell>等级</TableCell>
              <TableCell align="right">数量</TableCell><TableCell>单位</TableCell><TableCell>采购单价</TableCell><TableCell>采购金额</TableCell><TableCell>操作人</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((item) => {
              const isOpen = expandedId === item.id;
              // 关联单据映射
              const refTypeMap = { PURCHASE_RECEIPT: '采购收货', SHIPPING_ORDER: '发货单', SALES_OUTBOUND: '销售出库', STOCK_TAKE: '盘点', MANUAL: '手动' };
              // 单位根据上游单据类型决定：发货/销售出库用销售单位，采购入库用采购单位，其他用基准单位
              // 数量也需从基准单位反算为原始单据单位
              const isSalesSource = item.refType === 'SHIPPING_ORDER' || item.refType === 'SALES_OUTBOUND';
              const isPurchaseSource = item.refType === 'PURCHASE_RECEIPT';
              const salesConv = Number(item.material?.salesConversionFactor || 1);
              const purchaseConv = Number(item.material?.purchaseConversionFactor || 1);
              let displayQty, displayUnit;
              if (isSalesSource) {
                displayQty = Number(item.qty) / salesConv;
                displayUnit = item.material?.salesUnit || item.material?.unit || '-';
              } else if (isPurchaseSource) {
                displayQty = Number(item.qty) / purchaseConv;
                displayUnit = item.material?.purchaseUnit || item.material?.unit || '-';
              } else {
                displayQty = Number(item.qty);
                displayUnit = item.material?.unit || '-';
              }
              // 格式化：整数不显示小数，非整数显示到2位
              const fmtQty = displayQty === Math.floor(displayQty) ? displayQty.toFixed(0) : displayQty.toFixed(2);
              // 展开区要显示的字段（过滤掉空值）
              const detailFields = [
                { label: '物料编码', value: item.material?.code },
                { label: '物料名称', value: item.material?.name },
                { label: '规格', value: item.material?.spec || '-' },
                { label: '单位', value: displayUnit },
                { label: '仓库编码', value: item.warehouse?.code },
                { label: '库位名称', value: item.location?.name },
                { label: '批次号', value: item.batch?.batchNo },
                { label: '等级', value: item.grade?.name || null },
                { label: '关联单据', value: item.refType ? (refTypeMap[item.refType] || item.refType) : null },
                { label: '创建时间', value: item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN') : null },
                { label: '备注', value: item.remark },
              ].filter(f => f.value && f.value !== '-');
              return (
                <Fragment key={item.id}>
                  {/* === 主行 === */}
                  <TableRow
                    hover
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => setExpandedId(isOpen ? null : item.id)}
                  >
                    <TableCell padding="checkbox" sx={{ width: 36 }}>
                      <IconButton size="small" sx={{ p: 0.5 }}>
                        {isOpen ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ fontWeight: isOpen ? 'bold' : 'normal' }}>{item.movementNo}</TableCell>
                    <TableCell>{item.movementDate ? new Date(item.movementDate).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</TableCell>
                    <TableCell>{TYPE_MAP[item.movementType] || item.movementType}</TableCell>
                    <TableCell><Chip size="small" label={item.direction === 'IN' ? '入库' : '出库'} color={item.direction === 'IN' ? 'success' : 'warning'} /></TableCell>
                    <TableCell>{item.warehouse?.name}</TableCell>
                    <TableCell>{item.location?.code || '-'}</TableCell>
                    <TableCell>{item.material?.name}</TableCell>
                    <TableCell>{item.batch?.batchNo || '-'}</TableCell>
                    <TableCell>{item.grade?.name || '-'}</TableCell>
                    <TableCell align="right">{fmtQty}</TableCell>
                    <TableCell>{displayUnit}</TableCell>
                    <TableCell>{item.unitPrice != null ? `¥${Number(item.unitPrice).toFixed(2)}` : '-'}</TableCell>
                    <TableCell>{item.totalAmount != null ? `¥${Number(item.totalAmount).toLocaleString()}` : '-'}</TableCell>
                    <TableCell>{item.operator?.name || '-'}</TableCell>
                  </TableRow>

                  {/* === 展开明细行 === */}
                  {isOpen && (
                    <TableRow>
                      <TableCell colSpan={16} sx={{ py: 0, bgcolor: 'grey.50' }}>
                        <Box sx={{ px: 2, py: 1.5 }}>
                          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}>
                            详细信息 · <Chip size="small" label={item.movementNo} variant="outlined" sx={{ ml: 0.5 }} />
                          </Typography>
                          <Divider sx={{ mb: 1 }} />
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
                            {detailFields.map((f) => (
                              <Box key={f.label} sx={{ minWidth: 120 }}>
                                <Typography variant="caption" color="text.secondary">{f.label}</Typography>
                                <Typography variant="body2" sx={{ fontWeight: f.label === '关联单据' ? 600 : 400, color: f.label === '关联单据' ? 'primary.main' : 'text.primary' }}>
                                  {f.value}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
            {list.length === 0 && <TableRow><TableCell colSpan={15} align="center"><Typography color="text.secondary" sx={{ py: 3 }}>暂无数据</Typography></TableCell></TableRow>}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(e.target.value); setPage(0); }}
          rowsPerPageOptions={[20, 50, 100]}
          labelRowsPerPage="每页行数："
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count !== -1 ? count : '超过'} 条`}
        />
      </TableContainer>

      {/* 手动出入库弹窗 */}
      <Dialog open={dialog.open} onClose={() => setDialog({ open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>手动出入库</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField select fullWidth size="small" label="方向" value={form.direction || 'IN'} onChange={(e) => setForm({ ...form, direction: e.target.value, movementType: e.target.value === 'IN' ? 'MANUAL_IN' : 'MANUAL_OUT' })}>
                <MenuItem value="IN">入库</MenuItem><MenuItem value="OUT">出库</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField select fullWidth size="small" label="仓库" value={form.warehouseId || ''} onChange={(e) => loadWarehouseData(e.target.value)}>
                <MenuItem value="">选择</MenuItem>
                {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField select fullWidth size="small" label="物料" value={form.materialId || ''} onChange={async (e) => {
                const mid = e.target.value;
                setForm({ ...form, materialId: mid, gradeId: '' });
                if (mid) {
                  try {
                    const res = await api.get(`/master/materials/${mid}`);
                    setGrades(res.data?.materialGrades?.map(mg => mg.grade) || []);
                  } catch {}
                } else {
                  setGrades([]);
                }
              }}>
                <MenuItem value="">选择</MenuItem>
                {materials.map((m) => <MenuItem key={m.id} value={m.id}>{m.code} - {m.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}><TextField fullWidth size="small" type="number" label="数量" value={form.qty ?? ''} onChange={(e) => setForm({ ...form, qty: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="0" onFocus={(e) => e.target.select()} inputProps={{ min: 1 }} /></Grid>
            <Grid item xs={6}>
              <TextField select fullWidth size="small" label="批次（可选）" value={form.batchId || ''} onChange={(e) => setForm({ ...form, batchId: e.target.value })}>
                <MenuItem value="">无</MenuItem>
                {batches.map((b) => <MenuItem key={b.id} value={b.id}>{b.batchNo} - {b.material?.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField select fullWidth size="small" label="等级（可选）" value={form.gradeId || ''} onChange={(e) => setForm({ ...form, gradeId: e.target.value })}>
                <MenuItem value="">无</MenuItem>
                {grades.map((g) => <MenuItem key={g.id} value={g.id}>{g.name} ({g.code})</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField select fullWidth size="small" label="库位（可选）" value={form.locationId || ''} onChange={(e) => setForm({ ...form, locationId: e.target.value })}>
                <MenuItem value="">无</MenuItem>
                {locations.map((l) => <MenuItem key={l.id} value={l.id}>{l.code} - {l.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="备注" value={form.remark || ''} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false })}>取消</Button>
          <Button variant="contained" onClick={handleSave}>确认</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
