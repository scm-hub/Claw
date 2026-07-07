import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, Grid, MenuItem,
  TablePagination, InputAdornment, Snackbar, Alert, Card, CardContent, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import {
  Add, Search, RestartAlt, LocalShipping, AcUnit,
} from '@mui/icons-material';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

const CATEGORY_MAP = {
  NORMAL: { label: '普通货车', color: 'primary', icon: <LocalShipping /> },
  REFRIGERATED: { label: '冷藏车', color: 'info', icon: <AcUnit /> },
  OTHER: { label: '其他', color: 'default', icon: <LocalShipping /> },
};

export default function VehicleTypeList() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN';

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });

  const [dialog, setDialog] = useState({ open: false, mode: 'create', data: {} });
  const [dialogOriginal, setDialogOriginal] = useState({});
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: '', name: '', refs: [] });

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: page + 1, pageSize,
        ...(statusFilter && { status: statusFilter }),
        ...(keyword && { keyword }),
        ...(categoryFilter && { category: categoryFilter }),
      };
      const res = await api.get('/master/vehicle-types', { params });
      setList(res.data?.list || []);
      setTotal(res.data?.total || 0);
    } catch (e) {
      setSnack({ open: true, msg: '加载失败：' + (e.response?.data?.message || e.message), sev: 'error' });
    } finally { setLoading(false); }
  }, [page, pageSize, keyword, categoryFilter, statusFilter]);

  useEffect(() => { loadList(); }, [loadList]);

  const handleOpen = (item) => {
    if (item) {
      setDialog({ open: true, mode: 'edit', data: { ...item } });
      setDialogOriginal({ ...item });
    } else {
      setDialog({ open: true, mode: 'create', data: { code: '', name: '', category: 'NORMAL', boxLength: '', boxWidth: '', boxHeight: '', loadVolume: '', loadWeight: '' } });
      setDialogOriginal({});
    }
  };

  const handleClose = () => {
    if (dialog.mode === 'edit') {
      const keys = ['name', 'category', 'boxLength', 'boxWidth', 'boxHeight', 'loadVolume', 'loadWeight'];
      const changed = keys.some(k => String(dialog.data[k] ?? '') !== String(dialogOriginal[k] ?? ''));
      if (changed && !window.confirm('有未保存的更改，确定关闭？')) return;
    }
    setDialog({ open: false, mode: 'create', data: {} });
  };

  const handleSave = async () => {
    const d = dialog.data;
    if (!d.code || !d.name) { setSnack({ open: true, msg: '编码和名称必填', sev: 'warning' }); return; }

    try {
      const payload = {
        name: d.name,
        category: d.category || 'NORMAL',
        boxLength: d.boxLength ? Number(d.boxLength) : null,
        boxWidth: d.boxWidth ? Number(d.boxWidth) : null,
        boxHeight: d.boxHeight ? Number(d.boxHeight) : null,
        loadVolume: d.loadVolume ? Number(d.loadVolume) : null,
        loadWeight: d.loadWeight ? Number(d.loadWeight) : null,
      };
      if (dialog.mode === 'create') {
        payload.code = d.code;
        await api.post('/master/vehicle-types', payload);
      } else {
        await api.put(`/master/vehicle-types/${d.id}`, payload);
      }
      setSnack({ open: true, msg: '保存成功', sev: 'success' });
      setDialog({ open: false, mode: 'create', data: {} });
      loadList();
    } catch (e) {
      setSnack({ open: true, msg: e.response?.data?.message || '保存失败', sev: 'error' });
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/master/vehicle-types/${id}`);
      setDeleteDialog({ open: false, id: '', name: '', refs: [] });
      setSnack({ open: true, msg: '删除成功', sev: 'success' });
      loadList();
    } catch (e) {
      if (e.response?.status === 400 && e.response?.data?.references) {
        setDeleteDialog({ open: true, id, name: e.response?.data?.references?.[0]?.type || '', refs: e.response.data.references });
      } else {
        setSnack({ open: true, msg: e.response?.data?.message || '删除失败', sev: 'error' });
      }
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      await api.put(`/master/vehicle-types/${item.id}`, { status: item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
      setSnack({ open: true, msg: '状态更新成功', sev: 'success' });
      loadList();
    } catch (e) { setSnack({ open: true, msg: e.response?.data?.message || '操作失败', sev: 'error' }); }
  };

  const handleBatchImport = async () => {
    try {
      const res = await api.post('/master/vehicle-types/batch', { items: VEHICLE_TYPE_DATA });
      setSnack({ open: true, msg: res.message || '导入成功', sev: 'success' });
      loadList();
    } catch (e) { setSnack({ open: true, msg: e.response?.data?.message || '导入失败', sev: 'error' }); }
  };

  const stats = {
    total: list.length,
    normal: list.filter(l => l.category === 'NORMAL').length,
    refrigerated: list.filter(l => l.category === 'REFRIGERATED').length,
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>车型管理</Typography>

      {/* 统计卡片 */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Card sx={{ flex: 1, bgcolor: 'primary.50' }}><CardContent sx={{ p: '12px !important', textAlign: 'center' }}>
          <Typography variant="h6" color="primary.main">{stats.total}</Typography><Typography variant="caption">车型总数</Typography>
        </CardContent></Card>
        <Card sx={{ flex: 1, bgcolor: 'info.50' }}><CardContent sx={{ p: '12px !important', textAlign: 'center' }}>
          <Typography variant="h6" color="info.main">{stats.refrigerated}</Typography><Typography variant="caption">冷藏车</Typography>
        </CardContent></Card>
        <Card sx={{ flex: 1, bgcolor: 'success.50' }}><CardContent sx={{ p: '12px !important', textAlign: 'center' }}>
          <Typography variant="h6" color="success.main">{stats.normal}</Typography><Typography variant="caption">普通货车</Typography>
        </CardContent></Card>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap">
        <TextField size="small" placeholder="搜索编码/名称" value={keyword} onChange={e => setKeyword(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} sx={{ width: 220 }} />
        <ToggleButtonGroup size="small" value={statusFilter} exclusive onChange={(_, v) => setStatusFilter(v || '')}>
          <ToggleButton value="">全部状态</ToggleButton>
          <ToggleButton value="ACTIVE">启用</ToggleButton>
          <ToggleButton value="INACTIVE">停用</ToggleButton>
        </ToggleButtonGroup>
        <ToggleButtonGroup size="small" value={categoryFilter} exclusive onChange={(_, v) => setCategoryFilter(v || '')}>
          <ToggleButton value="">全部</ToggleButton>
          <ToggleButton value="NORMAL">普通货车</ToggleButton>
          <ToggleButton value="REFRIGERATED">冷藏车</ToggleButton>
        </ToggleButtonGroup>
        <Button variant="outlined" startIcon={<RestartAlt />} onClick={() => { setKeyword(''); setCategoryFilter(''); setStatusFilter(''); setPage(0); }}>重置</Button>
        <Box sx={{ flex: 1 }} />
        {isAdmin && <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>新增车型</Button>}
        {isAdmin && list.length === 0 && <Button variant="outlined" color="secondary" onClick={handleBatchImport}>一键导入默认车型</Button>}
      </Stack>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell sx={{ fontWeight: 600 }}>编码</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>名称</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>分类</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>车厢尺寸(米)</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>载方(m³)</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>载重(吨)</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map(row => {
                const cat = CATEGORY_MAP[row.category] || CATEGORY_MAP.OTHER;
                return (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.code}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell><Chip size="small" color={cat.color} label={cat.label} icon={cat.icon} /></TableCell>
                    <TableCell>{[row.boxLength, row.boxWidth, row.boxHeight].filter(Boolean).join('×') || '-'}</TableCell>
                    <TableCell>{row.loadVolume ?? '-'}</TableCell>
                    <TableCell>{row.loadWeight ?? '-'}</TableCell>
                    <TableCell><Chip size="small" color={row.status === 'ACTIVE' ? 'success' : 'default'} label={row.status === 'ACTIVE' ? '启用' : '停用'} /></TableCell>
                    <TableCell align="center" onClick={e => e.stopPropagation()}>
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        {isAdmin && (
                          <Button size="small" variant="contained"
                            color={row.status === 'ACTIVE' ? 'warning' : 'success'}
                            onClick={() => handleToggleStatus(row)}
                            sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>
                            {row.status === 'ACTIVE' ? '停用' : '启用'}
                          </Button>
                        )}
                        {isAdmin && (
                          <Button size="small" variant="contained" color="primary"
                            onClick={() => handleOpen(row)}
                            sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>
                            编辑
                          </Button>
                        )}
                        {isAdmin && (
                          <Button size="small" variant="contained" color="error"
                            onClick={() => handleDelete(row.id)}
                            sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>
                            删除
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
              {list.length === 0 && !loading && (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>暂无数据</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
          rowsPerPageOptions={[20, 50, 100]}
        />
      </Paper>

      {/* 新增/编辑弹窗 */}
      <Dialog open={dialog.open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog.mode === 'create' ? '新增车型' : '编辑车型'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="编码" required value={dialog.data.code || ''}
                onChange={e => setDialog({ ...dialog, data: { ...dialog.data, code: e.target.value } })}
                disabled={dialog.mode === 'edit'} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="名称" required value={dialog.data.name || ''}
                onChange={e => setDialog({ ...dialog, data: { ...dialog.data, name: e.target.value } })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" select label="分类" value={dialog.data.category || 'NORMAL'}
                onChange={e => setDialog({ ...dialog, data: { ...dialog.data, category: e.target.value } })}>
                <MenuItem value="NORMAL">普通货车</MenuItem>
                <MenuItem value="REFRIGERATED">冷藏车</MenuItem>
                <MenuItem value="OTHER">其他</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={2}>
              <TextField fullWidth size="small" label="长(米)" type="number" value={dialog.data.boxLength || ''}
                onChange={e => setDialog({ ...dialog, data: { ...dialog.data, boxLength: e.target.value } })} />
            </Grid>
            <Grid item xs={2}>
              <TextField fullWidth size="small" label="宽(米)" type="number" value={dialog.data.boxWidth || ''}
                onChange={e => setDialog({ ...dialog, data: { ...dialog.data, boxWidth: e.target.value } })} />
            </Grid>
            <Grid item xs={2}>
              <TextField fullWidth size="small" label="高(米)" type="number" value={dialog.data.boxHeight || ''}
                onChange={e => setDialog({ ...dialog, data: { ...dialog.data, boxHeight: e.target.value } })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="载方(m³)" type="number" value={dialog.data.loadVolume || ''}
                onChange={e => setDialog({ ...dialog, data: { ...dialog.data, loadVolume: e.target.value } })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="载重(吨)" type="number" value={dialog.data.loadWeight || ''}
                onChange={e => setDialog({ ...dialog, data: { ...dialog.data, loadWeight: e.target.value } })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>取消</Button>
          <Button variant="contained" onClick={handleSave}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* 删除引用提示 */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: '', name: '', refs: [] })} maxWidth="sm" fullWidth>
        <DialogTitle>无法删除</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>该车型已被以下业务单据引用，无法删除：</Alert>
          {deleteDialog.refs.map((ref, i) => (
            <Box key={i} sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{ref.type}（共{ref.count}条）</Typography>
              {ref.items.map((item, j) => (
                <Typography key={j} variant="body2" color="text.secondary">· {item.code} {item.status ? `(${item.status})` : ''}</Typography>
              ))}
              {ref.more > 0 && <Typography variant="caption" color="text.secondary">还有 {ref.more} 条未显示...</Typography>}
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: '', name: '', refs: [] })}>关闭</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}>
        <Alert severity={snack.sev} onClose={() => setSnack({ ...snack, open: false })}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}

// 从截图导入的默认车型数据
const VEHICLE_TYPE_DATA = [
  // === 普通货车 ===
  { code: 'VAN_MICRO', name: '微面', category: 'NORMAL', boxLength: 1.4, boxWidth: 1.4, boxHeight: 1.0, loadVolume: 1.7, loadWeight: 0.3 },
  { code: 'VAN_SMALL', name: '小面', category: 'NORMAL', boxLength: 2.0, boxWidth: 1.4, boxHeight: 1.0, loadVolume: 2.5, loadWeight: 0.5 },
  { code: 'VAN_MEDIUM', name: '中面', category: 'NORMAL', boxLength: 2.4, boxWidth: 1.3, boxHeight: 1.2, loadVolume: 3.5, loadWeight: 0.8 },
  { code: 'VAN_LARGE', name: '大面', category: 'NORMAL', boxLength: 3.1, boxWidth: 1.5, boxHeight: 1.5, loadVolume: 6.2, loadWeight: 1.0 },
  { code: 'TRUCK_MICRO', name: '微货', category: 'NORMAL', boxLength: 1.8, boxWidth: 1.4, boxHeight: 1.0, loadVolume: 3.8, loadWeight: 0.5 },
  { code: 'TRUCK_SMALL', name: '小货', category: 'NORMAL', boxLength: 2.5, boxWidth: 1.6, boxHeight: 1.8, loadVolume: 7.2, loadWeight: 1.0 },
  { code: 'TRUCK_MEDIUM', name: '中货', category: 'NORMAL', boxLength: 3.8, boxWidth: 1.8, boxHeight: 1.8, loadVolume: 12.5, loadWeight: 1.5 },
  { code: 'TRUCK_3M8', name: '3.8米车', category: 'NORMAL', boxLength: 3.8, boxWidth: 1.8, boxHeight: 1.8, loadVolume: 12.5, loadWeight: 2.5 },
  { code: 'TRUCK_4M2', name: '4.2米车', category: 'NORMAL', boxLength: 4.2, boxWidth: 1.8, boxHeight: 1.8, loadVolume: 14.0, loadWeight: 3.5 },
  { code: 'TRUCK_5M', name: '5米车', category: 'NORMAL', boxLength: 5.0, boxWidth: 1.8, boxHeight: 2.0, loadVolume: 17.0, loadWeight: 5.0 },
  { code: 'TRUCK_6M', name: '6米车', category: 'NORMAL', boxLength: 5.8, boxWidth: 1.8, boxHeight: 2.0, loadVolume: 20.0, loadWeight: 6.0 },
  { code: 'TRUCK_6M8', name: '6.8米车', category: 'NORMAL', boxLength: 6.8, boxWidth: 2.2, boxHeight: 2.6, loadVolume: 25.5, loadWeight: 6.0 },
  { code: 'TRUCK_7M', name: '7米车', category: 'NORMAL', boxLength: 7.0, boxWidth: 2.2, boxHeight: 2.6, loadVolume: 30.0, loadWeight: 6.0 },
  { code: 'TRUCK_7M6', name: '7.6米车', category: 'NORMAL', boxLength: 7.6, boxWidth: 2.2, boxHeight: 2.5, loadVolume: 35.0, loadWeight: 6.0 },
  { code: 'TRUCK_8M', name: '8米车', category: 'NORMAL', boxLength: 8.0, boxWidth: 2.2, boxHeight: 2.5, loadVolume: 40.0, loadWeight: 6.0 },
  { code: 'TRUCK_8M6', name: '8.6米车', category: 'NORMAL', boxLength: 8.6, boxWidth: 2.2, boxHeight: 2.5, loadVolume: 45.0, loadWeight: 6.0 },
  { code: 'TRUCK_9M', name: '9米车', category: 'NORMAL', boxLength: 9.0, boxWidth: 2.2, boxHeight: 2.6, loadVolume: 48.0, loadWeight: 8.0 },
  { code: 'TRUCK_9M6', name: '9.6米车', category: 'NORMAL', boxLength: 9.6, boxWidth: 2.2, boxHeight: 2.6, loadVolume: 55.0, loadWeight: 10.0 },
  { code: 'TRUCK_11M', name: '11米车', category: 'NORMAL', boxLength: 11.0, boxWidth: 2.2, boxHeight: 2.5, loadVolume: 57.0, loadWeight: 10.0 },
  { code: 'TRUCK_12M', name: '12米车', category: 'NORMAL', boxLength: 12.0, boxWidth: 2.2, boxHeight: 2.5, loadVolume: 63.0, loadWeight: 10.0 },
  { code: 'TRUCK_13M', name: '13米车', category: 'NORMAL', boxLength: 13.0, boxWidth: 2.2, boxHeight: 2.5, loadVolume: 70.0, loadWeight: 18.0 },
  { code: 'TRUCK_13M7', name: '13.7米车', category: 'NORMAL', boxLength: 13.7, boxWidth: 2.2, boxHeight: 2.5, loadVolume: 75.0, loadWeight: 20.0 },
  { code: 'TRUCK_15M', name: '15米车', category: 'NORMAL', boxLength: 15.0, boxWidth: 2.2, boxHeight: 2.5, loadVolume: 80.0, loadWeight: 20.0 },
  { code: 'TRUCK_16M', name: '16米车', category: 'NORMAL', boxLength: 16.0, boxWidth: 2.2, boxHeight: 2.5, loadVolume: 85.0, loadWeight: 25.0 },
  { code: 'TRUCK_17M5', name: '17.5米车', category: 'NORMAL', boxLength: 17.5, boxWidth: 2.2, boxHeight: 2.5, loadVolume: 90.0, loadWeight: 25.0 },
  // === 冷藏车 ===
  { code: 'REF_4M2', name: '冷藏车4米2', category: 'REFRIGERATED', boxLength: 3.8, boxWidth: 1.8, boxHeight: 1.8, loadVolume: 12.3, loadWeight: 1.5 },
  { code: 'REF_5M2', name: '冷藏车5米2', category: 'REFRIGERATED', boxLength: 5.0, boxWidth: 1.8, boxHeight: 2.0, loadVolume: 18.0, loadWeight: 2.0 },
  { code: 'REF_6M8', name: '冷藏车6米8', category: 'REFRIGERATED', boxLength: 6.4, boxWidth: 2.2, boxHeight: 2.5, loadVolume: 35.2, loadWeight: 6.0 },
  { code: 'REF_7M6', name: '冷藏车7米6', category: 'REFRIGERATED', boxLength: 7.4, boxWidth: 2.2, boxHeight: 2.5, loadVolume: 40.7, loadWeight: 8.0 },
  { code: 'REF_9M6', name: '冷藏车9米6', category: 'REFRIGERATED', boxLength: 9.0, boxWidth: 2.2, boxHeight: 2.5, loadVolume: 49.5, loadWeight: 10.0 },
  { code: 'REF_13M', name: '冷藏车13米', category: 'REFRIGERATED', boxLength: 12.5, boxWidth: 2.3, boxHeight: 2.5, loadVolume: 71.9, loadWeight: 18.0 },
  { code: 'REF_17M5', name: '冷藏车17米5', category: 'REFRIGERATED', boxLength: 16.0, boxWidth: 2.3, boxHeight: 2.5, loadVolume: 92.0, loadWeight: 25.0 },
];
