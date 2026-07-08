import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TablePagination, MenuItem, Grid, Alert, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import { Add, Refresh, CheckCircle, Warning, Error as ErrorIcon, Tune, SettingsSuggest } from '@mui/icons-material';
import api from '../../lib/api';

export default function StockStandardList() {
  // 列表状态
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  // 下拉数据
  const [materials, setMaterials] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [seasonConfigs, setSeasonConfigs] = useState([]);

  // 新增/编辑弹窗
  const [dialog, setDialog] = useState({ open: false, mode: 'create', data: { materialId: '', warehouseId: '', seasonConfigId: '', procurementDays: 3, maxStorageDays: 3, remoteAdjust: '' } });
  const [dialogOriginal, setDialogOriginal] = useState({});

  // 批量初始化弹窗
  const [initDialog, setInitDialog] = useState({ open: false, seasonConfigId: '' });

  // 波动系数配置面板
  const [showSeasonPanel, setShowSeasonPanel] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: page + 1, pageSize };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/master/stock-standards', { params });
      setList(res.data?.list || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      setSnack({ open: true, msg: '加载失败', sev: 'error' });
    }
    setLoading(false);
  }, [page, pageSize, statusFilter]);

  const loadDicts = async () => {
    try {
      const [mRes, wRes, sRes] = await Promise.all([
        api.get('/master/materials?page=1&pageSize=999'),
        api.get('/master/warehouses'),
        api.get('/master/season-configs'),
      ]);
      setMaterials(mRes.data?.list || []);
      setWarehouses(wRes.data || []);
      setSeasonConfigs(sRes.data || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { loadDicts(); }, []);
  useEffect(() => { loadList(); }, [loadList]);

  // 打开新增
  const handleAdd = () => {
    const init = { materialId: '', warehouseId: '', seasonConfigId: seasonConfigs[0]?.id || '', procurementDays: 3, maxStorageDays: 3, remoteAdjust: '' };
    setDialog({ open: true, mode: 'create', data: init });
    setDialogOriginal(JSON.parse(JSON.stringify(init)));
  };

  // 打开编辑
  const handleEdit = (row) => {
    const d = {
      id: row.id,
      materialId: row.materialId,
      warehouseId: row.warehouseId,
      seasonConfigId: row.seasonConfigId,
      procurementDays: row.procurementDays,
      maxStorageDays: row.maxStorageDays,
      remoteAdjust: row.remoteAdjust ?? '',
    };
    setDialog({ open: true, mode: 'edit', data: d });
    setDialogOriginal(JSON.parse(JSON.stringify(d)));
  };

  // 保存
  const handleSave = async () => {
    const d = dialog.data;
    if (!d.materialId || !d.warehouseId || !d.seasonConfigId) {
      setSnack({ open: true, msg: '物料、仓库、波动系数为必填', sev: 'error' });
      return;
    }
    try {
      if (dialog.mode === 'create') {
        await api.post('/master/stock-standards', {
          materialId: d.materialId,
          warehouseId: d.warehouseId,
          seasonConfigId: d.seasonConfigId,
          procurementDays: Number(d.procurementDays) || 3,
          maxStorageDays: Number(d.maxStorageDays) || 3,
          remoteAdjust: d.remoteAdjust ? Number(d.remoteAdjust) : null,
        });
      } else {
        await api.put(`/master/stock-standards/${d.id}`, {
          seasonConfigId: d.seasonConfigId,
          procurementDays: Number(d.procurementDays) || 3,
          maxStorageDays: Number(d.maxStorageDays) || 3,
          remoteAdjust: d.remoteAdjust ? Number(d.remoteAdjust) : null,
        });
      }
      setDialog({ ...dialog, open: false });
      setSnack({ open: true, msg: dialog.mode === 'create' ? '创建成功' : '更新成功', sev: 'success' });
      loadList();
    } catch (err) {
      setSnack({ open: true, msg: err.response?.data?.message || err.message || '保存失败', sev: 'error' });
    }
  };

  // 删除
  const handleDelete = async (id) => {
    if (!confirm('确定删除该安全库存标准吗？')) return;
    try {
      await api.delete(`/master/stock-standards/${id}`);
      setSnack({ open: true, msg: '删除成功', sev: 'success' });
      loadList();
    } catch (err) {
      setSnack({ open: true, msg: err.response?.data?.message || '删除失败', sev: 'error' });
    }
  };

  // 停用/启用
  const handleToggle = async (row) => {
    try {
      await api.put(`/master/stock-standards/${row.id}`, { status: row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
      loadList();
    } catch (err) {
      setSnack({ open: true, msg: '操作失败', sev: 'error' });
    }
  };

  // 批量初始化
  const handleBatchInit = async () => {
    if (!initDialog.seasonConfigId) {
      setSnack({ open: true, msg: '请选择波动系数', sev: 'error' });
      return;
    }
    try {
      const res = await api.post('/master/stock-standards/batch-init', { seasonConfigId: initDialog.seasonConfigId });
      setInitDialog({ open: false, seasonConfigId: '' });
      setSnack({ open: true, msg: res.data?.message || `新建${res.data?.data?.created || 0}条`, sev: 'success' });
      loadList();
    } catch (err) {
      setSnack({ open: true, msg: '初始化失败', sev: 'error' });
    }
  };

  // 波动系数更新
  const handleSeasonUpdate = async (cfg, field, value) => {
    try {
      await api.put(`/master/season-configs/${cfg.id}`, { [field]: value });
      loadDicts();
      setSnack({ open: true, msg: '更新成功', sev: 'success' });
    } catch (err) {
      setSnack({ open: true, msg: '更新失败', sev: 'error' });
    }
  };

  // 选物料时自动带出采购提前期和最大存储天数
  const handleMaterialChange = (matId) => {
    const mat = materials.find(m => m.id === matId);
    setDialog({
      ...dialog,
      data: {
        ...dialog.data,
        materialId: matId,
        procurementDays: mat?.purchaseLeadTime ?? dialog.data.procurementDays,
        maxStorageDays: Math.ceil((mat?.shelfLifeDays ?? 7) * 0.6),
      },
    });
  };

  // 选仓库时自动带出外仓系数
  const handleWarehouseChange = (whId) => {
    const wh = warehouses.find(w => w.id === whId);
    let adj = '';
    if (wh?.isRemote && wh?.transferLeadDays != null) {
      adj = wh.transferLeadDays <= 1 ? '0.8' : '1.3';
    }
    setDialog({
      ...dialog,
      data: { ...dialog.data, warehouseId: whId, remoteAdjust: adj },
    });
  };

  // 未保存提示
  const handleDialogClose = () => {
    if (JSON.stringify(dialog.data) !== JSON.stringify(dialogOriginal)) {
      if (!confirm('有未保存的修改，确定关闭吗？')) return;
    }
    setDialog({ ...dialog, open: false });
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>安全库存标准配置</Typography>

      {/* 工具栏 */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>新增标准</Button>
        <Button variant="outlined" startIcon={<SettingsSuggest />} onClick={() => setInitDialog({ open: true, seasonConfigId: seasonConfigs[0]?.id || '' })}>批量初始化</Button>
        <Button variant="outlined" startIcon={<Tune />} onClick={() => setShowSeasonPanel(!showSeasonPanel)}>波动系数</Button>
        <Box sx={{ flexGrow: 1 }} />
        <ToggleButtonGroup size="small" value={statusFilter} exclusive onChange={(_, v) => { setStatusFilter(v || ''); setPage(0); }}>
          <ToggleButton value="">全部</ToggleButton>
          <ToggleButton value="ACTIVE">启用</ToggleButton>
          <ToggleButton value="INACTIVE">停用</ToggleButton>
        </ToggleButtonGroup>
        <Button startIcon={<Refresh />} onClick={loadList}>刷新</Button>
      </Stack>

      {/* 波动系数面板 */}
      {showSeasonPanel && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>波动系数配置</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>编码</TableCell><TableCell>名称</TableCell><TableCell>系数</TableCell><TableCell>说明</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {seasonConfigs.map(cfg => (
                  <TableRow key={cfg.id}>
                    <TableCell><Chip label={cfg.code} size="small" color="primary" variant="outlined" /></TableCell>
                    <TableCell>{cfg.name}</TableCell>
                    <TableCell>
                      <TextField size="small" type="number" value={cfg.coefficient}
                        inputProps={{ step: 0.1, min: 0.5, max: 3.0 }}
                        sx={{ width: 80 }}
                        onBlur={(e) => {
                          const v = parseFloat(e.target.value);
                          if (v !== cfg.coefficient) handleSeasonUpdate(cfg, 'coefficient', v);
                        }}
                      />
                    </TableCell>
                    <TableCell>{cfg.description || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* 列表 */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>物料</TableCell><TableCell>品类</TableCell><TableCell>仓库</TableCell>
              <TableCell>波动系数</TableCell><TableCell>采购提前期(天)</TableCell><TableCell>最大库存(天)</TableCell>
              <TableCell>外仓系数</TableCell><TableCell>安全库存</TableCell><TableCell>预警库存</TableCell>
              <TableCell>最高库存</TableCell><TableCell>状态</TableCell><TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.length === 0 && (
              <TableRow><TableCell colSpan={12} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                {loading ? '加载中...' : '暂无数据，请点击「批量初始化」自动生成'}
              </TableCell></TableRow>
            )}
            {list.map(row => (
              <TableRow key={row.id}>
                <TableCell>{row.material?.name || '-'}</TableCell>
                <TableCell>
                  {row.material?.group?.stockCategory ? (
                    <Chip label={`${row.material.group.stockCategory}类`} size="small"
                      color={row.material.group.stockCategory === 'A' ? 'error' : row.material.group.stockCategory === 'B' ? 'warning' : 'default'} />
                  ) : '-'}
                </TableCell>
                <TableCell>{row.warehouse?.name || '-'}</TableCell>
                <TableCell>{row.seasonConfig?.name || '-'}（×{row.seasonConfig?.coefficient}）</TableCell>
                <TableCell>{row.procurementDays}</TableCell>
                <TableCell>{row.maxStorageDays}</TableCell>
                <TableCell>{row.remoteAdjust != null ? row.remoteAdjust : '-'}</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'error.main' }}>{row.safetyStock != null ? row.safetyStock.toFixed(2) : '-'}</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'warning.main' }}>{row.warnStock != null ? row.warnStock.toFixed(2) : '-'}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{row.maxStock != null ? row.maxStock.toFixed(2) : '-'}</TableCell>
                <TableCell>
                  <Chip label={row.status === 'ACTIVE' ? '启用' : '停用'} size="small"
                    color={row.status === 'ACTIVE' ? 'success' : 'default'} />
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    <Button size="small" variant="contained"
                      color={row.status === 'ACTIVE' ? 'warning' : 'success'}
                      onClick={() => handleToggle(row)}
                      sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: 10 }}>
                      {row.status === 'ACTIVE' ? '停用' : '启用'}
                    </Button>
                    <Button size="small" variant="contained" color="primary"
                      onClick={() => handleEdit(row)}
                      sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: 10 }}>
                      编辑
                    </Button>
                    <Button size="small" variant="contained" color="error"
                      onClick={() => handleDelete(row.id)}
                      sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: 10 }}>
                      删除
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination component={Paper} sx={{ mt: 0 }}
        count={total} page={page} onPageChange={(_, p) => setPage(p)}
        rowsPerPage={pageSize} onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
        labelRowsPerPage="每页" rowsPerPageOptions={[10, 20, 50]}
      />

      {/* ===== 新增/编辑弹窗 ===== */}
      <Dialog open={dialog.open} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog.mode === 'create' ? '新增安全库存标准' : '编辑安全库存标准'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth select label="物料 *" value={dialog.data.materialId}
                onChange={(e) => handleMaterialChange(e.target.value)}
                disabled={dialog.mode === 'edit'}>
                {materials.map(m => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.name}（{m.code}｜保质期{m.shelfLifeDays}天｜采购提前期{m.purchaseLeadTime}天）
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth select label="仓库 *" value={dialog.data.warehouseId}
                onChange={(e) => handleWarehouseChange(e.target.value)}
                disabled={dialog.mode === 'edit'}>
                {warehouses.map(w => (
                  <MenuItem key={w.id} value={w.id}>
                    {w.name}{w.isRemote ? '（异地外仓）' : '（总部仓）'}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth select label="波动系数 *" value={dialog.data.seasonConfigId}
                onChange={(e) => setDialog({ ...dialog, data: { ...dialog.data, seasonConfigId: e.target.value } })}>
                {seasonConfigs.map(s => (
                  <MenuItem key={s.id} value={s.id}>{s.name}（系数×{s.coefficient}）</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth label="采购提前期(天)" type="number"
                value={dialog.data.procurementDays}
                onChange={(e) => setDialog({ ...dialog, data: { ...dialog.data, procurementDays: Number(e.target.value) || 1 } })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth label="最大存储天数" type="number"
                value={dialog.data.maxStorageDays}
                onChange={(e) => setDialog({ ...dialog, data: { ...dialog.data, maxStorageDays: Number(e.target.value) || 1 } })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth label="外仓调整系数" type="number"
                value={dialog.data.remoteAdjust}
                onChange={(e) => setDialog({ ...dialog, data: { ...dialog.data, remoteAdjust: e.target.value } })}
                inputProps={{ step: 0.1, min: 0.5, max: 2.0 }}
                helperText="选仓库自动填入"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>取消</Button>
          <Button variant="contained" onClick={handleSave}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* ===== 批量初始化弹窗 ===== */}
      <Dialog open={initDialog.open} onClose={() => setInitDialog({ open: false, seasonConfigId: '' })} maxWidth="xs" fullWidth>
        <DialogTitle>批量初始化安全库存标准</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            将为所有启用物料 × 所有启用仓库，自动创建安全库存标准（跳过已存在的组合）
          </Typography>
          <TextField fullWidth select label="默认波动系数" value={initDialog.seasonConfigId}
            onChange={(e) => setInitDialog({ ...initDialog, seasonConfigId: e.target.value })}>
            {seasonConfigs.map(s => (
              <MenuItem key={s.id} value={s.id}>{s.name}（系数×{s.coefficient}）</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInitDialog({ open: false, seasonConfigId: '' })}>取消</Button>
          <Button variant="contained" onClick={handleBatchInit}>开始初始化</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      {snack.open && (
        <Box sx={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 2000 }}>
          <Alert severity={snack.sev} onClose={() => setSnack({ ...snack, open: false })} variant="filled">
            {snack.msg}
          </Alert>
        </Box>
      )}
    </Box>
  );
}
