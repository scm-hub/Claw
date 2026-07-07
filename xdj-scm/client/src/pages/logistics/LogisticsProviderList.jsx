import { useState, useEffect, Fragment } from 'react';
import {
  Box, Typography, Button, TextField, Grid, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, Select, MenuItem, InputLabel, FormControl, Tooltip,
} from '@mui/material';
import { Add, Edit, Delete, KeyboardArrowDown, KeyboardArrowUp, ToggleOn, ToggleOff, Search, RestartAlt } from '@mui/icons-material';
import { api } from '../../lib/api';

const PROVIDER_TYPES = ['EXPRESS', 'COLD_CHAIN', 'SELF', 'THIRD_PARTY'];
const PROVIDER_TYPE_LABELS = { EXPRESS: '快递', COLD_CHAIN: '冷链', SELF: '自营', THIRD_PARTY: '第三方' };
const VEHICLE_TYPES = ['厢式货车', '冷藏车', '平板车', '罐车', '敞篷车', '保温车', '其他'];

export default function LogisticsProviderList() {
  const [list, setList] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', type: 'EXPRESS', contactPerson: '', contactPhone: '', socialCreditCode: '', serviceArea: '', contractNo: '', _licenseUrl: '' });
  const [licenseFile, setLicenseFile] = useState(null);
  const [createdProviderId, setCreatedProviderId] = useState(null);
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });
  const [confirmClose, setConfirmClose] = useState(false);
  const [formOriginal, setFormOriginal] = useState(null);

  // 车辆相关
  const [expandedId, setExpandedId] = useState(null);
  const [vehicleMap, setVehicleMap] = useState({}); // { [providerId]: Vehicle[] }
  const [vehicleDialog, setVehicleDialog] = useState({ open: false, providerId: null, editId: null });
  const [vehicleForm, setVehicleForm] = useState({ driverName: '', driverPhone: '', plateNo: '', vehicleType: '' });
  const [vehicleConfirmClose, setVehicleConfirmClose] = useState(false);
  const [vehicleFormOriginal, setVehicleFormOriginal] = useState(null);

  // 删除引用详情弹窗
  const [refDialog, setRefDialog] = useState({ open: false, message: '', references: [] });

  // 状态中文化
  const STATUS_MAP = {
    PENDING: '待处理', SHIPPED: '已发货', DELIVERED: '已送达', RETURNED: '已退回', CANCELLED: '已取消',
    CREATED: '已创建', IN_TRANSIT: '运输中', EXCEPTION: '异常',
    PLANNED: '已规划', COMPLETED: '已完成', ACTIVE: '启用', INACTIVE: '停用',
    SETTLED: '已结算',
  };

  // 检查承运商表单是否有未保存的改动
  const hasFormChanges = () => {
    if (!dialogOpen) return false;
    if (createdProviderId) return false; // 创建后阶段无表单编辑
    if (!formOriginal) return true;
    const keys = ['name', 'code', 'type', 'contactPerson', 'contactPhone', 'socialCreditCode', 'serviceArea', 'contractNo'];
    return keys.some(k => String(form[k] ?? '') !== String(formOriginal[k] ?? ''));
  };

  // 检查车辆表单是否有未保存的改动
  const hasVehicleFormChanges = () => {
    if (!vehicleDialog.open) return false;
    if (!vehicleFormOriginal) return true;
    const keys = ['driverName', 'driverPhone', 'plateNo', 'vehicleType'];
    return keys.some(k => String(vehicleForm[k] ?? '') !== String(vehicleFormOriginal[k] ?? ''));
  };

  // 尝试关闭承运商弹窗
  const handleCloseDialog = () => {
    if (hasFormChanges()) {
      setConfirmClose(true);
    } else {
      closeDialog();
    }
  };

  // 尝试关闭车辆弹窗
  const handleCloseVehicleDialog = () => {
    if (hasVehicleFormChanges()) {
      setVehicleConfirmClose(true);
    } else {
      setVehicleDialog({ open: false, providerId: null, editId: null });
      setVehicleFormOriginal(null);
    }
  };

  const loadData = () => {
    const params = {};
    if (keyword) params.keyword = keyword;
    if (filterStatus) params.status = filterStatus;
    if (filterType) params.type = filterType;
    api.get('/logistics/providers', { params }).then((res) => setList(res.data || []));
  };
  useEffect(() => { loadData(); }, []);

  const handleSave = () => {
    if (!form.name) { setSnack({ open: true, msg: '名称必填', sev: 'error' }); return; }
    const { _licenseUrl, ...formData } = form;
    const hasFile = !!licenseFile;
    if (editId) {
      if (hasFile) {
        const fd = new FormData();
        Object.entries(formData).forEach(([k, v]) => fd.append(k, v));
        fd.append('file', licenseFile);
        api.put(`/logistics/providers/${editId}`, fd).then(() => {
          setSnack({ open: true, msg: '更新成功', sev: 'success' }); closeDialog(); loadData();
        });
      } else {
        api.put(`/logistics/providers/${editId}`, formData).then(() => {
          setSnack({ open: true, msg: '更新成功', sev: 'success' }); closeDialog(); loadData();
        });
      }
    } else {
      const postFn = hasFile
        ? api.post('/logistics/providers', fd)
        : api.post('/logistics/providers', formData);
      postFn.then((res) => {
        const newId = res.data?.id;
        setSnack({ open: true, msg: '承运商创建成功，可继续添加车辆', sev: 'success' });
        loadData();
        if (newId) {
          setCreatedProviderId(newId);
          loadVehicles(newId);
        } else {
          closeDialog();
        }
      }).catch((e) => setSnack({ open: true, msg: e.response?.data?.message || '失败', sev: 'error' }));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确认删除该承运商？关联的车辆信息也会一并删除。')) return;
    try {
      await api.delete(`/logistics/providers/${id}`);
      setSnack({ open: true, msg: '已删除', sev: 'success' }); loadData();
    } catch (err) {
      if (err.status === 400 && err.data?.references) {
        setRefDialog({ open: true, message: err.data.message || '该承运商已被业务单据引用，无法删除', references: err.data.references });
      } else {
        setSnack({ open: true, msg: err.message || '删除失败', sev: 'error' });
      }
    }
  };

  const handleToggleStatus = async (row) => {
    const newStatus = row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.put(`/logistics/providers/${row.id}`, { status: newStatus });
      setSnack({ open: true, msg: newStatus === 'ACTIVE' ? '已启用' : '已停用', sev: 'success' }); loadData();
    } catch (err) { setSnack({ open: true, msg: err.message || '操作失败', sev: 'error' }); }
  };

  const closeDialog = () => {
    setDialogOpen(false); setEditId(null); setLicenseFile(null); setCreatedProviderId(null); setFormOriginal(null);
    setForm({ name: '', code: '', type: 'EXPRESS', contactPerson: '', contactPhone: '', socialCreditCode: '', serviceArea: '', contractNo: '', _licenseUrl: '' });
  };

  // ========== 车辆相关 ==========
  const toggleExpand = (providerId) => {
    if (expandedId === providerId) {
      setExpandedId(null);
    } else {
      setExpandedId(providerId);
      if (!vehicleMap[providerId]) loadVehicles(providerId);
    }
  };

  const loadVehicles = (providerId) => {
    api.get(`/logistics/providers/${providerId}/vehicles`).then((res) => {
      setVehicleMap((prev) => ({ ...prev, [providerId]: res.data || [] }));
    });
  };

  const openVehicleDialog = (providerId, vehicle = null) => {
    if (vehicle) {
      const vForm = { driverName: vehicle.driverName, driverPhone: vehicle.driverPhone || '', plateNo: vehicle.plateNo || '', vehicleType: vehicle.vehicleType || '' };
      setVehicleDialog({ open: true, providerId, editId: vehicle.id });
      setVehicleForm(vForm);
      setVehicleFormOriginal(JSON.parse(JSON.stringify(vForm)));
    } else {
      const vForm = { driverName: '', driverPhone: '', plateNo: '', vehicleType: '' };
      setVehicleDialog({ open: true, providerId, editId: null });
      setVehicleForm(vForm);
      setVehicleFormOriginal(JSON.parse(JSON.stringify(vForm)));
    }
  };

  const handleVehicleSave = () => {
    const { driverName, driverPhone } = vehicleForm;
    if (!driverName || !driverPhone) { setSnack({ open: true, msg: '司机姓名和手机号必填', sev: 'error' }); return; }
    const pid = vehicleDialog.providerId;
    if (vehicleDialog.editId) {
      api.put(`/logistics/vehicles/${vehicleDialog.editId}`, vehicleForm).then(() => {
        setSnack({ open: true, msg: '车辆更新成功', sev: 'success' });
        setVehicleDialog({ open: false, providerId: null, editId: null });
        setVehicleFormOriginal(null);
        loadVehicles(pid);
      });
    } else {
      api.post(`/logistics/providers/${pid}/vehicles`, vehicleForm).then(() => {
        setSnack({ open: true, msg: '车辆添加成功', sev: 'success' });
        setVehicleDialog({ open: false, providerId: null, editId: null });
        setVehicleFormOriginal(null);
        loadVehicles(pid);
      });
    }
  };

  const handleVehicleDelete = (providerId, vehicleId) => {
    if (confirm('确认删除该车辆？')) {
      api.delete(`/logistics/vehicles/${vehicleId}`).then(() => {
        setSnack({ open: true, msg: '车辆已删除', sev: 'success' });
        loadVehicles(providerId);
      });
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>承运商管理</Typography>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap">
        <TextField size="small" placeholder="名称/编码" value={keyword} onChange={e => setKeyword(e.target.value)} sx={{ width: 160 }} InputProps={{ startAdornment: <Search fontSize="small" sx={{ mr: 0.5 }} /> }} />
        <TextField size="small" select label="状态" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} sx={{ width: 120 }}>
          <MenuItem value="">全部</MenuItem><MenuItem value="ACTIVE">启用</MenuItem><MenuItem value="INACTIVE">停用</MenuItem>
        </TextField>
        <TextField size="small" select label="类型" value={filterType} onChange={e => setFilterType(e.target.value)} sx={{ width: 120 }}>
          <MenuItem value="">全部</MenuItem>{PROVIDER_TYPES.map(t => <MenuItem key={t} value={t}>{PROVIDER_TYPE_LABELS[t]}</MenuItem>)}
        </TextField>
        <Button variant="contained" size="small" onClick={loadData}>查询</Button>
        <Button variant="outlined" size="small" startIcon={<RestartAlt />} onClick={() => { setKeyword(''); setFilterStatus(''); setFilterType(''); }}>重置</Button>
        <Button variant="outlined" startIcon={<Add />} onClick={() => { const initForm = { name: '', code: '', type: 'EXPRESS', contactPerson: '', contactPhone: '', socialCreditCode: '', serviceArea: '', contractNo: '', _licenseUrl: '' }; setForm(initForm); setFormOriginal(JSON.parse(JSON.stringify(initForm))); setLicenseFile(null); setDialogOpen(true); }}>新增承运商</Button>
        {(keyword || filterStatus || filterType) && (
          <Stack direction="row" spacing={0.5} sx={{ ml: 1 }}>
            {keyword && <Chip label={`关键词: ${keyword}`} size="small" onDelete={() => { setKeyword(''); loadData(); }} />}
            {filterStatus && <Chip label={`状态: ${STATUS_MAP[filterStatus] || filterStatus}`} size="small" onDelete={() => { setFilterStatus(''); loadData(); }} />}
            {filterType && <Chip label={`类型: ${PROVIDER_TYPE_LABELS[filterType] || filterType}`} size="small" onDelete={() => { setFilterType(''); loadData(); }} />}
          </Stack>
        )}
      </Stack>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={{ width: 36 }} />
              <TableCell>编码</TableCell>
              <TableCell>名称</TableCell>
              <TableCell>类型</TableCell>
              <TableCell>法人</TableCell>
              <TableCell>电话</TableCell>
              <TableCell>服务区域</TableCell>
              <TableCell>车辆数</TableCell>
              <TableCell>运单数</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((row) => {
              const isOpen = expandedId === row.id;
              const vehicles = vehicleMap[row.id] || [];
              return (
                <Fragment key={row.id}>
                  <TableRow hover sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }} onClick={() => toggleExpand(row.id)}>
                    <TableCell padding="checkbox" sx={{ width: 36 }}>
                      <IconButton size="small" sx={{ p: 0.5 }}>
                        {isOpen ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                      </IconButton>
                    </TableCell>
                    <TableCell>{row.code || '-'}</TableCell>
                    <TableCell sx={{ fontWeight: isOpen ? 'bold' : 'normal' }}>{row.name}</TableCell>
                    <TableCell><Chip label={PROVIDER_TYPE_LABELS[row.type] || row.type} size="small" variant="outlined" /></TableCell>
                    <TableCell>{row.contactPerson || '-'}</TableCell>
                    <TableCell>{row.contactPhone || '-'}</TableCell>
                    <TableCell>{row.serviceArea || '-'}</TableCell>
                    <TableCell>{vehicles.length || '-'}</TableCell>
                    <TableCell>{row._count?.waybills || 0}</TableCell>
                    <TableCell><Chip label={row.status === 'ACTIVE' ? '启用' : '停用'} size="small" color={row.status === 'ACTIVE' ? 'success' : 'default'} /></TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Button size="small" variant="contained"
                          color={row.status === 'ACTIVE' ? 'warning' : 'success'}
                          onClick={() => handleToggleStatus(row)}
                          sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>
                          {row.status === 'ACTIVE' ? '停用' : '启用'}
                        </Button>
                        <Button size="small" variant="contained" color="primary"
                          onClick={() => { const editForm = { name: row.name, code: row.code || '', type: row.type, contactPerson: row.contactPerson || '', contactPhone: row.contactPhone || '', socialCreditCode: row.socialCreditCode || '', serviceArea: row.serviceArea || '', contractNo: row.contractNo || '', _licenseUrl: row.businessLicenseUrl || '' }; setEditId(row.id); setForm(editForm); setFormOriginal(JSON.parse(JSON.stringify(editForm))); setLicenseFile(null); setDialogOpen(true); }}
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
                  {isOpen && (
                    <TableRow>
                      <TableCell colSpan={11} sx={{ py: 0, bgcolor: 'grey.50' }}>
                        <Box sx={{ py: 2, px: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle2" fontWeight={600}>车辆信息</Typography>
                            <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => openVehicleDialog(row.id)}>添加车辆</Button>
                          </Box>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', bgcolor: 'grey.100' } }}>
                                <TableCell>司机姓名</TableCell>
                                <TableCell>手机号</TableCell>
                                <TableCell>车牌号</TableCell>
                                <TableCell>车型</TableCell>
                                <TableCell>操作</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {vehicles.map((v) => (
                                <TableRow key={v.id}>
                                  <TableCell>{v.driverName}</TableCell>
                                  <TableCell>{v.driverPhone || '-'}</TableCell>
                                  <TableCell>{v.plateNo || '-'}</TableCell>
                                  <TableCell>{v.vehicleType || '-'}</TableCell>
                                  <TableCell>
                                    <Button size="small" onClick={() => openVehicleDialog(row.id, v)}>编辑</Button>
                                    <Button size="small" color="error" onClick={() => handleVehicleDelete(row.id, v.id)}>删除</Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                              {!vehicles.length && (
                                <TableRow><TableCell colSpan={5} align="center"><Typography color="text.secondary" sx={{ py: 1 }}>暂无车辆信息</Typography></TableCell></TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
            {!list.length && <TableRow><TableCell colSpan={11} align="center">暂无数据</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 承运商编辑弹窗 */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{createdProviderId ? '承运商已创建 — 添加车辆' : (editId ? '编辑承运商' : '新增承运商')}</DialogTitle>
        {createdProviderId ? (
          <DialogContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, mt: 0.5 }}>
              <Typography variant="subtitle2" fontWeight={600}>车辆信息</Typography>
              <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => openVehicleDialog(createdProviderId)}>添加车辆</Button>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', bgcolor: 'grey.100' } }}>
                  <TableCell>司机姓名</TableCell>
                  <TableCell>手机号</TableCell>
                  <TableCell>车牌号</TableCell>
                  <TableCell>车型</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(vehicleMap[createdProviderId] || []).map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{v.driverName}</TableCell>
                    <TableCell>{v.driverPhone || '-'}</TableCell>
                    <TableCell>{v.plateNo || '-'}</TableCell>
                    <TableCell>{v.vehicleType || '-'}</TableCell>
                    <TableCell>
                      <Button size="small" onClick={() => openVehicleDialog(createdProviderId, v)}>编辑</Button>
                      <Button size="small" color="error" onClick={() => handleVehicleDelete(createdProviderId, v.id)}>删除</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!(vehicleMap[createdProviderId] || []).length && (
                  <TableRow><TableCell colSpan={5} align="center"><Typography color="text.secondary" sx={{ py: 1 }}>暂无车辆信息，点击右上方添加</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </DialogContent>
        ) : (
        <DialogContent><Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={6}><TextField label="公司名称" fullWidth size="small" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Grid>
          {editId && <Grid item xs={6}><TextField label="编码" fullWidth size="small" value={form.code} InputProps={{ readOnly: true }} sx={{ '& .MuiInputBase-input': { color: 'text.secondary' } }} /></Grid>}
          <Grid item xs={6}>
            <FormControl fullWidth size="small"><InputLabel>类型</InputLabel>
              <Select value={form.type} label="类型" onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {PROVIDER_TYPES.map(t => <MenuItem key={t} value={t}>{PROVIDER_TYPE_LABELS[t]}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}><TextField label="法人" fullWidth size="small" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></Grid>
          <Grid item xs={6}><TextField label="电话" fullWidth size="small" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} /></Grid>
          <Grid item xs={6}><TextField label="统一信用代码" fullWidth size="small" value={form.socialCreditCode} onChange={(e) => setForm({ ...form, socialCreditCode: e.target.value })} /></Grid>
          <Grid item xs={6}><TextField label="服务区域" fullWidth size="small" value={form.serviceArea} onChange={(e) => setForm({ ...form, serviceArea: e.target.value })} /></Grid>
          <Grid item xs={12}><TextField label="合同编号" fullWidth size="small" value={form.contractNo} onChange={(e) => setForm({ ...form, contractNo: e.target.value })} /></Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="outlined" size="small" component="label" startIcon={<Add />}>
                上传营业执照
                <input type="file" hidden accept="image/*" onChange={(e) => { const f = e.target.files[0]; if (f) setLicenseFile(f); }} />
              </Button>
              {licenseFile && <Typography variant="caption" color="primary">{licenseFile.name}</Typography>}
              {!licenseFile && editId && form._licenseUrl && <Typography variant="caption" color="text.secondary">已上传</Typography>}
            </Box>
          </Grid>
        </Grid></DialogContent>
        )}
        <DialogActions>
          <Button onClick={handleCloseDialog}>{createdProviderId ? '完成' : '取消'}</Button>
          {!createdProviderId && <Button variant="contained" onClick={handleSave}>保存</Button>}
        </DialogActions>
      </Dialog>

      {/* 车辆编辑弹窗 */}
      <Dialog open={vehicleDialog.open} onClose={handleCloseVehicleDialog} maxWidth="xs" fullWidth>
        <DialogTitle>{vehicleDialog.editId ? '编辑车辆' : '添加车辆'}</DialogTitle>
        <DialogContent><Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}><TextField label="司机姓名" fullWidth size="small" required value={vehicleForm.driverName} onChange={(e) => setVehicleForm({ ...vehicleForm, driverName: e.target.value })} /></Grid>
          <Grid item xs={12}><TextField label="手机号" fullWidth size="small" required value={vehicleForm.driverPhone} onChange={(e) => setVehicleForm({ ...vehicleForm, driverPhone: e.target.value })} /></Grid>
          <Grid item xs={12}><TextField label="车牌号" fullWidth size="small" placeholder="如：浙A12345" value={vehicleForm.plateNo} onChange={(e) => setVehicleForm({ ...vehicleForm, plateNo: e.target.value })} /></Grid>
          <Grid item xs={12}><TextField label="车型" fullWidth size="small" placeholder="如：厢式货车" value={vehicleForm.vehicleType} onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleType: e.target.value })} /></Grid>
        </Grid></DialogContent>
        <DialogActions><Button onClick={handleCloseVehicleDialog}>取消</Button><Button variant="contained" onClick={handleVehicleSave}>保存</Button></DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}><Alert severity={snack.sev}>{snack.msg}</Alert></Snackbar>

      {/* ===== 承运商关闭确认弹窗 ===== */}
      <Dialog open={confirmClose} onClose={() => setConfirmClose(false)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 600 }}>未保存的更改</DialogTitle>
        <DialogContent>
          <Typography>您有尚未保存的更改，确定要关闭吗？关闭后所有更改将丢失。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClose(false)}>继续编辑</Button>
          <Button onClick={() => { setConfirmClose(false); closeDialog(); }} color="error" variant="contained">放弃更改</Button>
        </DialogActions>
      </Dialog>

      {/* ===== 车辆关闭确认弹窗 ===== */}
      <Dialog open={vehicleConfirmClose} onClose={() => setVehicleConfirmClose(false)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 600 }}>未保存的更改</DialogTitle>
        <DialogContent>
          <Typography>您有尚未保存的更改，确定要关闭吗？关闭后所有更改将丢失。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVehicleConfirmClose(false)}>继续编辑</Button>
          <Button onClick={() => { setVehicleConfirmClose(false); setVehicleDialog({ open: false, providerId: null, editId: null }); setVehicleFormOriginal(null); }} color="error" variant="contained">放弃更改</Button>
        </DialogActions>
      </Dialog>

      {/* ===== 删除引用详情弹窗 ===== */}
      <Dialog open={refDialog.open} onClose={() => setRefDialog({ open: false, message: '', references: [] })} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 600 }}>
          无法删除 — {refDialog.message}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            以下业务单据引用了该承运商，请对照处理后重试：
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
                      <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ref.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.code || '-'}</TableCell>
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
    </Box>
  );
}
