import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, InputAdornment, CircularProgress,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Divider, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Button, MenuItem, Alert,
} from '@mui/material';
import { Search, ChevronRight, Add, Send, Delete } from '@mui/icons-material';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';

const STATUS_LABELS = { DRAFT: '草稿', PENDING: '待审批', APPROVED: '已批准', REJECTED: '已驳回', ACTIVE: '执行中' };
const STATUS_COLORS = { DRAFT: 'default', PENDING: 'warning', APPROVED: 'success', REJECTED: 'error', ACTIVE: 'success' };
const TYPE_LABELS = { WEEKLY: '周计划', MONTHLY: '月计划', QUARTERLY: '季度计划', YEARLY: '年计划' };

function getWeekOfMonth(date = new Date()) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfWeek = firstDay.getDay() || 7;
  const offset = dayOfWeek - 1;
  return Math.ceil((date.getDate() + offset) / 7);
}

function genTitle(userName, planType) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const typeLabel = TYPE_LABELS[planType] || planType;
  let period;
  switch (planType) {
    case 'WEEKLY': period = `${y}年${m}月第${getWeekOfMonth(now)}周`; break;
    case 'MONTHLY': period = `${y}年${m}月`; break;
    case 'QUARTERLY': period = `${y}年Q${Math.floor(m / 3) + 1}`; break;
    case 'YEARLY': period = `${y}年`; break;
    default: period = `${y}年${m}月`;
  }
  return `${userName}-${period}-${typeLabel}`;
}

