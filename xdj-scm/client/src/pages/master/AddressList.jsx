import { useState, useEffect, useCallback } from 'react';
import {
  Box,   Card, CardContent, Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, Chip, Stack, TablePagination, Tooltip, MenuItem, InputAdornment, Snackbar, Alert,
} from '@mui/material';
import { Add, Edit, Delete, Search, RestartAlt, Route, MyLocation, Calculate, Map as MapIcon, ToggleOn, ToggleOff } from '@mui/icons-material';
import api from '../../lib/api';
import MapPicker from '../../components/MapPicker';

const STATUS_MAP = { ACTIVE: '启用', INACTIVE: '停用' };

export default function AddressList() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialog, setDialog] = useState({ open: false, data: null });
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcResult, setCalcResult] = useState(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapTarget, setMapTarget] = useState('origin');
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });
  // 删除引用详情弹窗
  const [refDialog, setRefDialog] = useState({ open: false, message: '', references: [] });
  const [confirmClose, setConfirmClose] = useState(false);

  // 加载列表
  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page + 1, pageSize: rowsPerPage });
      if (keyword) params.set('keyword', keyword);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/address?${params}`);
      setList(res.data.list || []);
      setTotal(res.data.total || 0);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [page, rowsPerPage, keyword, statusFilter]);

  useEffect(() => { loadList(); }, [loadList]);

  // 搜索
  const handleSearch = () => { setPage(0); loadList(); };

  // 新增/编辑弹窗
  const openDialog = (data = null) => {
    setForm(data ? { ...data } : { originName: '', originAddress: '', originLng: '', originLat: '', destName: '', destAddress: '', destLng: '', destLat: '', distance: '', remark: '' });
    setDialog({ open: true, data });
    setCalcResult(null);
  };

  const closeDialog = () => setDialog({ open: false, data: null });

  // 检查表单是否有未保存的改动
  const hasFormChanges = () => {
    if (!dialog.open) return false;
    if (dialog.data) {
      // 编辑模式：对比原始数据与当前表单
      const orig = dialog.data;
      return Object.keys(form).some((key) => {
        const origVal = String(orig[key] ?? '');
        const formVal = String(form[key] ?? '');
        return origVal !== formVal;
      });
    }
    // 新增模式：表单有任何非空值就算有改动
    return Object.values(form).some((val) => {
      if (typeof val === 'number') return val !== 0;
      return val !== '' && val != null;
    });
  };

  // 尝试关闭弹窗（有改动则弹出确认）
  const handleCloseDialog = () => {
    if (hasFormChanges()) {
      setConfirmClose(true);
    } else {
      setDialog({ open: false, data: null });
    }
  };

  // 保存
  const handleSave = async () => {
    if (!form.originName || !form.originAddress || !form.destName || !form.destAddress) return;
    try {
      if (dialog.data) {
        await api.put(`/address/${dialog.data.id}`, form);
      } else {
        await api.post('/address', form);
      }
      closeDialog();
      loadList();
    } catch (err) { alert(err.response?.data?.message || '保存失败'); }
  };

  // 删除
  const handleDelete = async (id) => {
    if (!confirm('确定删除这条地址记录吗？')) return;
    try {
      await api.delete(`/address/${id}`);
      loadList();
      setSnack({ open: true, msg: '删除成功', sev: 'success' });
    } catch (err) {
      if (err.status === 400 && err.data?.references) {
        setRefDialog({ open: true, message: err.data.message || '该地址已被业务单据引用，无法删除', references: err.data.references });
      } else {
        setSnack({ open: true, msg: err.message || '删除失败', sev: 'error' });
      }
    }
  };

  // 切换启用/停用状态
  const handleToggleStatus = async (row) => {
    const newStatus = row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.put(`/address/${row.id}`, { status: newStatus });
      setSnack({ open: true, msg: newStatus === 'ACTIVE' ? '已启用' : '已停用', sev: 'success' });
      loadList();
    } catch (err) { setSnack({ open: true, msg: err.message || '操作失败', sev: 'error' }); }
  };

  // ============================================================
  // 高德地图：计算驾车距离
  // 优先使用已有坐标（地图选点获得），无坐标时通过地址文本地理编码获取
  // ============================================================
  const handleCalcDistance = async () => {
    if (!form.originAddress || !form.destAddress) return;
    setCalcLoading(true);
    setCalcResult(null);
    try {
      let data;
      if (form.originLng && form.originLat && form.destLng && form.destLat) {
        console.log('Calling /address/distance with:', { originLng: form.originLng, originLat: form.originLat, destLng: form.destLng, destLat: form.destLat });
        const res = await api.get('/address/distance', {
          params: {
            originLng: form.originLng,
            originLat: form.originLat,
            destLng: form.destLng,
            destLat: form.destLat,
          },
        });
        console.log('Response from /address/distance:', res);
        if (res.success) {
          data = {
            success: true,
            data: {
              origin: { lng: form.originLng, lat: form.originLat, formattedAddress: form.originAddress },
              dest: { lng: form.destLng, lat: form.destLat, formattedAddress: form.destAddress },
              distance: res.data.distance,
              unit: res.data.unit,
            },
          };
        } else {
          console.log('Response failed:', res);
          data = { success: false, message: res.message || '距离计算失败' };
        }
      } else {
        console.log('No coordinates, using calc-distance');
        const res = await api.get('/address/calc-distance', {
          params: { origin: form.originAddress, dest: form.destAddress },
        });
        console.log('Response from calc-distance:', res);
        data = res;
      }

      console.log('Final data:', data);
      if (data.success) {
        setCalcResult(data.data);
        setForm(prev => ({
          ...prev,
          originLng: data.data.origin.lng,
          originLat: data.data.origin.lat,
          destLng: data.data.dest.lng,
          destLat: data.data.dest.lat,
          distance: data.data.distance !== null ? String(data.data.distance) : '',
        }));
      } else {
        alert('计算失败: ' + (data.message || '无详细信息'));
      }
    } catch (err) {
      console.error('Catch error:', err);
      alert('距离计算请求失败: ' + (err.message || '未知错误'));
    } finally { setCalcLoading(false); }
  };

  // 打开地图选点
  const openMapPicker = (target) => {
    setMapTarget(target);
    setMapOpen(true);
  };

  // 地图选点确认回调
  const handleMapConfirm = (data) => {
    const prefix = mapTarget === 'origin' ? 'origin' : 'dest';
    setForm(prev => ({
      ...prev,
      [`${prefix}Address`]: data.address,
      [`${prefix}Name`]: prev[`${prefix}Name`] || data.name,
      [`${prefix}Lng`]: data.lng,
      [`${prefix}Lat`]: data.lat,
    }));
  };

  // ============================================================
  // 清除过滤
  // ============================================================
  const clearFilters = () => {
    setKeyword('');
    setStatusFilter('');
    setPage(0);
  };

  return (
    <Box>
      {/* 统计卡片 */}
      <Stack direction="row" spacing={2} mb={2}>
        <Card sx={{ flex: 1 }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" color="text.secondary">总地址数</Typography>
            <Typography variant="h5" fontWeight={700}>{total}</Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* 工具栏 */}
      <Stack direction="row" spacing={1} mb={2} alignItems="center" flexWrap="wrap" useFlexGap>
        <TextField size="small" placeholder="搜索地址名称..." value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          InputProps={{ startAdornment: <Search sx={{ mr: 0.5, color: 'text.disabled' }} fontSize="small" /> }}
          sx={{ minWidth: 200 }} />
        <TextField select size="small" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
          sx={{ minWidth: 100 }}>
          <MenuItem value="">全部状态</MenuItem>
          <MenuItem value="ACTIVE">启用</MenuItem>
          <MenuItem value="INACTIVE">停用</MenuItem>
        </TextField>
        <Button size="small" variant="contained" onClick={handleSearch} startIcon={<Search />}>搜索</Button>
        <Button size="small" variant="outlined" onClick={clearFilters} startIcon={<RestartAlt />}>清除</Button>
        <Box flex={1} />
        <Button size="small" variant="contained" onClick={() => openDialog()} startIcon={<Add />}>新增地址</Button>
      </Stack>

      {/* 列表 */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>标题</TableCell>
              <TableCell>起始地</TableCell>
              <TableCell>起始地址</TableCell>
              <TableCell>目的地</TableCell>
              <TableCell>目的地址</TableCell>
              <TableCell align="right">距离(km)</TableCell>
              <TableCell align="center">状态</TableCell>
              <TableCell>备注</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} align="center">加载中...</TableCell></TableRow>
            ) : list.length === 0 ? (
              <TableRow><TableCell colSpan={9} align="center">暂无数据</TableCell></TableRow>
            ) : list.map(row => (
              <TableRow key={row.id} hover>
                <TableCell>{row.title || `${row.originName}至${row.destName}`}</TableCell>
                <TableCell><Typography fontWeight={600}>{row.originName}</Typography></TableCell>
                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.originAddress}</TableCell>
                <TableCell><Typography fontWeight={600}>{row.destName}</Typography></TableCell>
                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.destAddress}</TableCell>
                <TableCell align="right">
                  {row.distance != null ? <Chip label={`${Number(row.distance)} km`} color="primary" size="small" /> : '-'}
                </TableCell>
                <TableCell align="center">
                  <Chip label={STATUS_MAP[row.status] || row.status} size="small" color={row.status === 'ACTIVE' ? 'success' : 'default'} />
                </TableCell>
                <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.remark || '-'}</TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={0.5} justifyContent="center">
                    <Button size="small" variant="contained"
                      color={row.status === 'ACTIVE' ? 'warning' : 'success'}
                      onClick={() => handleToggleStatus(row)}
                      sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>
                      {row.status === 'ACTIVE' ? '停用' : '启用'}
                    </Button>
                    <Button size="small" variant="contained" color="primary"
                      onClick={() => openDialog(row)}
                      sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>
                      编辑
                    </Button>
                    <Button size="small" variant="contained" color="error"
                      onClick={() => handleDelete(row.id)}
                      sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>
                      删除
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination component="div" count={total} page={page} onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage} onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        labelRowsPerPage="每页" rowsPerPageOptions={[20, 50, 100]} />

      {/* 新增/编辑弹窗 */}
      <Dialog open={dialog.open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog.data ? '编辑地址' : '新增地址'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {/* 标题预览 */}
            <TextField label="标题" fullWidth size="small"
              value={`${form.originName || '?'}至${form.destName || '?'}`}
              InputProps={{ readOnly: true, sx: { bgcolor: 'action.hover', fontWeight: 600 } }}
              helperText="自动生成，由起始地名称和目的地名称拼接" />
            {/* 起始地 */}
            <Typography variant="subtitle2" color="primary" gutterBottom>
              <MyLocation fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />起始地
            </Typography>
            <TextField label="起始地名称" fullWidth size="small" required
              value={form.originName} onChange={e => setForm({ ...form, originName: e.target.value })}
              placeholder="如：七河生物工厂" />
            <TextField label="起始地详细地址" fullWidth size="small" required
              value={form.originAddress} onChange={e => setForm({ ...form, originAddress: e.target.value })}
              placeholder="如：山东省淄博市淄川区XX路XX号"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="在地图上选择">
                      <IconButton size="small" onClick={() => openMapPicker('origin')} edge="end">
                        <MapIcon fontSize="small" color="primary" />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }} />
            <Stack direction="row" spacing={1}>
              <TextField label="经度" size="small" sx={{ flex: 1 }} InputProps={{ readOnly: true }}
                value={form.originLng} placeholder="自动获取" />
              <TextField label="纬度" size="small" sx={{ flex: 1 }} InputProps={{ readOnly: true }}
                value={form.originLat} placeholder="自动获取" />
            </Stack>

            {/* 目的地 */}
            <Typography variant="subtitle2" color="secondary" gutterBottom sx={{ mt: 1 }}>
              <Route fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />目的地
            </Typography>
            <TextField label="目的地名称" fullWidth size="small" required
              value={form.destName} onChange={e => setForm({ ...form, destName: e.target.value })}
              placeholder="如：上海餐饮连锁" />
            <TextField label="目的地详细地址" fullWidth size="small" required
              value={form.destAddress} onChange={e => setForm({ ...form, destAddress: e.target.value })}
              placeholder="如：上海市浦东新区XX路XX号"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="在地图上选择">
                      <IconButton size="small" onClick={() => openMapPicker('dest')} edge="end">
                        <MapIcon fontSize="small" color="secondary" />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }} />
            <Stack direction="row" spacing={1}>
              <TextField label="经度" size="small" sx={{ flex: 1 }} InputProps={{ readOnly: true }}
                value={form.destLng} placeholder="自动获取" />
              <TextField label="纬度" size="small" sx={{ flex: 1 }} InputProps={{ readOnly: true }}
                value={form.destLat} placeholder="自动获取" />
            </Stack>

            {/* 距离计算按钮 */}
            <Button variant="outlined" color="primary" fullWidth
              disabled={!form.originAddress || !form.destAddress || calcLoading}
              onClick={handleCalcDistance}
              startIcon={<Calculate />}>
              {calcLoading ? '计算中…' : '高德地图计算驾车距离'}
            </Button>

            {/* 计算结果 */}
            {calcResult && (
              <Card variant="outlined" sx={{ bgcolor: 'success.light', p: 1.5 }}>
                <Stack spacing={0.5}>
                  <Typography variant="body2">
                    📍 起始地: {calcResult.origin.formattedAddress}
                  </Typography>
                  <Typography variant="body2">
                    📍 目的地: {calcResult.dest.formattedAddress}
                  </Typography>
                  <Typography variant="h6" color="success.dark" fontWeight={700}>
                    🚗 驾车距离: {calcResult.distance !== null ? `${calcResult.distance} 公里` : '计算失败'}
                  </Typography>
                </Stack>
              </Card>
            )}

            {/* 手动输入距离 + 备注 */}
            <TextField label="路程距离（公里）" size="small"
              value={form.distance} onChange={e => setForm({ ...form, distance: e.target.value })}
              placeholder="自动计算或手动输入" type="number" inputProps={{ step: 0.1, min: 0 }} />
            <TextField label="备注" size="small" fullWidth multiline rows={2}
              value={form.remark || ''} onChange={e => setForm({ ...form, remark: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button variant="contained" onClick={handleSave}
            disabled={!form.originName || !form.originAddress || !form.destName || !form.destAddress}>
            保存
          </Button>
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
            onClick={() => { setConfirmClose(false); setDialog({ open: false, data: null }); }}
            color="error"
            variant="contained"
          >
            放弃更改
          </Button>
        </DialogActions>
      </Dialog>

      {/* 高德地图选点 */}
      <MapPicker
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        onConfirm={handleMapConfirm}
        title={mapTarget === 'origin' ? '选择起始地位置' : '选择目的地位置'}
      />

      {/* Snackbar 通知 */}
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} onClose={() => setSnack({ ...snack, open: false })} variant="filled">
          {snack.msg}
        </Alert>
      </Snackbar>

      {/* 删除引用详情弹窗 */}
      <Dialog open={refDialog.open} onClose={() => setRefDialog({ open: false, message: '', references: [] })} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 600 }}>无法删除 — {refDialog.message}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            以下业务单据引用了该地址，请对照处理后重试：
          </Typography>
          {refDialog.references.map((ref, idx) => (
            <Box key={idx} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, color: 'primary.main' }}>
                {ref.type}（共 {ref.count} 条引用{ref.more > 0 ? `，以下展示前 ${ref.items.length} 条` : ''}）
              </Typography>
              <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, fontSize: '0.8rem' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>单据编号</TableCell>
                    {ref.items[0]?.title !== undefined && <TableCell sx={{ fontWeight: 600 }}>路线/标题</TableCell>}
                    <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ref.items.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell>{item.code || '-'}</TableCell>
                      {item.title !== undefined && <TableCell>{item.title || '-'}</TableCell>}
                      <TableCell>{item.status || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {ref.more > 0 && <Typography variant="caption" color="text.secondary">还有 {ref.more} 条未展示</Typography>}
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefDialog({ open: false, message: '', references: [] })}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
