import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Tooltip, Stack,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Work as WorkIcon, Sync as SyncIcon,
  ToggleOn as ToggleOnIcon, ToggleOff as ToggleOffIcon,
} from '@mui/icons-material';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import api from '../../hooks/useFetch';
import useCanEdit from '../../hooks/useCanEdit';

/* ========= 岗位表单弹窗 ========= */
function PositionFormDialog({ open, editing, departments, onClose, onSave }) {
  const initialValues = editing
    ? {
        name: editing.name || '', code: editing.code || '', departmentId: editing.departmentId || '',
        level: editing.level || '', minSalary: editing.minSalary?.toString() || '',
        maxSalary: editing.maxSalary?.toString() || '', description: editing.description || '',
        isActive: editing.isActive !== false,
      }
    : { name: '', code: '', departmentId: '', level: '', minSalary: '', maxSalary: '', description: '', isActive: true };

  const [form, setForm] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialValues);

  useEffect(() => {
    if (open) {
      const init = editing
        ? {
            name: editing.name || '', code: editing.code || '', departmentId: editing.departmentId || '',
            level: editing.level || '', minSalary: editing.minSalary?.toString() || '',
            maxSalary: editing.maxSalary?.toString() || '', description: editing.description || '',
            isActive: editing.isActive !== false,
          }
        : { name: '', code: '', departmentId: '', level: '', minSalary: '', maxSalary: '', description: '', isActive: true };
      setForm(init);
      setError('');
    }
  }, [open, editing]);

  const handleRequestClose = () => {
    if (isDirty) {
      setDiscardOpen(true);
    } else {
      onClose();
    }
  };

  const handleDiscardConfirm = () => {
    setDiscardOpen(false);
    onClose();
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.name.trim()) {
      setError('岗位名称不能为空');
      return;
    }
    if (editing && !form.code.trim()) {
      setError('岗位编码不能为空');
      return;
    }
    setSaving(true);
    try {
    const payload = {
      name: form.name.trim(),
      departmentId: form.departmentId || null,
      level: form.level || '',
      minSalary: form.minSalary ? parseFloat(form.minSalary) : 0,
      maxSalary: form.maxSalary ? parseFloat(form.maxSalary) : 0,
      description: form.description || '',
      isActive: form.isActive,
    };
    if (editing) {
      payload.code = form.code.trim();
      await api.put(`/positions/${editing.id}`, payload);
    } else {
      await api.post('/positions', payload);
    }
      onSave();
    } catch (err) {
      setError(err.message || '操作失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Dialog open={open} onClose={handleRequestClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editing ? '编辑岗位' : '新建岗位'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          fullWidth label="岗位名称" margin="normal" required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="如：软件工程师"
        />
        {editing && (
          <TextField
            fullWidth label="岗位编码" margin="normal"
            value={form.code}
            slotProps={{ input: { readOnly: true } }}
            helperText="编码由系统自动生成，不可修改"
          />
        )}
        <TextField
          fullWidth select label="所属部门" margin="normal"
          value={form.departmentId}
          onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
        >
          <MenuItem value="">无（通用岗位）</MenuItem>
          {departments.map((d) => (
            <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
          ))}
        </TextField>
        <TextField
          fullWidth select label="职级" margin="normal"
          value={form.level}
          onChange={(e) => setForm({ ...form, level: e.target.value })}
        >
          <MenuItem value="">无</MenuItem>
          <MenuItem value="员工">员工</MenuItem>
          <MenuItem value="基层">基层</MenuItem>
          <MenuItem value="中层">中层</MenuItem>
          <MenuItem value="高层">高层</MenuItem>
        </TextField>
        <Stack direction="row" spacing={2}>
          <TextField
            label="最低薪资" margin="normal" type="number"
            value={form.minSalary}
            onChange={(e) => setForm({ ...form, minSalary: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1 }}
          />
          <TextField
            label="最高薪资" margin="normal" type="number"
            value={form.maxSalary}
            onChange={(e) => setForm({ ...form, maxSalary: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: 1 }}
          />
        </Stack>
        <TextField
          fullWidth label="岗位描述" margin="normal" multiline rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="岗位主要职责和要求"
        />
        <TextField
          fullWidth select label="状态" margin="normal"
          value={form.isActive ? 'true' : 'false'}
          onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
        >
          <MenuItem value="true">启用</MenuItem>
          <MenuItem value="false">停用</MenuItem>
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleRequestClose}>取消</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={20} /> : (editing ? '保存' : '创建')}
        </Button>
      </DialogActions>
    </Dialog>
      {/* 丢弃修改确认 */}
      <ConfirmDialog
        open={discardOpen}
        title="未保存的修改"
        content="当前岗位信息已修改但未保存，是否丢弃修改？"
        confirmText="丢弃"
        confirmColor="warning"
        onClose={() => setDiscardOpen(false)}
        onConfirm={handleDiscardConfirm}
      />
    </>
  );
}

