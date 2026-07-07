import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid, MenuItem, InputAdornment,
  TablePagination, Chip, Stack, Autocomplete, Tooltip,
} from '@mui/material';
import {
  Add, Edit, Delete, Search, Inventory2, RestartAlt,
  ToggleOn, ToggleOff, FilterList, QrCode, Thermostat,
} from '@mui/icons-material';
import api from '../../lib/api';
import { getConversionDesc, needsConversion } from '../../lib/unitConversion';

function fmtMoney(n) {
  if (n == null || isNaN(n)) return '0.00';
  return Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_MAP = {
  ACTIVE: { label: '启用', color: 'success' },
  INACTIVE: { label: '停用', color: 'default' },
};

export default function MaterialList() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [loading, setLoading] = useState(false);

  // 查询条件
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [barcode, setBarcode] = useState('');
  const [groupIdFilter, setGroupIdFilter] = useState('');
  const [gradeIdFilter, setGradeIdFilter] = useState('');

  // 分类列表 + 产品组列表 + 等级列表
  const [categories, setCategories] = useState([]);
  const [materialGroups, setMaterialGroups] = useState([]);
  const [materialGrades, setMaterialGrades] = useState([]);

  // 弹窗
  const [dialog, setDialog] = useState({ open: false, data: null });
  const [form, setForm] = useState({});
  const [confirmClose, setConfirmClose] = useState(false); // 关闭确认弹窗

  // 删除引用详情弹窗
  const [refDialog, setRefDialog] = useState({ open: false, message: '', references: [] });

  // 状态中文映射
  const STATUS_LABELS = {
    DRAFT: '草稿', PENDING: '待审批', APPROVED: '已审批', PENDING_APPROVAL: '待审批',
    REJECTED: '已驳回', PUBLISHED: '已发布', COMPLETED: '已完成', CANCELLED: '已取消',
    IN: '入库', OUT: '出库', TRANSFER: '调拨', PASS: '合格', PENDING_QC: '待检',
    ACTIVE: '启用', INACTIVE: '停用', STANDARD: '标准价', CUSTOM: '客户价',
  };

  // 统计
  const [summary, setSummary] = useState({ total: 0, active: 0, inactive: 0 });

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page + 1));
      params.set('pageSize', String(rowsPerPage));
      if (keyword) params.set('keyword', keyword);
      if (category) params.set('category', category);
      if (status) params.set('status', status);
      if (barcode) params.set('barcode', barcode);
      if (groupIdFilter) params.set('groupId', groupIdFilter);
      if (gradeIdFilter) params.set('gradeId', gradeIdFilter);
      const res = await api.get(`/master/materials?${params.toString()}`);
      setList(res.data?.list || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, keyword, category, status, barcode, groupIdFilter, gradeIdFilter]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await api.get('/master/materials/categories');
      setCategories(res.data || []);
    } catch { /* ignore */ }
  }, []);

  const loadMaterialGroups = useCallback(async () => {
    try {
      const res = await api.get('/master/material-groups', { params: { pageSize: 999, status: 'ACTIVE' } });
      const data = res.data?.list || res.list || [];
      setMaterialGroups(data);
    } catch { /* ignore */ }
  }, []);

  const loadMaterialGrades = useCallback(async () => {
    try {
      const res = await api.get('/master/material-grades', { params: { pageSize: 999, status: 'ACTIVE' } });
      // material-grade API returns { list, pagination } directly (no success wrapper)
      const data = res.list || res.data?.list || res.data || [];
      setMaterialGrades(data);
    } catch (err) { console.error('loadMaterialGrades error:', err); }
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const [all, active] = await Promise.all([
        api.get('/master/materials?pageSize=1'),
        api.get('/master/materials?pageSize=1&status=ACTIVE'),
      ]);
      setSummary({
        total: all.data?.total ?? 0,
        active: active.data?.total ?? 0,
        inactive: (all.data?.total ?? 0) - (active.data?.total ?? 0),
      });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { loadCategories(); loadSummary(); loadMaterialGroups(); loadMaterialGrades(); }, [loadCategories, loadSummary, loadMaterialGroups, loadMaterialGrades]);

  const handleSearch = () => { setPage(0); loadList(); };
  const handleReset = () => {
    setKeyword(''); setCategory(''); setStatus(''); setBarcode(''); setGroupIdFilter(''); setGradeIdFilter('');
    setPage(0);
  };

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

  const handleOpen = (data = null) => {
    setDialog({ open: true, data });
    // 编辑模式：取已有等级ID列表
    const existingGradeIds = data?.materialGrades?.map(mg => mg.gradeId) || [];
    setForm(data ? {
      ...data,
      gradeIds: existingGradeIds,
    } : {
      name: '', spec: '', unit: '', category: '', shelfLifeDays: '',
      status: 'ACTIVE',
      barcode: '', storageTempMin: '', storageTempMax: '',
      initialPurchasePrice: '',
      guidePercent: '',
      purchaseLeadTime: '',
      purchaseUnit: '', salesUnit: '',
      purchaseConversionFactor: '', salesConversionFactor: '',
      groupId: '',
      gradeIds: [],
    });
  };

  const handleSave = async () => {
    if (!form.name?.trim()) { alert('请输入产品名称'); return; }
    try {
      const payload = { ...form };
      // 数值类型转换
      payload.shelfLifeDays = payload.shelfLifeDays === '' || payload.shelfLifeDays === undefined ? 0 : Number(payload.shelfLifeDays);
      payload.initialPurchasePrice = payload.initialPurchasePrice === '' || payload.initialPurchasePrice === undefined ? 0 : Number(payload.initialPurchasePrice);
      payload.guidePercent = payload.guidePercent === '' || payload.guidePercent === undefined ? 30 : Number(payload.guidePercent);
      payload.purchaseLeadTime = payload.purchaseLeadTime === '' || payload.purchaseLeadTime === undefined ? 0 : Number(payload.purchaseLeadTime);
      payload.storageTempMin = payload.storageTempMin === '' ? null : Number(payload.storageTempMin);
      payload.storageTempMax = payload.storageTempMax === '' ? null : Number(payload.storageTempMax);
      payload.purchaseConversionFactor = payload.purchaseConversionFactor === '' || payload.purchaseConversionFactor === undefined ? 1 : Number(payload.purchaseConversionFactor);
      payload.salesConversionFactor = payload.salesConversionFactor === '' || payload.salesConversionFactor === undefined ? 1 : Number(payload.salesConversionFactor);
      // gradeIds 保持数组，PUT 时后端会替换关联
      if (dialog.data) {
        await api.put(`/master/materials/${dialog.data.id}`, payload);
      } else {
        await api.post('/master/materials', payload);
      }
      setDialog({ open: false, data: null });
      loadList();
      loadCategories();
      loadSummary();
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除该产品？')) return;
    try {
      await api.delete(`/master/materials/${id}`);
      loadList();
      loadSummary();
    } catch (err) {
      // 检查是否是引用冲突（400）— api.js (fetch) 用 err.status/err.data
      if ((err.status === 400 || err.response?.status === 400) && (err.data?.references || err.response?.data?.references)) {
        setRefDialog({
          open: true,
          message: err.data?.message || err.response?.data?.message || '该产品已被业务单据引用，无法删除',
          references: err.data?.references || err.response?.data?.references,
        });
      } else {
        alert(err.message || '删除失败');
      }
    }
  };

  // 格式化状态为中文
  const fmtStatus = (s) => STATUS_LABELS[s] || s;

  const handleToggleStatus = async (item) => {
    const newStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.put(`/master/materials/${item.id}`, { status: newStatus });
      loadList();
      loadSummary();
    } catch (err) { alert(err.message); }
  };

  const hasFilters = keyword || category || status || barcode || gradeIdFilter;

  return (
    <Box>
      {/* ===== 标题栏 ===== */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>产品管理</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>新增产品</Button>
      </Box>

      {/* ===== 统计概览 ===== */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={4} sm={4}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Inventory2 sx={{ color: 'primary.main', fontSize: 28 }} />
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1 }}>{summary.total}</Typography>
                  <Typography variant="caption" color="text.secondary">产品总数</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4} sm={4}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'success.light', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography sx={{ color: 'success.dark', fontSize: 14, fontWeight: 700 }}>启</Typography>
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1, color: 'success.main' }}>{summary.active}</Typography>
                  <Typography variant="caption" color="text.secondary">启用</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4} sm={4}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography sx={{ color: 'text.disabled', fontSize: 14, fontWeight: 700 }}>停</Typography>
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1, color: 'text.secondary' }}>{summary.inactive}</Typography>
                  <Typography variant="caption" color="text.secondary">停用</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ===== 查询条件 ===== */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: '16px !important' }}>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              size="small" label="搜索（编码 / 名称 / 条码）"
              value={keyword} onChange={(e) => setKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              sx={{ minWidth: 220, flexGrow: 1, maxWidth: 300 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleSearch}><Search /></IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Autocomplete
              size="small" freeSolo
              options={categories}
              value={category}
              onChange={(_, v) => setCategory(v || '')}
              onInputChange={(_, v) => setCategory(v)}
              sx={{ width: 140 }}
              renderInput={(params) => <TextField {...params} label="分类" />}
            />
            <Autocomplete
              size="small"
              options={materialGroups}
              getOptionLabel={option => option.name || ''}
              value={materialGroups.find(g => g.id === groupIdFilter) || null}
              onChange={(_, v) => setGroupIdFilter(v?.id || '')}
              sx={{ width: 180 }}
              renderInput={(params) => <TextField {...params} label="产品组" />}
            />
            <Autocomplete
              size="small"
              options={materialGrades}
              getOptionLabel={option => option.name || ''}
              value={materialGrades.find(g => g.id === gradeIdFilter) || null}
              onChange={(_, v) => setGradeIdFilter(v?.id || '')}
              sx={{ width: 160 }}
              renderInput={(params) => <TextField {...params} label="等级" />}
            />
            <TextField
              select size="small" label="状态"
              value={status} onChange={(e) => setStatus(e.target.value)}
              sx={{ width: 110 }}
            >
              <MenuItem value="">全部</MenuItem>
              <MenuItem value="ACTIVE">启用</MenuItem>
              <MenuItem value="INACTIVE">停用</MenuItem>
            </TextField>
            <Button variant="contained" size="small" startIcon={<Search />} onClick={handleSearch}>查询</Button>
            <Button variant="outlined" size="small" startIcon={<RestartAlt />} onClick={handleReset} disabled={!hasFilters}>重置</Button>
            <Box sx={{ flex: 1 }} />
            <Chip
              icon={<FilterList />}
              label={hasFilters ? `已筛选 ${total} 条` : `共 ${total} 条`}
              size="small"
              color={hasFilters ? 'primary' : 'default'}
              variant={hasFilters ? 'filled' : 'outlined'}
            />
          </Stack>

          {/* 当前筛选标签 */}
          {hasFilters && (
            <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
              {keyword && <Chip size="small" label={`关键词: ${keyword}`} onDelete={() => { setKeyword(''); }} color="primary" variant="outlined" />}
              {category && <Chip size="small" label={`分类: ${category}`} onDelete={() => { setCategory(''); }} color="primary" variant="outlined" />}
              {status && <Chip size="small" label={`状态: ${STATUS_MAP[status]?.label || status}`} onDelete={() => { setStatus(''); }} color="primary" variant="outlined" />}
              {barcode && <Chip size="small" label={`条码: ${barcode}`} onDelete={() => { setBarcode(''); }} color="primary" variant="outlined" />}
              {gradeIdFilter && <Chip size="small" label={`等级: ${materialGrades.find(g => g.id === gradeIdFilter)?.name || gradeIdFilter}`} onDelete={() => { setGradeIdFilter(''); }} color="primary" variant="outlined" />}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* ===== 表格 ===== */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 600 }}>编码</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>名称</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>产品组</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>规格</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>单位</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>采购单位</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>销售单位</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>分类</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>等级</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">条码</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">保质期</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">采购周期(天)</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">采购期初价</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">指导百分比(%)</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">储存温度</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">状态</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={17} align="center"><Typography color="text.secondary" sx={{ py: 3 }}>加载中...</Typography></TableCell></TableRow>
            ) : list.length === 0 ? (
              <TableRow><TableCell colSpan={17} align="center"><Typography color="text.secondary" sx={{ py: 3 }}>暂无数据</Typography></TableCell></TableRow>
            ) : (
              list.map((item) => {
                const st = STATUS_MAP[item.status] || { label: item.status, color: 'default' };
                const tempStr = (item.storageTempMin != null || item.storageTempMax != null)
                  ? `${item.storageTempMin ?? '~'}°C ~ ${item.storageTempMax ?? '~'}°C`
                  : '-';
                return (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.code}</Typography>
                    </TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      {item.group ? (
                        <Tooltip title={`编码: ${item.group.code}`}>
                          <Chip size="small" label={item.group.name} variant="outlined" color="primary" />
                        </Tooltip>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{item.spec || '-'}</TableCell>
                    <TableCell>{item.unit || '-'}</TableCell>
                    <TableCell>
                      {item.purchaseUnit && Number(item.purchaseConversionFactor || 1) !== 1
                        ? <Tooltip title={getConversionDesc(item, 'purchase')}><span>{item.purchaseUnit}<Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>(×{item.purchaseConversionFactor})</Typography></span></Tooltip>
                        : item.purchaseUnit || (item.unit || '-')}
                    </TableCell>
                    <TableCell>
                      {item.salesUnit && Number(item.salesConversionFactor || 1) !== 1
                        ? <Tooltip title={getConversionDesc(item, 'sales')}><span>{item.salesUnit}<Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>(×{item.salesConversionFactor})</Typography></span></Tooltip>
                        : item.salesUnit || (item.unit || '-')}
                    </TableCell>
                    <TableCell>{item.category ? <Chip size="small" label={item.category} variant="outlined" /> : '-'}</TableCell>
                    <TableCell>
                      {item.materialGrades && item.materialGrades.length > 0 ? (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ gap: 0.5 }}>
                          {item.materialGrades.map(mg => (
                            <Chip key={mg.gradeId} size="small" label={mg.grade?.name || mg.gradeId} color="warning" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
                          ))}
                        </Stack>
                      ) : '-'}
                    </TableCell>
                    <TableCell align="center">
                      {item.barcode ? (
                        <Tooltip title={item.barcode}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {item.barcode.length > 12 ? item.barcode.slice(0, 10) + '...' : item.barcode}
                          </Typography>
                        </Tooltip>
                      ) : '-'}
                    </TableCell>
                    <TableCell align="center">{item.shelfLifeDays || 0}天</TableCell>
                    <TableCell align="center">{item.purchaseLeadTime || 0}天</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{fmtMoney(item.initialPurchasePrice)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', color: 'primary.main', fontWeight: 600 }}>{Number(item.guidePercent ?? 30).toFixed(0)}%</TableCell>
                    <TableCell align="center">
                      {tempStr !== '-' ? (
                        <Tooltip title={tempStr}>
                          <Chip size="small" icon={<Thermostat sx={{ fontSize: 14 }} />} label={tempStr} variant="outlined" sx={{ maxWidth: 120 }} />
                        </Tooltip>
                      ) : '-'}
                    </TableCell>
                    <TableCell align="center">
                      <Chip size="small" label={st.label} color={st.color} />
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
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div" count={total} page={page} rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={(e) => { setRowsPerPage(e.target.value); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage="每页："
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count} 条`}
        />
      </TableContainer>

      {/* ===== 新增/编辑弹窗 ===== */}
      <Dialog open={dialog.open} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{dialog.data ? '编辑产品' : '新增产品'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="产品编码" value={form.code || '保存后自动生成'} disabled />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="产品名称" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })}
                error={!form.name?.trim()} helperText={!form.name?.trim() ? '必填' : ''} />
            </Grid>
            <Grid item xs={6}>
              <Autocomplete
                size="small"
                options={materialGroups}
                getOptionLabel={option => option.name || ''}
                value={materialGroups.find(g => g.id === form.groupId) || null}
                onChange={(_, v) => setForm({ ...form, groupId: v?.id || '' })}
                renderInput={(params) => <TextField {...params} label="所属产品组" helperText="可选，不选则为独立物料" />}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="规格" value={form.spec || ''} onChange={(e) => setForm({ ...form, spec: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="单位（基准单位）" value={form.unit || ''} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="如: kg/克/箱" helperText="最小计量单位，所有内部计算使用此单位" />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="采购单位" value={form.purchaseUnit || ''} onChange={(e) => setForm({ ...form, purchaseUnit: e.target.value })} placeholder="如: 斤/箱，不填则与基准单位相同" />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" type="number" label="采购换算系数" value={form.purchaseConversionFactor ?? ''}
                onChange={(e) => setForm({ ...form, purchaseConversionFactor: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="1采购单位=?基准单位，如: 500(1斤=500克)" onFocus={(e) => e.target.select()} inputProps={{ min: 0.0001, step: 1 }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="销售单位" value={form.salesUnit || ''} onChange={(e) => setForm({ ...form, salesUnit: e.target.value })} placeholder="如: 盒/份，不填则与基准单位相同" />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" type="number" label="销售换算系数" value={form.salesConversionFactor ?? ''}
                onChange={(e) => setForm({ ...form, salesConversionFactor: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="1销售单位=?基准单位，如: 50(1盒=50克)" onFocus={(e) => e.target.select()} inputProps={{ min: 0.0001, step: 1 }} />
            </Grid>
            <Grid item xs={6}>
              <Autocomplete
                size="small" freeSolo
                options={categories}
                value={form.category || ''}
                onChange={(_, v) => setForm({ ...form, category: v || '' })}
                onInputChange={(_, v) => setForm({ ...form, category: v })}
                renderInput={(params) => <TextField {...params} label="分类" placeholder="如: 鲜菇/干菇/菌包" />}
              />
            </Grid>
            <Grid item xs={6}>
              <Autocomplete
                multiple size="small"
                options={materialGrades}
                getOptionLabel={option => `${option.code} - ${option.name}`}
                value={materialGrades.filter(g => (form.gradeIds || []).includes(g.id))}
                onChange={(_, v) => setForm({ ...form, gradeIds: v.map(g => g.id) })}
                isOptionEqualToValue={(option, val) => option.id === val.id}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip label={option.name} size="small" {...getTagProps({ index })} color="warning" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                  ))
                }
                renderInput={(params) => <TextField {...params} label="等级" placeholder="选择等级（可多选）" helperText="一个产品可归属多个等级" />}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" type="number" label="保质期(天)" value={form.shelfLifeDays ?? ''}
                onChange={(e) => setForm({ ...form, shelfLifeDays: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="0" onFocus={(e) => e.target.select()} inputProps={{ min: 0 }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" type="number" label="采购周期(天)" value={form.purchaseLeadTime ?? ''}
                onChange={(e) => setForm({ ...form, purchaseLeadTime: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="0" onFocus={(e) => e.target.select()} inputProps={{ min: 0 }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" type="number" label="采购期初价(元)" value={form.initialPurchasePrice ?? ''}
                onChange={(e) => setForm({ ...form, initialPurchasePrice: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="0.00" onFocus={(e) => e.target.select()} inputProps={{ min: 0, step: 0.01 }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" type="number" label="指导百分比(%)" value={form.guidePercent ?? ''}
                onChange={(e) => setForm({ ...form, guidePercent: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="30" onFocus={(e) => e.target.select()} inputProps={{ min: 0, step: 1 }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="条码" value={form.barcode || ''}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="可选"
                InputProps={{ startAdornment: <InputAdornment position="start"><QrCode sx={{ fontSize: 18 }} /></InputAdornment> }} />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth size="small" type="number" label="储存温度下限(°C)" value={form.storageTempMin ?? ''}
                onChange={(e) => setForm({ ...form, storageTempMin: e.target.value })} placeholder="如: 2"
                InputProps={{ startAdornment: <InputAdornment position="start"><Thermostat sx={{ fontSize: 18 }} /></InputAdornment> }} />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth size="small" type="number" label="储存温度上限(°C)" value={form.storageTempMax ?? ''}
                onChange={(e) => setForm({ ...form, storageTempMax: e.target.value })} placeholder="如: 8"
                InputProps={{ startAdornment: <InputAdornment position="start"><Thermostat sx={{ fontSize: 18 }} /></InputAdornment> }} />
            </Grid>
            <Grid item xs={4}>
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
      {/* ===== 删除引用冲突提示弹窗 ===== */}
      <Dialog open={refDialog.open} onClose={() => setRefDialog({ open: false, message: '', references: [] })} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 600 }}>无法删除 — 产品被业务单据引用</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2, color: 'error.dark' }}>{refDialog.message}</Typography>
          {refDialog.references.map((ref, idx) => (
            <Box key={idx} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: 'primary.main' }}>
                📋 {ref.type}（共 {ref.count} 条引用）
              </Typography>
              <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, fontSize: '0.8rem' } }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell sx={{ fontWeight: 600 }}>单据编号</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>标题</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ref.items.map((item, i) => {
                    // 适配不同返回格式：planNo/code, title/无, status
                    const code = item.planNo || item.orderNo || item.receiptNo || item.takeNo || item.movementNo || item.batchNo || item.code || '-';
                    const title = item.title || (item.qty ? `库存 ${item.qty}` : '') || '';
                    const status = fmtStatus(item.status || item.qcResult || '-');
                    return (
                      <TableRow key={i} hover>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{code}</TableCell>
                        <TableCell>{title}</TableCell>
                        <TableCell><Chip size="small" label={status} variant="outlined" /></TableCell>
                      </TableRow>
                    );
                  })}
                  {ref.more > 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                        ...还有 {ref.more} 条，共 {ref.count} 条引用
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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
          <Button onClick={() => { setConfirmClose(false); setDialog({ open: false, data: null }); }} color="error" variant="contained">放弃更改</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
