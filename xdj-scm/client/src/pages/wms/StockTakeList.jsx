import { useState, useEffect, Fragment } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid, MenuItem, InputAdornment,
  TablePagination, Chip, Tooltip, Alert, Stepper, Step, StepLabel, CircularProgress,
} from '@mui/material';
import { Add, Search, Visibility, Delete, Send, CheckCircle, AssignmentTurnedIn, KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import api from '../../lib/api';

const STATUS_MAP = {
  DRAFT: { label: '草稿', color: 'default' },
  COUNTING: { label: '盘点中', color: 'warning' },
  COMPLETED: { label: '已完成', color: 'success' },
  CANCELLED: { label: '已取消', color: 'error' },
};

const STEPS = ['草稿', '盘点中', '已完成'];

export default function StockTakeList() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [dialog, setDialog] = useState({ open: false });
  const [detailDialog, setDetailDialog] = useState({ open: false, data: null });
  const [countDialog, setCountDialog] = useState({ open: false, data: null });
  const [form, setForm] = useState({});
  const [warehouses, setWarehouses] = useState([]);
  const [countItems, setCountItems] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [detailCache, setDetailCache] = useState({});
  const [loadingDetailId, setLoadingDetailId] = useState(null);

  // 翻页时重置展开状态
  useEffect(() => { setExpandedId(null); }, [page]);

  const loadList = async () => {
    try {
      const res = await api.get(`/wms/stock-takes?page=${page + 1}&pageSize=${rowsPerPage}&keyword=${keyword}&status=${status}`);
      setList(res.data.list || []);
      setTotal(res.data.total || 0);
    } catch (err) { console.error(err); }
  };

  // 行展开：懒加载盘点明细
  const handleRowExpand = async (row) => {
    const isOpen = expandedId === row.id;
    if (isOpen) { setExpandedId(null); return; }
    setExpandedId(row.id);
    if (detailCache[row.id]) return; // 已缓存
    setLoadingDetailId(row.id);
    try {
      const res = await api.get(`/wms/stock-takes/${row.id}`);
      setDetailCache(prev => ({ ...prev, [row.id]: res.data }));
    } catch (err) { console.error(err); }
    finally { setLoadingDetailId(null); }
  };

  useEffect(() => {
    api.get('/master/warehouses').then((res) => setWarehouses(res.data || [])).catch(console.error);
  }, []);

  useEffect(() => { loadList(); }, [page, rowsPerPage, keyword, status]);

  const handleSearch = () => { setPage(0); };

  const handleOpen = () => {
    setForm({ warehouseId: '', takeType: 'FULL', planDate: new Date().toISOString().slice(0, 10), remark: '' });
    setDialog({ open: true });
  };

  const handleCreate = async () => {
    try {
      await api.post('/wms/stock-takes', form);
      setDialog({ open: false });
      loadList();
    } catch (err) { alert(err.message); }
  };

  const handleViewDetail = async (id) => {
    try {
      const res = await api.get(`/wms/stock-takes/${id}`);
      setDetailDialog({ open: true, data: res.data });
    } catch (err) { alert(err.message); }
  };

  const handleSubmit = async (id) => {
    if (!confirm('提交后进入盘点中状态，确认提交？')) return;
    try { await api.put(`/wms/stock-takes/${id}/submit`); loadList(); } catch (err) { alert(err.message); }
  };

  const handleCount = async (id) => {
    try {
      const res = await api.get(`/wms/stock-takes/${id}`);
      setCountItems(res.data.items?.map((it) => ({ ...it })) || []);
      setCountDialog({ open: true, data: res.data });
    } catch (err) { alert(err.message); }
  };

  const handleSaveCount = async () => {
    try {
      await api.put(`/wms/stock-takes/${countDialog.data.id}/count`, { items: countItems });
      setCountDialog({ open: false, data: null });
      loadList();
    } catch (err) { alert(err.message); }
  };

  const handleComplete = async (id) => {
    if (!confirm('完成后将自动调整库存差异，确认完成盘点？')) return;
    try { await api.put(`/wms/stock-takes/${id}/complete`); loadList(); } catch (err) { alert(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除该盘点单？')) return;
    try { await api.delete(`/wms/stock-takes/${id}`); loadList(); } catch (err) { alert(err.message); }
  };

  const updateCountItem = (idx, field, val) => {
    const items = [...countItems];
    items[idx] = { ...items[idx], [field]: val };
    if (field === 'actualQty') {
      items[idx].diffQty = (Number(val) || 0) - (items[idx].bookQty || 0);
    }
    setCountItems(items);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">盘点管理</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpen}>新增盘点</Button>
      </Box>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={4}>
              <TextField fullWidth size="small" label="搜索（编号）" value={keyword} onChange={(e) => setKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={handleSearch}><Search /></IconButton></InputAdornment> }} />
            </Grid>
            <Grid item xs={3}>
              <TextField select fullWidth size="small" label="状态" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
                <MenuItem value="">全部</MenuItem>
                {Object.entries(STATUS_MAP).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
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
              <TableCell>盘点编号</TableCell><TableCell>仓库</TableCell><TableCell>类型</TableCell>
              <TableCell>计划日期</TableCell><TableCell>完成日期</TableCell><TableCell>总项数</TableCell>
              <TableCell>差异项</TableCell><TableCell>状态</TableCell><TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((item) => {
              const isOpen = expandedId === item.id;
              return (
                <Fragment key={item.id}>
                  {/* === 主行 === */}
                  <TableRow
                    hover
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => handleRowExpand(item)}
                  >
                    <TableCell padding="checkbox" sx={{ width: 36 }}>
                      <IconButton size="small" sx={{ p: 0.5 }}>
                        {isOpen ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ fontWeight: isOpen ? 'bold' : 'normal' }}>{item.takeNo}</TableCell>
                    <TableCell>{item.warehouse?.name}</TableCell>
                    <TableCell>{item.takeType === 'FULL' ? '全盘' : '部分盘'}</TableCell>
                    <TableCell>{item.planDate?.slice(0, 10) || '-'}</TableCell>
                    <TableCell>{item.completedDate?.slice(0, 10) || '-'}</TableCell>
                    <TableCell>{item.totalItems}</TableCell>
                    <TableCell>{item.diffItems > 0 ? <Chip size="small" label={item.diffItems} color="error" /> : item.diffItems}</TableCell>
                    <TableCell><Chip size="small" label={STATUS_MAP[item.status]?.label || item.status} color={STATUS_MAP[item.status]?.color || 'default'} /></TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0.5}>
                        <Button size="small" variant="contained" color="primary" onClick={() => handleViewDetail(item.id)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>查看</Button>
                        {item.status === 'DRAFT' && <Button size="small" variant="contained" color="info" onClick={() => handleSubmit(item.id)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>提交</Button>}
                        {item.status === 'COUNTING' && <Button size="small" variant="contained" color="primary" onClick={() => handleCount(item.id)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>录入</Button>}
                        {item.status === 'COUNTING' && <Button size="small" variant="contained" color="success" onClick={() => handleComplete(item.id)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>完成</Button>}
                        {item.status === 'DRAFT' && <Button size="small" variant="contained" color="error" onClick={() => handleDelete(item.id)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>删除</Button>}
                      </Stack>
                    </TableCell>
                  </TableRow>

                  {/* === 展开明细行 === */}
                  {isOpen && (
                    <TableRow>
                      <TableCell colSpan={10} sx={{ py: 0, bgcolor: 'grey.50' }}>
                        <Box sx={{ p: 2 }}>
                          {loadingDetailId === item.id ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                              <CircularProgress size={24} /><Typography sx={{ ml: 1 }} color="text.secondary">加载明细...</Typography>
                            </Box>
                          ) : detailCache[item.id]?.items?.length > 0 ? (
                            <>
                              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}>
                                盘点明细 · <Chip size="small" label={item.takeNo} variant="outlined" sx={{ ml: 0.5 }} />
                              </Typography>
                              <Table size="small" sx={{ mt: 0.5, mb: 1 }}>
                                <TableHead>
                                  <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', bgcolor: 'grey.100', fontSize: '0.75rem' } }}>
                                    <TableCell>物料编码</TableCell><TableCell>物料名称</TableCell><TableCell>单位</TableCell>
                                    <TableCell>库位</TableCell><TableCell>批次</TableCell>
                                    <TableCell align="right">账面数量</TableCell><TableCell align="right">实际数量</TableCell>
                                    <TableCell align="right">差异</TableCell><TableCell>差异原因</TableCell><TableCell>状态</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {detailCache[item.id].items.map((it) => (
                                    <TableRow key={it.id}>
                                      <TableCell>{it.material?.code}</TableCell>
                                      <TableCell>{it.material?.name}</TableCell>
                                      <TableCell>{it.material?.unit}</TableCell>
                                      <TableCell>{it.location?.code || '-'}</TableCell>
                                      <TableCell>{it.batch?.batchNo || '-'}</TableCell>
                                      <TableCell align="right">{it.bookQty}</TableCell>
                                      <TableCell align="right">{it.actualQty}</TableCell>
                                      <TableCell align="right">
                                        <Chip size="small" label={it.diffQty > 0 ? `+${it.diffQty}` : it.diffQty} color={it.diffQty !== 0 ? 'error' : 'default'} />
                                      </TableCell>
                                      <TableCell>{it.diffReason || '-'}</TableCell>
                                      <TableCell>{it.status === 'PENDING' ? '待盘' : it.status === 'COUNTED' ? '已盘' : it.status === 'ADJUSTED' ? '已调整' : it.status}</TableCell>
                                    </TableRow>
                                  ))}
                                  {/* 合计行 */}
                                  <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', borderTop: '2px solid', borderColor: 'divider' } }}>
                                    <TableCell colSpan={5}>合计</TableCell>
                                    <TableCell align="right">{detailCache[item.id].items.reduce((s, it) => s + (it.bookQty || 0), 0)}</TableCell>
                                    <TableCell align="right">{detailCache[item.id].items.reduce((s, it) => s + (it.actualQty || 0), 0)}</TableCell>
                                    <TableCell align="right">
                                      <Chip size="small" label={(() => {
                                        const totalDiff = detailCache[item.id].items.reduce((s, it) => s + (it.diffQty || 0), 0);
                                        return totalDiff > 0 ? `+${totalDiff}` : totalDiff;
                                      })()} color={(() => {
                                        const totalDiff = detailCache[item.id].items.reduce((s, it) => s + (it.diffQty || 0), 0);
                                        return totalDiff !== 0 ? 'error' : 'default';
                                      })()} />
                                    </TableCell>
                                    <TableCell colSpan={2} />
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </>
                          ) : detailCache[item.id] ? (
                            <Typography color="text.secondary" sx={{ py: 1.5, textAlign: 'center' }}>暂无盘点明细</Typography>
                          ) : (
                            <Typography color="error" sx={{ py: 1.5, textAlign: 'center' }}>加载失败，请重试</Typography>
                          )}
                        </Box>
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

      {/* 新增盘点弹窗 */}
      <Dialog open={dialog.open} onClose={() => setDialog({ open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>新增盘点单</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>创建后将自动加载仓库当前库存作为账面数量</Alert>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField select fullWidth size="small" label="盘点仓库" value={form.warehouseId || ''} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
                <MenuItem value="">选择</MenuItem>
                {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField select fullWidth size="small" label="盘点类型" value={form.takeType || 'FULL'} onChange={(e) => setForm({ ...form, takeType: e.target.value })}>
                <MenuItem value="FULL">全盘</MenuItem><MenuItem value="PARTIAL">部分盘</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}><TextField fullWidth size="small" type="date" label="计划日期" InputLabelProps={{ shrink: true }} value={form.planDate || ''} onChange={(e) => setForm({ ...form, planDate: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="备注" value={form.remark || ''} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false })}>取消</Button>
          <Button variant="contained" onClick={handleCreate}>创建</Button>
        </DialogActions>
      </Dialog>

      {/* 详情弹窗 */}
      <Dialog open={detailDialog.open} onClose={() => setDetailDialog({ open: false, data: null })} maxWidth="lg" fullWidth>
        <DialogTitle>盘点详情 - {detailDialog.data?.takeNo}</DialogTitle>
        <DialogContent>
          {detailDialog.data && (
            <>
              <Stepper activeStep={STEPS.indexOf(STATUS_MAP[detailDialog.data.status]?.label || '草稿')} sx={{ mb: 2 }}>
                {STEPS.map((s) => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
              </Stepper>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={4}><Typography><strong>仓库：</strong>{detailDialog.data.warehouse?.name}</Typography></Grid>
                <Grid item xs={4}><Typography><strong>总项数：</strong>{detailDialog.data.totalItems}</Typography></Grid>
                <Grid item xs={4}><Typography><strong>差异项：</strong>{detailDialog.data.diffItems}</Typography></Grid>
              </Grid>
              <Table size="small">
                <TableHead><TableRow>
                  <TableCell>物料编码</TableCell><TableCell>物料名称</TableCell><TableCell>库位</TableCell>
                  <TableCell>账面数量</TableCell><TableCell>实际数量</TableCell><TableCell>差异</TableCell>
                  <TableCell>差异原因</TableCell><TableCell>状态</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {detailDialog.data.items?.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>{it.material?.code}</TableCell><TableCell>{it.material?.name}</TableCell>
                      <TableCell>{it.location?.code || '-'}</TableCell>
                      <TableCell>{it.bookQty}</TableCell><TableCell>{it.actualQty}</TableCell>
                      <TableCell><Chip size="small" label={it.diffQty > 0 ? `+${it.diffQty}` : it.diffQty} color={it.diffQty !== 0 ? 'error' : 'default'} /></TableCell>
                      <TableCell>{it.diffReason || '-'}</TableCell><TableCell>{it.status === 'PENDING' ? '待盘' : it.status === 'COUNTED' ? '已盘' : it.status === 'ADJUSTED' ? '已调整' : it.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setDetailDialog({ open: false, data: null })}>关闭</Button></DialogActions>
      </Dialog>

      {/* 盘点录入弹窗 */}
      <Dialog open={countDialog.open} onClose={() => setCountDialog({ open: false, data: null })} maxWidth="lg" fullWidth>
        <DialogTitle>盘点录入 - {countDialog.data?.takeNo}</DialogTitle>
        <DialogContent>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>物料</TableCell><TableCell>库位</TableCell><TableCell>账面数量</TableCell>
              <TableCell>实际数量</TableCell><TableCell>差异</TableCell><TableCell>差异原因</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {countItems.map((it, idx) => (
                <TableRow key={it.id}>
                  <TableCell>{it.material?.name}</TableCell>
                  <TableCell>{it.location?.code || '-'}</TableCell>
                  <TableCell>{it.bookQty}</TableCell>
                  <TableCell><TextField size="small" type="number" value={it.actualQty ?? 0} onChange={(e) => updateCountItem(idx, 'actualQty', e.target.value)} sx={{ width: 100 }} /></TableCell>
                  <TableCell><Chip size="small" label={it.diffQty > 0 ? `+${it.diffQty}` : it.diffQty} color={it.diffQty !== 0 ? 'error' : 'default'} /></TableCell>
                  <TableCell><TextField size="small" value={it.diffReason || ''} onChange={(e) => updateCountItem(idx, 'diffReason', e.target.value)} sx={{ width: 200 }} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCountDialog({ open: false, data: null })}>取消</Button>
          <Button variant="contained" onClick={handleSaveCount}>保存录入</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
