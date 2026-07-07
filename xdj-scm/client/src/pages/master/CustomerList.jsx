import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, MenuItem, InputAdornment, TablePagination,
  Chip, Stack, FormControl, InputLabel, Select, Collapse, Fade, Tooltip, Autocomplete,
} from '@mui/material';
import {
  Add, Edit, Delete, Search, RestartAlt, FilterList, Business, PersonAdd,
  CheckCircle, Block, ExpandMore, ExpandLess, ToggleOn, ToggleOff, Person,
} from '@mui/icons-material';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

const STATUS_MAP = { ACTIVE: '启用', INACTIVE: '停用' };

const fmtMoney = (v) => Number(v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CustomerList() {
  const { user } = useAuthStore();
  const canAssignSalesRep = user?.role === 'SUPER_ADMIN' || user?.role === 'SALES_MANAGER';
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [salesRepFilter, setSalesRepFilter] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dialog, setDialog] = useState({ open: false, data: null });
  const [form, setForm] = useState({});
  const [confirmClose, setConfirmClose] = useState(false);
  const [refDialog, setRefDialog] = useState({ open: false, message: '', references: [] });
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page + 1, pageSize: rowsPerPage });
      if (keyword) params.set('keyword', keyword);
      if (statusFilter) params.set('status', statusFilter);
      if (salesRepFilter) params.set('salesRepId', salesRepFilter);
      const res = await api.get(`/master/customers?${params}`);
      setList(res.data.list || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, keyword, statusFilter, salesRepFilter]);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/master/customers?pageSize=9999');
      const all = res.data.list || [];
      setStats({
        total: res.data.total || all.length,
        active: all.filter(c => c.status === 'ACTIVE').length,
        inactive: all.filter(c => c.status === 'INACTIVE').length,
      });
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => {
    if (canAssignSalesRep) {
      api.get('/master/employees?page=1&pageSize=999&status=ACTIVE').then(res => {
        setEmployees(res.data?.list || res.data || []);
      }).catch(() => {});
    }
  }, [canAssignSalesRep]);

  const handleSearch = () => { setPage(0); loadList(); };

  const handleReset = () => {
    setKeyword('');
    setStatusFilter('');
    setSalesRepFilter('');
    setPage(0);
  };

  const handleOpen = (data = null) => {
    setDialog({ open: true, data });
    setForm(data || {
      name: '', contactPerson: '', contactPhone: '', address: '',
      creditLimit: '', creditPeriod: '', status: 'ACTIVE',
      salesRepId: user?.employeeId || '',
    });
  };

  // 检查表单是否有未保存的改动
  const hasFormChanges = () => {
    if (!dialog.open) return false;
    if (dialog.data) {
      const orig = dialog.data;
      return Object.keys(form).some((key) => String(orig[key] ?? '') !== String(form[key] ?? ''));
    }
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

  const handleSave = async () => {
    try {
      const payload = { ...form };
      payload.creditLimit = payload.creditLimit === '' || payload.creditLimit === undefined ? 0 : Number(payload.creditLimit);
      payload.creditPeriod = payload.creditPeriod === '' || payload.creditPeriod === undefined ? 30 : Number(payload.creditPeriod);
      // 外键未选择时传 null，避免外键约束冲突
      if (payload.salesRepId === '' || payload.salesRepId === undefined) payload.salesRepId = null;
      if (payload.departmentId === '' || payload.departmentId === undefined) payload.departmentId = null;
      // 清理前端可能混入的嵌套对象/只读字段
      ['id', 'code', 'createdAt', 'updatedAt', 'salesRep', 'department', 'addresses', 'priceLists', 'salesOrders', 'salesPlanItems', 'accountsReceivable', 'shippingOrders', 'waybills', 'afterSales', 'batchTrackings'].forEach((k) => delete payload[k]);
      if (dialog.data) await api.put(`/master/customers/${dialog.data.id}`, payload);
      else await api.post('/master/customers', payload);
      setDialog({ open: false, data: null });
      loadList();
      loadStats();
    } catch (err) { alert(err.data?.message || err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除该客户？')) return;
    try {
      await api.delete(`/master/customers/${id}`);
      loadList();
      loadStats();
    } catch (err) {
      if (err.status === 400 && err.data?.references) {
        setRefDialog({
          open: true,
          message: err.data.message || '该客户已被业务单据引用，无法删除',
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
      await api.put(`/master/customers/${item.id}`, { status: newStatus });
      loadList();
      loadStats();
    } catch (err) { alert(err.message); }
  };

  const hasFilters = keyword || statusFilter || salesRepFilter;

  return (
    <Box>
      {/* 标题栏 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>客户管理</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()} size="small">新增客户</Button>
      </Box>

      {/* 统计概览 */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.100' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '12px !important' }}>
              <Business color="primary" sx={{ fontSize: 36 }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>{stats.total}</Typography>
                <Typography variant="caption" color="text.secondary">客户总数</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'success.50', border: '1px solid', borderColor: 'success.100' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '12px !important' }}>
              <CheckCircle color="success" sx={{ fontSize: 36 }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>{stats.active}</Typography>
                <Typography variant="caption" color="text.secondary">启用客户</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'error.50', border: '1px solid', borderColor: 'error.100' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '12px !important' }}>
              <Block color="error" sx={{ fontSize: 36 }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main' }}>{stats.inactive}</Typography>
                <Typography variant="caption" color="text.secondary">停用客户</Typography>
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
              label="搜索（名称/编码/联系人）"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              sx={{ minWidth: 280 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleSearch}><Search /></IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>状态</InputLabel>
              <Select
                label="状态"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="ACTIVE">启用</MenuItem>
                <MenuItem value="INACTIVE">停用</MenuItem>
              </Select>
            </FormControl>
            {canAssignSalesRep && (
              <Autocomplete
                size="small"
                sx={{ minWidth: 180 }}
                options={employees}
                getOptionLabel={(opt) => opt.name || ''}
                value={employees.find(e => e.id === salesRepFilter) || null}
                onChange={(_, v) => { setSalesRepFilter(v?.id || ''); setPage(0); }}
                renderInput={(params) => <TextField {...params} label="业务员" size="small" />}
                isOptionEqualToValue={(opt, val) => opt.id === val?.id}
              />
            )}
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
              label={hasFilters ? `已筛选 ${total} 条` : `共 ${total} 条`}
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
                  <Chip
                    label={`关键词: ${keyword}`}
                    size="small"
                    onDelete={() => { setKeyword(''); setPage(0); }}
                    color="primary"
                    variant="outlined"
                  />
                )}
                {statusFilter && (
                  <Chip
                    label={`状态: ${STATUS_MAP[statusFilter]}`}
                    size="small"
                    onDelete={() => { setStatusFilter(''); setPage(0); }}
                    color="primary"
                    variant="outlined"
                  />
                )}
                {salesRepFilter && (
                  <Chip
                    label={`业务员: ${employees.find(e => e.id === salesRepFilter)?.name || salesRepFilter}`}
                    size="small"
                    onDelete={() => { setSalesRepFilter(''); setPage(0); }}
                    color="primary"
                    variant="outlined"
                  />
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
              <TableCell sx={{ fontWeight: 600 }}>联系人</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>电话</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>地址</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">信用额度</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">账期(天)</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">业务员</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">状态</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={10} align="center" sx={{ py: 3, color: 'text.secondary' }}>加载中...</TableCell></TableRow>
            ) : list.length === 0 ? (
              <TableRow><TableCell colSpan={10} align="center" sx={{ py: 3, color: 'text.secondary' }}>暂无数据</TableCell></TableRow>
            ) : (
              list.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{item.code}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                  <TableCell>{item.contactPerson || '-'}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{item.contactPhone || '-'}</TableCell>
                  <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.address || '-'}
                  </TableCell>
                  <TableCell align="right">¥{fmtMoney(item.creditLimit)}</TableCell>
                  <TableCell align="center">{item.creditPeriod || 30}</TableCell>
                  <TableCell align="center">
                    {item.salesRep ? (
                      <Chip size="small" icon={<Person sx={{ fontSize: 14 }} />} label={item.salesRep.name} variant="outlined" />
                    ) : <Typography variant="body2" color="text.secondary">未指定</Typography>}
                  </TableCell>
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
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(e.target.value); setPage(0); }}
          labelRowsPerPage="每页："
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count !== -1 ? count : '超过'} 条`}
        />
      </TableContainer>

      {/* 新增/编辑弹窗 */}
      <Dialog open={dialog.open} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{dialog.data ? '编辑客户' : '新增客户'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="客户编码" value={form.code || '保存后自动生成'} disabled />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="客户名称 *" value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="联系人" value={form.contactPerson || ''}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="联系电话" value={form.contactPhone || ''}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="地址" value={form.address || ''}
                onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" type="number" label="信用额度" value={form.creditLimit ?? ''}
                onChange={(e) => setForm({ ...form, creditLimit: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="0" onFocus={(e) => e.target.select()} inputProps={{ min: 0 }}
                InputProps={{ startAdornment: <InputAdornment position="start">¥</InputAdornment> }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" type="number" label="账期(天)" value={form.creditPeriod ?? ''}
                onChange={(e) => setForm({ ...form, creditPeriod: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="30" onFocus={(e) => e.target.select()} inputProps={{ min: 0 }} />
            </Grid>
            <Grid item xs={6}>
              <TextField select fullWidth size="small" label="状态" value={form.status || 'ACTIVE'}
                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <MenuItem value="ACTIVE">启用</MenuItem>
                <MenuItem value="INACTIVE">停用</MenuItem>
              </TextField>
            </Grid>
            {canAssignSalesRep && (
              <Grid item xs={6}>
                <Autocomplete
                  fullWidth
                  size="small"
                  options={employees}
                  getOptionLabel={(opt) => opt.name || ''}
                  value={employees.find(e => e.id === form.salesRepId) || null}
                  onChange={(_, v) => setForm({ ...form, salesRepId: v?.id || null })}
                  renderInput={(params) => <TextField {...params} label="业务员" size="small" placeholder="选择负责的业务员" />}
                  isOptionEqualToValue={(opt, val) => opt.id === val?.id}
                />
              </Grid>
            )}
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
            以下业务单据引用了该客户，请对照处理后重试：
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
                      {ref.items.some(i => i.title) && <TableCell sx={{ fontWeight: 600 }}>详情</TableCell>}
                      <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ref.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.planNo || item.code || '-'}</TableCell>
                        {ref.items.some(i => i.title) && <TableCell>{item.title || '-'}</TableCell>}
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
