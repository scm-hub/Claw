import { useState, useEffect, Fragment } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid, MenuItem, InputAdornment,
  Chip, Checkbox, Divider, Autocomplete, CircularProgress, Stack, FormControl,
  Select,
} from '@mui/material';
import { Add, Edit, Delete, Search, Person, Inventory2, RestartAlt, FilterList, ToggleOn, ToggleOff, KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import api from '../../lib/api';

const STATUS_MAP = {
  ACTIVE: { label: '启用', color: 'success' },
  INACTIVE: { label: '停用', color: 'default' },
};

const COL_COUNT = 8; // 展开图标列 + 7个数据列

export default function PurchaserAssignment() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // 弹窗状态
  const [dialog, setDialog] = useState({ open: false, data: null });
  const [refDialog, setRefDialog] = useState({ open: false, message: '', references: [] });
  const [confirmClose, setConfirmClose] = useState(false);
  const [users, setUsers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [remark, setRemark] = useState('');
  const [materialSearch, setMaterialSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // 加载列表
  const loadList = async () => {
    setLoading(true);
    try {
      const res = await api.get('/master/purchaser-assignments', { params: { keyword, status } });
      setList(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadList(); }, []);

  const handleSearch = () => { loadList(); };
  const handleReset = () => { setKeyword(''); setStatus(''); };

  // 统计
  const stats = {
    total: list.length,
    active: list.filter(d => d.status === 'ACTIVE').length,
    inactive: list.filter(d => d.status === 'INACTIVE').length,
    totalMaterials: list.reduce((sum, r) => sum + (r.materials?.length || 0), 0),
  };

  const hasFilters = keyword || status;

  // 打开新增弹窗
  const handleOpen = async () => {
    setDialog({ open: true, data: null });
    setSelectedUser(null);
    setSelectedMaterials([]);
    setRemark('');
    setMaterialSearch('');
    try {
      const [userRes, matRes] = await Promise.all([
        api.get('/master/purchaser-users'),
        api.get('/master/materials', { params: { pageSize: 9999, status: 'ACTIVE' } }),
      ]);
      setUsers(userRes.data || []);
      setMaterials(matRes.data?.list || []);
    } catch (err) { console.error(err); }
  };

  // 打开编辑弹窗
  const handleEdit = async (row) => {
    setDialog({ open: true, data: row });
    setRemark(row.remark || '');
    setMaterialSearch('');
    try {
      const [userRes, matRes] = await Promise.all([
        api.get('/master/purchaser-users'),
        api.get('/master/materials', { params: { pageSize: 9999, status: 'ACTIVE' } }),
      ]);
      setUsers(userRes.data || []);
      setMaterials(matRes.data?.list || []);
      setSelectedUser(userRes.data?.find((u) => u.id === row.userId) || null);
      setSelectedMaterials(row.materials?.map((m) => m.material) || []);
    } catch (err) { console.error(err); }
  };

  // 保存
  const handleSave = async () => {
    if (!selectedUser) { alert('请选择采购员'); return; }
    if (selectedMaterials.length === 0) { alert('请至少选择一个物料'); return; }
    setSaving(true);
    try {
      const payload = {
        userId: selectedUser.id,
        materialIds: selectedMaterials.map((m) => m.id),
        remark,
      };
      if (dialog.data) {
        await api.put(`/master/purchaser-assignments/${dialog.data.id}`, payload);
      } else {
        await api.post('/master/purchaser-assignments', payload);
      }
      setDialog({ open: false, data: null });
      loadList();
    } catch (err) { alert(err.data?.message || err.message || '保存失败'); }
    finally { setSaving(false); }
  };

  // 删除（含引用验证）
  const handleDelete = async (id) => {
    if (!confirm('确定删除该采购员分配？')) return;
    try {
      await api.delete(`/master/purchaser-assignments/${id}`);
      loadList();
    } catch (err) {
      if (err.status === 400 && err.data?.references) {
        setRefDialog({
          open: true,
          message: err.data.message || '该采购员已被业务单据引用，无法删除',
          references: err.data.references,
        });
      } else {
        alert(err.message || '删除失败');
      }
    }
  };

  // 检查表单是否有未保存的改动
  const hasFormChanges = () => {
    if (!dialog.open) return false;
    if (dialog.data) {
      // 编辑模式：对比原始备注和物料列表
      const origRemark = String(dialog.data.remark ?? '');
      const curRemark = String(remark ?? '');
      if (origRemark !== curRemark) return true;
      const origMatIds = (dialog.data.materials || []).map(m => m.materialId || m.material?.id).sort().join(',');
      const curMatIds = selectedMaterials.map(m => m.id).sort().join(',');
      if (origMatIds !== curMatIds) return true;
      return false;
    }
    // 新增模式：有选择用户或物料就算有改动
    return selectedUser !== null || selectedMaterials.length > 0 || (remark && remark.trim() !== '');
  };

  // 尝试关闭弹窗（有改动则弹出确认）
  const handleCloseDialog = () => {
    if (hasFormChanges()) {
      setConfirmClose(true);
    } else {
      setDialog({ open: false, data: null });
    }
  };

  // 切换状态
  const handleToggleStatus = async (item) => {
    const newStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.put(`/master/purchaser-assignments/${item.id}`, { status: newStatus });
      loadList();
    } catch (err) { alert(err.message); }
  };

  // 计算已被其他采购员分配的物料ID集合
  const assignedMaterialIds = new Set();
  list.forEach((row) => {
    if (dialog.data && row.id === dialog.data.id) return;
    row.materials?.forEach((m) => {
      const mid = m.materialId || m.material?.id;
      if (mid) assignedMaterialIds.add(mid);
    });
  });

  // 过滤物料搜索，排除已分配的
  const filteredMaterials = materials.filter((m) => {
    if (assignedMaterialIds.has(m.id)) return false;
    if (!materialSearch) return true;
    return (m.name || '').includes(materialSearch) || (m.code || '').includes(materialSearch);
  });

  // 全选/取消全选
  const handleSelectAll = () => {
    if (filteredMaterials.length > 0 && selectedMaterials.length === filteredMaterials.length) {
      setSelectedMaterials([]);
    } else {
      setSelectedMaterials([...filteredMaterials]);
    }
  };

  // 切换单个物料选择
  const toggleMaterial = (mat) => {
    if (assignedMaterialIds.has(mat.id)) return;
    const exists = selectedMaterials.find((m) => m.id === mat.id);
    if (exists) {
      setSelectedMaterials(selectedMaterials.filter((m) => m.id !== mat.id));
    } else {
      setSelectedMaterials([...selectedMaterials, mat]);
    }
  };

  return (
    <Box>
      {/* ===== 标题栏 ===== */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>采购员管理</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpen}>新增采购员分配</Button>
      </Box>

      {/* ===== 统计概览 ===== */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={3} sm={3}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Person sx={{ color: 'primary.main', fontSize: 28 }} />
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1 }}>{stats.total}</Typography>
                  <Typography variant="caption" color="text.secondary">采购员总数</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={3} sm={3}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'success.light', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography sx={{ color: 'success.dark', fontSize: 14, fontWeight: 700 }}>启</Typography>
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1, color: 'success.main' }}>{stats.active}</Typography>
                  <Typography variant="caption" color="text.secondary">启用</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={3} sm={3}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography sx={{ color: 'text.disabled', fontSize: 14, fontWeight: 700 }}>停</Typography>
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1, color: 'text.secondary' }}>{stats.inactive}</Typography>
                  <Typography variant="caption" color="text.secondary">停用</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={3} sm={3}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Inventory2 sx={{ color: 'warning.main', fontSize: 28 }} />
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1, color: 'warning.main' }}>{stats.totalMaterials}</Typography>
                  <Typography variant="caption" color="text.secondary">分配物料数</Typography>
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
              size="small" label="搜索（用户名 / 姓名）"
              value={keyword} onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              sx={{ minWidth: 200, flexGrow: 1, maxWidth: 280 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleSearch}><Search /></IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ width: 110 }}>
              <Select value={status} onChange={(e) => setStatus(e.target.value)} displayEmpty>
                <MenuItem value="">全部状态</MenuItem>
                <MenuItem value="ACTIVE">启用</MenuItem>
                <MenuItem value="INACTIVE">停用</MenuItem>
              </Select>
            </FormControl>
            <Button variant="contained" size="small" startIcon={<Search />} onClick={handleSearch}>查询</Button>
            <IconButton size="small" onClick={handleReset} disabled={!hasFilters} title="重置"><RestartAlt /></IconButton>
            <Box sx={{ flex: 1 }} />
            <Chip
              icon={<FilterList />}
              label={hasFilters ? `已筛选 ${list.length} 条` : `共 ${stats.total} 条`}
              size="small"
              color={hasFilters ? 'primary' : 'default'}
              variant={hasFilters ? 'filled' : 'outlined'}
            />
          </Stack>

          {/* 筛选标签 */}
          {hasFilters && (
            <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
              {keyword && <Chip size="small" label={`关键词: ${keyword}`} onDelete={() => { setKeyword(''); }} color="primary" variant="outlined" />}
              {status && <Chip size="small" label={`状态: ${STATUS_MAP[status]?.label || status}`} onDelete={() => { setStatus(''); }} color="primary" variant="outlined" />}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* ===== 表格 ===== */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell padding="checkbox" sx={{ width: 36, fontWeight: 600 }} />
              <TableCell sx={{ fontWeight: 600 }}>采购员</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>用户名</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>部门</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">负责物料数</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">状态</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>备注</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={COL_COUNT} align="center"><CircularProgress size={24} /></TableCell></TableRow>
            ) : list.length === 0 ? (
              <TableRow><TableCell colSpan={COL_COUNT} align="center"><Typography color="text.secondary" sx={{ py: 3 }}>暂无数据</Typography></TableCell></TableRow>
            ) : list.map((row) => {
              const isOpen = expandedId === row.id;
              const st = STATUS_MAP[row.status] || { label: row.status, color: 'default' };
              return (
                <Fragment key={row.id}>
                  {/* === 主行 === */}
                  <TableRow
                    hover
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => setExpandedId(isOpen ? null : row.id)}
                  >
                    <TableCell padding="checkbox" sx={{ width: 36 }}>
                      <IconButton size="small" sx={{ p: 0.5 }}>
                        {isOpen ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ fontWeight: isOpen ? 'bold' : 'normal' }}>{row.user?.employee?.name || '-'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: isOpen ? 700 : 600 }}>{row.user?.username || '-'}</Typography>
                    </TableCell>
                    <TableCell>{row.user?.employee?.department?.name || '-'}</TableCell>
                    <TableCell align="center">
                      <Chip label={row.materials?.length || 0} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell align="center">
                      <Chip size="small" label={st.label} color={st.color} variant={row.status === 'ACTIVE' ? 'filled' : 'outlined'} />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.remark || '-'}</TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                        <Button size="small" variant="contained"
                          color={row.status === 'ACTIVE' ? 'warning' : 'success'}
                          onClick={() => handleToggleStatus(row)}
                          sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>
                          {row.status === 'ACTIVE' ? '停用' : '启用'}
                        </Button>
                        <Button size="small" variant="contained" color="primary"
                          onClick={() => handleEdit(row)}
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

                  {/* === 展开明细行 === */}
                  {isOpen && (
                    <TableRow>
                      <TableCell colSpan={COL_COUNT} sx={{ py: 0, bgcolor: 'grey.50' }}>
                        {row.materials?.length > 0 ? (
                          <Table size="small" sx={{ mt: 1, mb: 1 }}>
                            <TableHead>
                              <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', bgcolor: 'grey.100' } }}>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>物料编码</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>物料名称</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>规格</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>单位</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>分类</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {row.materials.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell sx={{ fontFamily: 'monospace' }}>{item.material?.code}</TableCell>
                                  <TableCell>{item.material?.name}</TableCell>
                                  <TableCell>{item.material?.spec || '-'}</TableCell>
                                  <TableCell>{item.material?.unit || '-'}</TableCell>
                                  <TableCell>{item.material?.category || '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <Typography color="text.secondary" sx={{ py: 1.5, textAlign: 'center' }}>暂无分配物料</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ===== 新增/编辑弹窗 ===== */}
      <Dialog open={dialog.open} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {dialog.data ? '编辑采购员分配' : '新增采购员分配'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {/* 选择采购员 */}
            <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'text.secondary' }}>
              <Person sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
              选择采购员{dialog.data ? '（不可更改）' : ''}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontSize: '0.75rem' }}>
              （采购员是拥有采购管理模块的用户）
            </Typography>
            <Autocomplete
              disabled={!!dialog.data}
              options={users}
              value={selectedUser}
              onChange={(e, val) => setSelectedUser(val)}
              getOptionLabel={(opt) => {
                const empName = opt.employee?.name || '';
                const dept = opt.employee?.department?.name || '';
                return `${opt.username}${empName ? ' - ' + empName : ''}${dept ? ' (' + dept + ')' : ''}`;
              }}
              renderInput={(params) => <TextField {...params} size="small" placeholder="搜索用户名或姓名" />}
              isOptionEqualToValue={(opt, val) => opt.id === val?.id}
              sx={{ mb: 2 }}
            />

            {/* 备注 */}
            <TextField fullWidth size="small" label="备注（可选）" value={remark} onChange={(e) => setRemark(e.target.value)} sx={{ mb: 2 }} />

            <Divider sx={{ mb: 2 }} />

            {/* 批量选择物料 */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                <Inventory2 sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                选择负责物料（已选 {selectedMaterials.length} 个）
              </Typography>
              <Button size="small" onClick={handleSelectAll}>
                {selectedMaterials.length === filteredMaterials.length && filteredMaterials.length > 0 ? '取消全选' : '全选'}
              </Button>
            </Box>
            <TextField
              fullWidth size="small" placeholder="搜索物料编码或名称"
              value={materialSearch} onChange={(e) => setMaterialSearch(e.target.value)}
              sx={{ mb: 1 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
            />
            <Paper variant="outlined" sx={{ maxHeight: 360, overflow: 'auto' }}>
              <Table size="small">
                <TableHead sx={{ position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={filteredMaterials.length > 0 && selectedMaterials.length === filteredMaterials.length}
                        indeterminate={selectedMaterials.length > 0 && selectedMaterials.length < filteredMaterials.length}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>物料编码</TableCell>
                    <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>物料名称</TableCell>
                    <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>规格</TableCell>
                    <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>单位</TableCell>
                    <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>分类</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredMaterials.map((mat) => {
                    const checked = !!selectedMaterials.find((m) => m.id === mat.id);
                    return (
                      <TableRow key={mat.id} hover onClick={() => toggleMaterial(mat)} sx={{ cursor: 'pointer', bgcolor: checked ? 'action.selected' : 'inherit' }}>
                        <TableCell padding="checkbox"><Checkbox size="small" checked={checked} /></TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{mat.code}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{mat.name}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{mat.spec || '-'}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{mat.unit || '-'}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{mat.category || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredMaterials.length === 0 && (
                    <TableRow><TableCell colSpan={6} align="center"><Typography color="text.secondary" sx={{ py: 2 }}>无匹配物料</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== 删除引用详情弹窗 ===== */}
      <Dialog open={refDialog.open} onClose={() => setRefDialog({ open: false, message: '', references: [] })} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 600 }}>
          无法删除 — {refDialog.message}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            以下业务单据引用了该采购员，请对照处理后重试：
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
                      {ref.items[0].title !== undefined && <TableCell sx={{ fontWeight: 600 }}>标题</TableCell>}
                      <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ref.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.code || '-'}</TableCell>
                        {item.title !== undefined && <TableCell>{item.title || '-'}</TableCell>}
                        <TableCell>{STATUS_MAP[item.status]?.label || item.status}</TableCell>
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
