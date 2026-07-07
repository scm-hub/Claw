import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid, MenuItem, InputAdornment,
  TablePagination, Chip, Stack, Tooltip, Collapse, Autocomplete,
} from '@mui/material';
import {
  Add, Edit, Delete, Search, Inventory2, ExpandMore, ExpandLess,
  Category,
} from '@mui/icons-material';
import api from '../../lib/api';

const STATUS_MAP = {
  ACTIVE: { label: '启用', color: 'success' },
  INACTIVE: { label: '停用', color: 'default' },
};

export default function MaterialGroupList() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [loading, setLoading] = useState(false);

  // 查询条件
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');

  // 分类列表
  const [categories, setCategories] = useState([]);

  // 弹窗
  const [dialog, setDialog] = useState({ open: false, data: null });
  const [form, setForm] = useState({});
  const [confirmClose, setConfirmClose] = useState(false);

  // 展开行（查看关联物料）
  const [expandedRows, setExpandedRows] = useState({});
  const [groupMaterials, setGroupMaterials] = useState({}); // groupId → materials

  // 删除确认
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: '', name: '' });
  // 删除引用详情
  const [refDialog, setRefDialog] = useState({ open: false, message: '', references: [] });

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/master/material-groups', {
        params: {
          page: page + 1,
          pageSize: rowsPerPage,
          keyword,
          category,
          status,
        },
      });
      setList(res.data?.list || res.list || []);
      setTotal(res.data?.total || res.total || 0);
    } catch (e) { console.error('加载产品组列表失败', e); }
    setLoading(false);
  }, [page, rowsPerPage, keyword, category, status]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await api.get('/master/materials/categories');
      setCategories(res.data || res || []);
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { loadCategories(); }, [loadCategories]);

  // 展开关联物料
  const toggleExpand = async (groupId) => {
    const newExpanded = { ...expandedRows };
    if (newExpanded[groupId]) {
      newExpanded[groupId] = false;
      setExpandedRows(newExpanded);
    } else {
      newExpanded[groupId] = true;
      setExpandedRows(newExpanded);
      // 加载关联物料
      if (!groupMaterials[groupId]) {
        try {
          const res = await api.get('/master/material-groups/' + groupId);
          setGroupMaterials(prev => ({ ...prev, [groupId]: res.data?.materials || res.materials || [] }));
        } catch (e) { console.error('加载关联物料失败', e); }
      }
    }
  };

  // 弹窗操作
  const handleOpen = (data) => {
    setForm(data || { name: '', code: '', category: '', description: '', status: 'ACTIVE' });
    setDialog({ open: true, data });
    setConfirmClose(false);
  };

  const handleClose = () => {
    const empty = { name: '', code: '', category: '', description: '', status: 'ACTIVE' };
    const hasChanges = dialog.data
      ? Object.keys(empty).some(k => String(form[k] ?? '') !== String(dialog.data[k] ?? ''))
      : JSON.stringify(form) !== JSON.stringify(empty);
    if (hasChanges) {
      setConfirmClose(true);
      return;
    }
    setDialog({ open: false, data: null });
    setForm({});
  };

  const handleSave = async () => {
    if (!form.name) { alert('产品组名称必填'); return; }
    try {
      if (dialog.data) {
        await api.put('/master/material-groups/' + dialog.data.id, form);
      } else {
        await api.post('/master/material-groups', form);
      }
      loadList();
      setDialog({ open: false, data: null });
    } catch (e) {
      alert(e.response?.data?.message || e.data?.message || e.message || '保存失败');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete('/master/material-groups/' + deleteDialog.id);
      setDeleteDialog({ open: false, id: '', name: '' });
      loadList();
    } catch (e) {
      if (e.status === 400 && e.data?.references) {
        setDeleteDialog({ open: false, id: '', name: '' });
        setRefDialog({ open: true, message: e.data.message, references: e.data.references });
      } else {
        alert(e.data?.message || e.message || '删除失败');
      }
    }
  };

  // 状态切换
  const handleToggleStatus = async (item) => {
    const newStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.put('/master/material-groups/' + item.id, { name: item.name, code: item.code, category: item.category, description: item.description, status: newStatus });
      loadList();
    } catch (e) { alert(e.data?.message || '状态切换失败'); }
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* 标题 + 统计 */}
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
        <Category sx={{ mr: 1, verticalAlign: 'middle' }} /> 产品组管理
      </Typography>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Chip label={`共 ${total} 组`} variant="outlined" />
        <Chip label={`启用 ${list.filter(i => i.status === 'ACTIVE').length}`} color="success" variant="outlined" />
      </Stack>

      {/* 搜索栏 */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ pb: '8px !important' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField size="small" placeholder="搜索编码/名称" value={keyword} onChange={e => setKeyword(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} sx={{ width: 260 }} />
            <Autocomplete size="small" options={categories} value={category} onChange={(_, v) => setCategory(v || '')}
              sx={{ width: 180 }} renderInput={params => <TextField {...params} placeholder="分类筛选" />} />
            <TextField size="small" select value={status} onChange={e => setStatus(e.target.value)} sx={{ width: 120 }} label="状态">
              <MenuItem value="">全部</MenuItem>
              <MenuItem value="ACTIVE">启用</MenuItem>
              <MenuItem value="INACTIVE">停用</MenuItem>
            </TextField>
            <Button variant="outlined" onClick={() => { setKeyword(''); setCategory(''); setStatus(''); }}>重置</Button>
            <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen(null)}>新增产品组</Button>
          </Stack>
        </CardContent>
      </Card>

      {/* 列表 */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, width: 40 }}></TableCell>
              <TableCell sx={{ fontWeight: 600 }}>编码</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>名称</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>分类</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>规格变体数</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>描述</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} align="center"><Typography color="text.secondary" sx={{ py: 3 }}>加载中...</Typography></TableCell></TableRow>
            ) : list.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center"><Typography color="text.secondary" sx={{ py: 3 }}>暂无数据</Typography></TableCell></TableRow>
            ) : list.map(item => {
              const isExpanded = expandedRows[item.id];
              const materials = groupMaterials[item.id] || [];
              return (
                <>
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <IconButton size="small" onClick={() => toggleExpand(item.id)}>
                        {isExpanded ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{item.code}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                    <TableCell>{item.category || '-'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={item._count?.materials ?? 0} color={item._count?.materials > 0 ? 'primary' : 'default'} variant="outlined" />
                    </TableCell>
                    <TableCell><Typography variant="body2" color="textSecondary" noWrap>{item.description || '-'}</Typography></TableCell>
                    <TableCell><Chip size="small" {...STATUS_MAP[item.status]} label={STATUS_MAP[item.status]?.label || item.status} /></TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
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
                          onClick={() => setDeleteDialog({ open: true, id: item.id, name: item.name })}
                          sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>
                          删除
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                  {/* 展开的关联物料 */}
                  <TableRow key={item.id + '-detail'}>
                    <TableCell colSpan={8} sx={{ py: 0, borderBottom: isExpanded ? undefined : 'none' }}>
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ pl: 4, py: 1 }}>
                          <Typography variant="subtitle2" sx={{ mb: 1 }}>规格变体物料</Typography>
                          {materials.length === 0 ? (
                            <Typography variant="body2" color="textSecondary">暂无关联物料，可在"产品管理"中为物料指定所属产品组</Typography>
                          ) : (
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>编码</TableCell><TableCell>名称</TableCell><TableCell>规格</TableCell>
                                  <TableCell>基准单位</TableCell><TableCell>采购单位</TableCell><TableCell>销售单位</TableCell>
                                  <TableCell>状态</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {materials.map(m => (
                                  <TableRow key={m.id} hover>
                                    <TableCell sx={{ fontFamily: 'monospace' }}>{m.code}</TableCell>
                                    <TableCell>{m.name}</TableCell>
                                    <TableCell>{m.spec || '-'}</TableCell>
                                    <TableCell>{m.unit || '-'}</TableCell>
                                    <TableCell>{m.purchaseUnit || m.unit || '-'}</TableCell>
                                    <TableCell>{m.salesUnit || m.unit || '-'}</TableCell>
                                    <TableCell><Chip size="small" {...STATUS_MAP[m.status]} label={STATUS_MAP[m.status]?.label || m.status} /></TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </>
              );
            })}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50]}
        />
      </TableContainer>

      {/* 新增/编辑弹窗 */}
      <Dialog open={dialog.open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog.data ? '编辑产品组' : '新增产品组'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="名称" required value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <Autocomplete size="small" freeSolo options={categories} value={form.category || ''}
                onInputChange={(_, v) => setForm({ ...form, category: v })}
                renderInput={params => <TextField {...params} label="分类" />} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="描述" multiline rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" select label="状态" value={form.status || 'ACTIVE'} onChange={e => setForm({ ...form, status: e.target.value })}>
                <MenuItem value="ACTIVE">启用</MenuItem>
                <MenuItem value="INACTIVE">停用</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>取消</Button>
          <Button variant="contained" onClick={handleSave}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: '', name: '' })}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>确定要删除产品组「<strong>{deleteDialog.name}</strong>」吗？</Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>如果该组下有关联物料，需要先解除关联才能删除。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: '', name: '' })}>取消</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>删除</Button>
        </DialogActions>
      </Dialog>

      {/* 未保存变更确认 */}
      <Dialog open={confirmClose} onClose={() => setConfirmClose(false)}>
        <DialogTitle>未保存的变更</DialogTitle>
        <DialogContent><Typography>您有未保存的变更，确定关闭吗？</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClose(false)}>继续编辑</Button>
          <Button color="error" onClick={() => { setConfirmClose(false); setDialog({ open: false, data: null }); setForm({}); }}>放弃变更</Button>
        </DialogActions>
      </Dialog>

      {/* 删除引用详情弹窗 */}
      <Dialog open={refDialog.open} onClose={() => setRefDialog({ open: false, message: '', references: [] })} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 600 }}>无法删除 — {refDialog.message}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>以下业务数据引用了该产品组，请对照处理后重试：</Typography>
          {refDialog.references.map((ref) => (
            <Box key={ref.type} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, color: 'primary.main' }}>
                {ref.type}（共 {ref.count} 条{ref.more > 0 ? `，以下展示前 ${ref.items.length} 条` : ''}）
              </Typography>
              <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, fontSize: '0.8rem' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>编码</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>名称</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ref.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{item.code || '-'}</TableCell>
                      <TableCell>{item.title || '-'}</TableCell>
                      <TableCell><Chip size="small" {...(STATUS_MAP[item.status] || {})} label={STATUS_MAP[item.status]?.label || item.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {ref.more > 0 && <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>还有 {ref.more} 条未展示</Typography>}
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