export default function SalesPlans() {
  const user = useAuthStore(s => s.user);
  const submitterName = user?.employee?.name || user?.username || '-';
  const userDeptName = user?.employee?.department?.name || '';

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [detail, setDetail] = useState(null);
  const [createDialog, setCreateDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [options, setOptions] = useState({ materials: [], customers: [] });
  const [form, setForm] = useState({ title: '', planType: 'WEEKLY', items: [] });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: 1, pageSize: 50 });
      if (keyword) params.set('keyword', keyword);
      if (status) params.set('status', status);
      const res = await api.get(`/sales/plans?${params}`);
      setList(res.data?.list || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [keyword, status]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadOptions = async () => {
    try {
      const [mRes, cRes] = await Promise.all([
        api.get('/master/materials?pageSize=100'),
        api.get('/master/customers?pageSize=100'),
      ]);
      setOptions({
        materials: mRes.data?.list || [],
        customers: cRes.data?.list || [],
      });
    } catch (e) { console.error(e); }
  };

  const handleViewDetail = async (id) => {
    try {
      const res = await api.get(`/sales/plans/${id}`);
      setDetail(res.data);
    } catch (e) { alert(e.message); }
  };

  const handleOpenCreate = async () => {
    await loadOptions();
    const defaultType = 'WEEKLY';
    setForm({
      title: genTitle(submitterName, defaultType),
      planType: defaultType,
      items: [{ customerId: '', materialId: '', planQty: 1, deliveryDate: '', remark: '' }],
    });
    setCreateDialog(true);
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { customerId: '', materialId: '', planQty: 1, deliveryDate: '', remark: '' }] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  const updateItem = (idx, field, value) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    setForm({ ...form, items });
  };

  const handlePlanTypeChange = (newType) => {
    setForm({ ...form, planType: newType, title: genTitle(submitterName, newType) });
  };

  const handleCreate = async () => {
    if (!form.title) { alert('标题不能为空'); return; }
    const validItems = form.items.filter(it => it.customerId && it.materialId);
    if (validItems.length === 0) { alert('至少添加一条有效的明细（客户+产品）'); return; }
    try {
      setSubmitting(true);
      await api.post('/sales/plans', {
        title: form.title,
        planType: form.planType,
        departmentId: user?.employee?.departmentId || null,
        items: validItems.map(it => ({
          customerId: it.customerId,
          materialId: it.materialId,
          planQty: Number(it.planQty) || 0,
          deliveryDate: it.deliveryDate || null,
          remark: it.remark || null,
        })),
      });
      setCreateDialog(false);
      loadData();
      alert('计划创建成功，记得提交审批');
    } catch (e) { alert(e.response?.data?.message || e.message); }
    setSubmitting(false);
  };

  const handleSubmit = async (id) => {
    try {
      await api.put(`/sales/plans/${id}/submit`);
      setDetail(null);
      loadData();
      alert('已提交审批');
    } catch (e) { alert(e.message); }
  };

  const summary = list.reduce((acc, p) => {
    acc.totalItems += p._count?.items || 0;
    acc.totalOrders += p._count?.salesOrders || 0;
    if (p.status === 'APPROVED' || p.status === 'ACTIVE') acc.activePlans++;
    if (p.status === 'DRAFT') acc.draftPlans++;
    return acc;
  }, { totalItems: 0, totalOrders: 0, activePlans: 0, draftPlans: 0 });

  return (
    <Box sx={{ p: 2, pb: 8 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>销售计划</Typography>
        <Button variant="contained" size="small" startIcon={<Add />} onClick={handleOpenCreate}>报计划</Button>
      </Box>

      {/* 汇总卡片 */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
        <Card sx={{ flex: 1, bgcolor: 'primary.light' }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" color="textSecondary">明细总数</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.dark' }}>{summary.totalItems}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, bgcolor: 'success.light' }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" color="textSecondary">执行中</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.dark' }}>{summary.activePlans}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, bgcolor: 'warning.light' }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" color="textSecondary">草稿</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'warning.dark' }}>{summary.draftPlans}</Typography>
          </CardContent>
        </Card>
      </Box>

      <TextField
        fullWidth size="small" placeholder="搜索计划编号/标题"
        value={keyword} onChange={(e) => setKeyword(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
        sx={{ mb: 1 }}
      />

      <Box sx={{ display: 'flex', gap: 1, mb: 2, overflowX: 'auto' }}>
        <Chip label="全部" onClick={() => setStatus('')} color={status === '' ? 'primary' : 'default'} size="small" />
        {Object.entries(STATUS_LABELS).map(([k, v]) => (
          <Chip key={k} label={v} onClick={() => setStatus(k)} color={status === k ? 'primary' : 'default'} size="small" />
        ))}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : list.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="textSecondary" sx={{ mb: 2 }}>暂无数据</Typography>
          <Button variant="outlined" startIcon={<Add />} onClick={handleOpenCreate}>报个计划</Button>
        </Box>
      ) : (
        list.map((plan) => (
          <Card key={plan.id} sx={{ mb: 1.5, cursor: 'pointer' }} onClick={() => handleViewDetail(plan.id)}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{plan.title}</Typography>
                  <Typography variant="caption" color="textSecondary">{plan.planNo}</Typography>
                  <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    <Chip label={TYPE_LABELS[plan.planType] || plan.planType} size="small" variant="outlined" />
                    <Chip label={STATUS_LABELS[plan.status] || plan.status} color={STATUS_COLORS[plan.status]} size="small" />
                  </Box>
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="body2" color="textSecondary">
                      提报人: {plan.salesRep?.name || '-'} | 明细: {plan._count?.items || 0} 条
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {plan.periodStart?.slice(0, 10)} ~ {plan.periodEnd?.slice(0, 10)}
                    </Typography>
                  </Box>
                </Box>
                <ChevronRight color="action" />
              </Box>
            </CardContent>
          </Card>
        ))
      )}

      {/* 详情弹窗 */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} fullWidth maxWidth="sm">
        {detail && (
          <>
            <DialogTitle>{detail.title}</DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 2 }}>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">计划编号</Typography>
                    <Typography variant="body1">{detail.planNo}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">状态</Typography>
                    <Chip label={STATUS_LABELS[detail.status]} color={STATUS_COLORS[detail.status]} size="small" />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">类型</Typography>
                    <Typography variant="body1">{TYPE_LABELS[detail.planType] || detail.planType}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">提报人</Typography>
                    <Typography variant="body1">{detail.salesRep?.name || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">部门</Typography>
                    <Typography variant="body1">{detail.department?.name || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">周期</Typography>
                    <Typography variant="body2">{detail.periodStart?.slice(0, 10)} ~ {detail.periodEnd?.slice(0, 10)}</Typography>
                  </Grid>
                  {detail.remark && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="textSecondary">备注</Typography>
                      <Typography variant="body2">{detail.remark}</Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>计划明细</Typography>
              {detail.items?.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>客户</TableCell>
                        <TableCell>产品</TableCell>
                        <TableCell align="right">计划量</TableCell>
                        <TableCell>发货</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detail.items.map((it) => (
                        <TableRow key={it.id}>
                          <TableCell>{it.customer?.name || '-'}</TableCell>
                          <TableCell>{it.material?.name}</TableCell>
                          <TableCell align="right">{it.planQty} {it.material?.unit}</TableCell>
                          <TableCell>{it.deliveryDate ? new Date(it.deliveryDate).toISOString().slice(0, 10) : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="textSecondary">暂无明细</Typography>
              )}
            </DialogContent>
            <DialogActions>
              {detail.status === 'DRAFT' && (
                <Button onClick={() => handleSubmit(detail.id)} color="primary" variant="contained" startIcon={<Send />}>
                  提交审批
                </Button>
              )}
              <Button onClick={() => setDetail(null)}>关闭</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* 新建计划弹窗 */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>报计划</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
            针对每个客户、多种产品提报计划数量
          </Alert>
          <TextField
            fullWidth label="标题" size="small" sx={{ mb: 2 }}
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
          />
          <TextField
            fullWidth select label="计划类型" size="small" sx={{ mb: 2 }}
            value={form.planType}
            onChange={e => handlePlanTypeChange(e.target.value)}
          >
            <MenuItem value="WEEKLY">周计划</MenuItem>
            <MenuItem value="MONTHLY">月计划</MenuItem>
            <MenuItem value="QUARTERLY">季度计划</MenuItem>
            <MenuItem value="YEARLY">年计划</MenuItem>
          </TextField>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth label="提报人" size="small"
              value={submitterName} disabled
              helperText="自动填充"
            />
            <TextField
              fullWidth label="部门" size="small"
              value={userDeptName} disabled
              helperText="自动填充"
            />
          </Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>计划明细</Typography>
          {form.items.map((it, idx) => {
            const selectedMaterial = options.materials.find(m => m.id === it.materialId);
            return (
              <Box key={idx} sx={{ mb: 2, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, position: 'relative' }}>
                {form.items.length > 1 && (
                  <IconButton
                    size="small" color="error"
                    sx={{ position: 'absolute', top: 4, right: 4 }}
                    onClick={() => removeItem(idx)}
                  ><Delete fontSize="small" /></IconButton>
                )}
                <TextField
                  fullWidth select label="客户" size="small" sx={{ mb: 1 }}
                  value={it.customerId}
                  onChange={e => updateItem(idx, 'customerId', e.target.value)}
                >
                  <MenuItem value="">选择客户</MenuItem>
                  {options.customers.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </TextField>
                <TextField
                  fullWidth select label="产品" size="small" sx={{ mb: 1 }}
                  value={it.materialId}
                  onChange={e => updateItem(idx, 'materialId', e.target.value)}
                >
                  <MenuItem value="">选择产品</MenuItem>
                  {options.materials.map(m => (
                    <MenuItem key={m.id} value={m.id}>{m.name} ({m.code})</MenuItem>
                  ))}
                </TextField>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    label={`计划数量${selectedMaterial?.unit ? '(' + selectedMaterial.unit + ')' : ''}`} type="number" size="small" sx={{ flex: 1 }}
                    value={it.planQty}
                    onChange={e => updateItem(idx, 'planQty', e.target.value)}
                  />
                  <TextField
                    label="发货时间" type="date" size="small" sx={{ flex: 1 }}
                    value={it.deliveryDate}
                    onChange={e => updateItem(idx, 'deliveryDate', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
              </Box>
            );
          })}
          <Button startIcon={<Add />} onClick={addItem} size="small" variant="outlined" fullWidth>
            添加一行
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>取消</Button>
          <Button onClick={handleCreate} variant="contained" disabled={submitting} startIcon={<Send />}>
            {submitting ? '提交中...' : '创建计划'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
