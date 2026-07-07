import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, MenuItem, InputAdornment, TablePagination,
  Chip, Stack, FormControl, InputLabel, Select, Fade, Tooltip, Switch,
} from '@mui/material';
import {
  Add, Edit, Delete, Search, RestartAlt, FilterList, Warehouse, CheckCircle,
  Block, ToggleOn, ToggleOff, AcUnit,
} from '@mui/icons-material';
import api from '../../lib/api';

const STATUS_MAP = { ACTIVE: '启用', INACTIVE: '停用' };

export default function WarehouseList() {
  const [list, setList] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [coldFilter, setColdFilter] = useState('');
  const [dialog, setDialog] = useState({ open: false, data: null });
  const [form, setForm] = useState({});
  const [refDialog, setRefDialog] = useState({ open: false, message: '', references: [] });
  const [confirmClose, setConfirmClose] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, cold: 0 });
  const [loading, setLoading] = useState(false);
  const [warehouseUsers, setWarehouseUsers] = useState([]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/master/warehouses');
      const data = res.data || [];
      setList(data);
      setStats({
        total: data.length,
        active: data.filter(w => w.status === 'ACTIVE').length,
        inactive: data.filter(w => w.status === 'INACTIVE').length,
        cold: data.filter(w => w.isColdStorage).length,
      });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  // 加载仓管员候选用户（Portal WMS 权限用户）
  const loadWarehouseUsers = useCallback(async () => {
    try {
      const res = await api.get('/master/warehouse-users');
      setWarehouseUsers(res.data || []);
    } catch (err) { console.error('加载仓管员用户失败', err); }
  }, []);

  useEffect(() => { loadList(); loadWarehouseUsers(); }, [loadList, loadWarehouseUsers]);

  // 前端筛选
  useEffect(() => {
    let result = [...list];
    if (keyword) {
      const kw = keyword.toLowerCase();
      result = result.filter(w =>
        (w.name || '').toLowerCase().includes(kw) ||
        (w.code || '').toLowerCase().includes(kw) ||
        (w.address || '').toLowerCase().includes(kw)
      );
    }
    if (statusFilter) result = result.filter(w => w.status === statusFilter);
    if (coldFilter) result = result.filter(w => coldFilter === 'cold' ? w.isColdStorage : !w.isColdStorage);
    setFiltered(result);
  }, [list, keyword, statusFilter, coldFilter]);

  const handleReset = () => {
    setKeyword('');
    setStatusFilter('');
    setColdFilter('');
  };

  const handleOpen = (data = null) => {
    setDialog({ open: true, data });
    setForm(data || { name: '', address: '', isColdStorage: false, status: 'ACTIVE' });
  };

  const handleSave = async () => {
    try {
      if (dialog.data) await api.put(`/master/warehouses/${dialog.data.id}`, form);
      else await api.post('/master/warehouses', form);
      setDialog({ open: false, data: null }); loadList();
    } catch (err) { alert(err.data?.message || err.message); }
  };

  // 检查表单是否有未保存的改动
  const hasFormChanges = () => {
    if (!dialog.open) return false;
    if (dialog.data) {
      const orig = dialog.data;
      return Object.keys(form).some((key) => {
        const origVal = String(orig[key] ?? '');
        const formVal = String(form[key] ?? '');
        return origVal !== formVal;
      });
    }
    return Object.values(form).some((val) => {
      if (typeof val === 'number') return val !== 0;
      if (typeof val === 'boolean') return val === true;
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

  const handleDelete = async (id) => {
    if (!confirm('确定删除该仓库？')) return;
    try {
      await api.delete(`/master/warehouses/${id}`);
      loadList();
    } catch (err) {
      if (err.status === 400 && err.data?.references) {
        setRefDialog({
          open: true,
          message: err.data.message || '该仓库已被业务单据引用，无法删除',
          references: err.data.references,
        });
      } else {
        alert(err.message || '删除失败');
      }
    }
  };

  const handleToggleStatus = async (item) => {
    const newStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.put(`/master/warehouses/${item.id}`, { status: newStatus });
      loadList();
    } catch (err) { alert(err.message); }
  };

  const hasFilters = keyword || statusFilter || coldFilter;

  return (
    <Box>
      {/* 标题栏 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>仓库管理</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()} size="small">新增仓库</Button>
      </Box>

      {/* 统计概览 */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.100' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '12px !important' }}>
              <Warehouse color="primary" sx={{ fontSize: 36 }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>{stats.total}</Typography>
                <Typography variant="caption" color="text.secondary">仓库总数</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: 'success.50', border: '1px solid', borderColor: 'success.100' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '12px !important' }}>
              <CheckCircle color="success" sx={{ fontSize: 36 }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>{stats.active}</Typography>
                <Typography variant="caption" color="text.secondary">启用仓库</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: 'error.50', border: '1px solid', borderColor: 'error.100' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '12px !important' }}>
              <Block color="error" sx={{ fontSize: 36 }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main' }}>{stats.inactive}</Typography>
                <Typography variant="caption" color="text.secondary">停用仓库</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ bgcolor: 'info.50', border: '1px solid', borderColor: 'info.100' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '12px !important' }}>
              <AcUnit color="info" sx={{ fontSize: 36 }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'info.main' }}>{stats.cold}</Typography>
                <Typography variant="caption" color="text.secondary">冷库数量</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 查询条件 */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: '16px !important' }}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              size="small"
              label="搜索（名称/编码/地址）"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              sx={{ minWidth: 280 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small"><Search /></IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>状态</InputLabel>
              <Select
                label="状态"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="ACTIVE">启用</MenuItem>
                <MenuItem value="INACTIVE">停用</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>类型</InputLabel>
              <Select
                label="类型"
                value={coldFilter}
                onChange={(e) => setColdFilter(e.target.value)}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="cold">冷库</MenuItem>
                <MenuItem value="normal">常温</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RestartAlt />}
              onClick={handleReset}
              disabled={!hasFilters}
            >
              重置
            </Button>
            <Box sx={{ flex: 1 }} />
            <Chip
              icon={<FilterList />}
              label={hasFilters ? `已筛选 ${filtered.length} 条` : `共 ${list.length} 条`}
              size="small"
              color={hasFilters ? 'primary' : 'default'}
              variant={hasFilters ? 'filled' : 'outlined'}
            />
          </Stack>

          {/* 已选筛选标签 */}
          {hasFilters && (
            <Fade in={hasFilters}>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} alignItems="center">
                <Typography variant="caption" color="text.secondary">当前筛选：</Typography>
                {keyword && (
                  <Chip label={`关键词: ${keyword}`} size="small" onDelete={() => setKeyword('')} color="primary" variant="outlined" />
                )}
                {statusFilter && (
                  <Chip label={`状态: ${STATUS_MAP[statusFilter]}`} size="small" onDelete={() => setStatusFilter('')} color="primary" variant="outlined" />
                )}
                {coldFilter && (
                  <Chip label={`类型: ${coldFilter === 'cold' ? '冷库' : '常温'}`} size="small" onDelete={() => setColdFilter('')} color="primary" variant="outlined" />
                )}
              </Stack>
            </Fade>
          )}
        </CardContent>
      </Card>

      {/* 数据表格 */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 600 }}>编码</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>名称</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>地址</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>仓管员</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">类型</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">库区数</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">库存品种</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">状态</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} align="center" sx={{ py: 3, color: 'text.secondary' }}>加载中...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} align="center" sx={{ py: 3, color: 'text.secondary' }}>暂无数据</TableCell></TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{item.code}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                  <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.address || '-'}
                  </TableCell>
                  <TableCell>{item.warehouseManager?.employee?.name || '-'}</TableCell>
                  <TableCell align="center">
                    <Chip
                      icon={<AcUnit sx={{ fontSize: 14 }} />}
                      label={item.isColdStorage ? '冷库' : '常温'}
                      size="small"
                      color={item.isColdStorage ? 'info' : 'default'}
                      variant={item.isColdStorage ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell align="center">{item.zones?.length || 0}</TableCell>
                  <TableCell align="center">{item._count?.inventory || 0}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={STATUS_MAP[item.status] || item.status}
                      size="small"
                      color={item.status === 'ACTIVE' ? 'success' : 'default'}
                      variant={item.status === 'ACTIVE' ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                      <Button size="small" variant="contained"
                        color={item.status === 'ACTIVE' ? 'warning' : 'success'}
                        onClick={() => handleToggleStatus(item)}
                        sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>
                        {item.status === 'ACTIVE' ? '停用' : '启用'}
                      </Button>
                      <Button size="small" variant="contained" color="primary"
                        onClick={() => handleOpen(item)}
                        sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>
                        编辑
                      </Button>
                      <Button size="small" variant="contained" color="error"
                        onClick={() => handleDelete(item.id)}
                        sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>
                        删除
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 新增/编辑弹窗 */}
      <Dialog open={dialog.open} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{dialog.data ? '编辑仓库' : '新增仓库'}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: '0.75rem' }}>
            仓管员是拥有仓储模块权限的用户
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="仓库编码" value={form.code || '保存后自动生成'} disabled />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="仓库名称 *" value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="地址" value={form.address || ''}
                onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>仓管员</InputLabel>
                <Select
                  label="仓管员"
                  value={form.warehouseManagerId || ''}
                  onChange={(e) => setForm({ ...form, warehouseManagerId: e.target.value })}
                >
                  <MenuItem value="">未指定</MenuItem>
                  {warehouseUsers.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.employee?.name || u.username} {u.employee?.empNo ? `(${u.employee.empNo})` : ''} {u.employee?.department ? ` - ${u.employee.department.name}` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <Switch checked={!!form.isColdStorage} onChange={(e) => setForm({ ...form, isColdStorage: e.target.checked })} />
                <Typography variant="body2">冷库</Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <TextField select fullWidth size="small" label="状态" value={form.status || 'ACTIVE'}
                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <MenuItem value="ACTIVE">启用</MenuItem>
                <MenuItem value="INACTIVE">停用</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button variant="contained" onClick={handleSave}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* ===== 删除引用详情弹窗 ===== */}
      <Dialog open={refDialog.open} onClose={() => setRefDialog({ open: false, message: '', references: [] })} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 600 }}>
          无法删除 — {refDialog.message}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            以下业务单据引用了该仓库，请对照处理后重试：
          </Typography>
          {refDialog.references.map((ref) => (
            <Box key={ref.type} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, color: 'primary.main' }}>
                {ref.type}（共 {ref.count} 条引用{ref.more > 0 ? `，以下展示前 ${ref.items.length} 条` : ''}）
              </Typography>
              {ref.items.length > 0 ? (
                <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, fontSize: '0.8rem' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>单据编号</TableCell>
                      {ref.items[0].title !== undefined && <TableCell sx={{ fontWeight: 600 }}>标题/详情</TableCell>}
                      <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ref.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.code}</TableCell>
                        {item.title !== undefined && <TableCell>{item.title || '-'}</TableCell>}
                        <TableCell>{STATUS_MAP[item.status] || item.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2">{ref.count} 条引用记录</Typography>
              )}
              {ref.more > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  还有 {ref.more} 条未展示
                </Typography>
              )}
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefDialog({ open: false, message: '', references: [] })}>关闭</Button>
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
    </Box>
  );
}