/* ========= 主页面 ========= */
export default function PositionList() {
  const canEdit = useCanEdit();
  const [positions, setPositions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deletingFlag, setDeletingFlag] = useState(false);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [togglingFlag, setTogglingFlag] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [posRes, deptRes] = await Promise.all([
        api.get('/positions'),
        api.get('/departments/flat'),
      ]);
      setPositions(posRes.data || []);
      setDepartments(deptRes.data || []);
    } catch (err) {
      setError(err.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSyncFromEmployees = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await api.post('/positions/sync-from-employees');
      setSyncResult(res.data);
      loadData();
    } catch (err) {
      setError(err.message || '同步失败');
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = () => {
    setFormOpen(false);
    setEditing(null);
    loadData();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeletingFlag(true);
    try {
      await api.delete(`/positions/${deleting.id}`);
      setConfirmOpen(false);
      setDeleting(null);
      loadData();
    } catch (err) {
      setError(err.message || '删除失败');
    } finally {
      setDeletingFlag(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!toggleTarget) return;
    setTogglingFlag(true);
    try {
      await api.patch(`/positions/${toggleTarget.id}/toggle-status`);
      setToggleTarget(null);
      loadData();
    } catch (err) {
      setError(err.message || (toggleTarget.isActive ? '停用失败' : '启用失败'));
    } finally {
      setTogglingFlag(false);
    }
  };

  const getDeptName = (deptId) => {
    if (!deptId) return '-';
    const d = departments.find((item) => item.id === deptId);
    return d ? d.name : '-';
  };

  return (
    <Box>
      <PageHeader
        title="岗位管理"
        subtitle="管理系统中的所有岗位信息"
        action={
          <Stack direction="row" spacing={1}>
            {canEdit && (
              <Button
                variant="outlined"
                startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
                onClick={handleSyncFromEmployees}
                disabled={syncing}
              >
                {syncing ? '同步中...' : '从员工同步'}
              </Button>
            )}
            {canEdit && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setFormOpen(true); }}>
                新建岗位
              </Button>
            )}
          </Stack>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {syncResult && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSyncResult(null)}>
          同步完成：新建 {syncResult.created} 个岗位，关联 {syncResult.linked} 名员工
          {syncResult.skipped > 0 && `，${syncResult.skipped} 名已关联跳过`}
          {syncResult.details?.length > 0 && (
            <Box component="ul" sx={{ m: 0, pl: 2, mt: 0.5 }}>
              {syncResult.details.map((d, i) => (
                <li key={i}>{d.positionName} — {d.employeeCount} 名员工（{d.action === 'created' ? '新建' : '已存在'}）</li>
              ))}
            </Box>
          )}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>岗位名称</TableCell>
                <TableCell>编码</TableCell>
                <TableCell>所属部门</TableCell>
                <TableCell>职级</TableCell>
                <TableCell>薪资范围</TableCell>
                <TableCell>状态</TableCell>
                <TableCell align="right">员工数</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {positions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    暂无岗位数据，点击「新建岗位」添加
                  </TableCell>
                </TableRow>
              ) : (
                positions.map((pos) => (
                  <TableRow key={pos.id} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <WorkIcon fontSize="small" color="action" />
                        <Typography fontWeight={500}>{pos.name}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell><Chip label={pos.code} size="small" variant="outlined" /></TableCell>
                    <TableCell>{getDeptName(pos.departmentId)}</TableCell>
                    <TableCell>{pos.level || '-'}</TableCell>
                    <TableCell>
                      {pos.minSalary || pos.maxSalary
                        ? `¥${pos.minSalary || 0} - ¥${pos.maxSalary || 0}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={pos.isActive ? '启用' : '停用'}
                        color={pos.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">{pos.employeeCount || 0}</TableCell>
                    <TableCell align="center">
                      {canEdit && (
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title={pos.isActive ? '停用' : '启用'}>
                            <IconButton
                              size="small"
                              color={pos.isActive ? 'warning' : 'success'}
                              onClick={() => setToggleTarget(pos)}
                            >
                              {pos.isActive
                                ? <ToggleOffIcon fontSize="small" />
                                : <ToggleOnIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="编辑">
                            <IconButton size="small" onClick={() => { setEditing(pos); setFormOpen(true); }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="删除">
                            <IconButton size="small" color="error" onClick={() => { setDeleting(pos); setConfirmOpen(true); }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 新建/编辑弹窗 */}
      <PositionFormDialog
        open={formOpen}
        editing={editing}
        departments={departments}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSave={handleSave}
      />

      {/* 删除确认 */}
      <ConfirmDialog
        open={confirmOpen}
        title="删除岗位"
        content={`确定要删除岗位「${deleting?.name}」吗？此操作不可撤销。`}
        confirmText="删除"
        confirmColor="error"
        loading={deletingFlag}
        onClose={() => { setConfirmOpen(false); setDeleting(null); }}
        onConfirm={handleDelete}
      />

      {/* 停用/启用确认 */}
      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.isActive ? '停用岗位' : '启用岗位'}
        content={
          toggleTarget?.isActive
            ? `确定要停用岗位「${toggleTarget?.name}」吗？停用后该岗位将不可用于员工分配。`
            : `确定要启用岗位「${toggleTarget?.name}」吗？启用后该岗位可用于员工分配。`
        }
        confirmText={toggleTarget?.isActive ? '停用' : '启用'}
        confirmColor={toggleTarget?.isActive ? 'warning' : 'success'}
        loading={togglingFlag}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggleStatus}
      />
    </Box>
  );
}
