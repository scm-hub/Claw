import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Tooltip, Stack, Collapse, Autocomplete,
  Divider, alpha, Avatar,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  ExpandMore as ExpandIcon, ExpandLess as CollapseIcon,
  AccountTree as TreeIcon, Group as GroupIcon,
  FileDownload as ExportIcon, FileUpload as ImportIcon,
  ArrowUpward as UpIcon, ArrowDownward as DownIcon,
  Business as BusinessIcon, Domain as DomainIcon,
  AdminPanelSettings as ManagerIcon, Apartment as DeptIcon,
} from '@mui/icons-material';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import api from '../../hooks/useFetch';
import useAuthStore from '../../store/authStore';
import useCanEdit from '../../hooks/useCanEdit';

/** 判断当前用户是否有部门排序权限（仅超级管理员与HR管理员） */
function canReorder(user) {
  return user && (user.role === 'SUPER_ADMIN' || user.role === 'HR_ADMIN');
}

/** 树形层级颜色 */
const depthColors = ['#1976d2', '#7b1fa2', '#00695c', '#e65100', '#c62828', '#4527a0'];

/* ========= 部门表单弹窗 ========= */
function DepartmentFormDialog({ open, editing, departments, employees, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', parentId: '', managerId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          name: editing.name || '',
          parentId: editing.parentId || '',
          managerId: editing.managerId || '',
        });
      } else {
        setForm({ name: '', parentId: '', managerId: '' });
      }
      setError('');
    }
  }, [open, editing]);

  const handleSubmit = async () => {
    setError('');
    if (!form.name.trim()) { setError('部门名称不能为空'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/departments/${editing.id}`, {
          name: form.name.trim(), parentId: form.parentId || null, managerId: form.managerId || null,
        });
      } else {
        await api.post('/departments', {
          name: form.name.trim(), parentId: form.parentId || null, managerId: form.managerId || null,
        });
      }
      onSave();
    } catch (err) {
      setError(err.message || '操作失败');
    } finally { setSaving(false); }
  };

  const parentOptions = editing ? departments.filter((d) => d.id !== editing.id) : departments;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', py: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 36, height: 36 }}>
            {editing ? <EditIcon fontSize="small" /> : <AddIcon fontSize="small" />}
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontSize: '1.05rem' }}>{editing ? '编辑部门' : '新建部门'}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>{editing ? `正在修改「${editing.name}」` : '创建一个新的部门节点'}</Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ pt: '24px !important' }}>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
        <TextField
          fullWidth label="部门名称" margin="normal" required size="small"
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="如：技术部、产品部"
        />
        <TextField
          fullWidth select label="上级部门" margin="normal" size="small"
          value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}
        >
          <MenuItem value=""><em>无（顶层部门）</em></MenuItem>
          {parentOptions.map((d) => (
            <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
          ))}
        </TextField>
        <Autocomplete
          options={employees}
          getOptionLabel={(emp) => {
            if (typeof emp === 'string') return emp;
            const posName = emp.position?.name || emp.positionTitle || '';
            return `${emp.name}（${emp.employeeNo}）${posName ? ` - ${posName}` : ''}`;
          }}
          value={employees.find((e) => e.id === form.managerId) || null}
          onChange={(e, newValue) => setForm({ ...form, managerId: newValue ? newValue.id : '' })}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          filterOptions={(options, { inputValue }) => {
            const keyword = inputValue.trim().toLowerCase();
            if (!keyword) return options;
            return options.filter((emp) => {
              const name = (emp.name || '').toLowerCase();
              const no = (emp.employeeNo || '').toLowerCase();
              const pos = (emp.position?.name || emp.positionTitle || '').toLowerCase();
              const dept = (emp.department?.name || '').toLowerCase();
              return name.includes(keyword) || no.includes(keyword) || pos.includes(keyword) || dept.includes(keyword);
            });
          }}
          renderInput={(params) => (
            <TextField {...params} label="部门负责人" margin="normal" placeholder="搜索姓名/工号/岗位...（可选，可后续指定）" size="small" />
          )}
          renderOption={(props, emp) => {
            const { key, ...rest } = props;
            const posName = emp.position?.name || emp.positionTitle || '';
            return (
              <li key={key} {...rest}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="body2">{emp.name}（{emp.employeeNo}）{posName ? ` - ${posName}` : ''}</Typography>
                  {emp.department?.name && <Typography variant="caption" color="text.secondary">{emp.department.name}</Typography>}
                </Box>
              </li>
            );
          }}
          noOptionsText="未找到匹配员工"
          fullWidth freeSolo={false} clearOnEscape
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2, borderColor: alpha('#667eea', 0.3), color: 'text.secondary', '&:hover': { borderColor: '#667eea', bgcolor: alpha('#667eea', 0.04) } }}>取消</Button>
        <Button
          variant="contained" onClick={handleSubmit} disabled={saving}
          sx={{
            borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 600,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: '0 3px 12px rgba(102,126,234,0.35)',
            '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a3f93 100%)', boxShadow: '0 5px 20px rgba(102,126,234,0.45)' },
            '&:disabled': { background: alpha('#667eea', 0.3), color: 'white' },
          }}
        >
          {saving ? <CircularProgress size={20} color="inherit" /> : editing ? '保存修改' : '创建部门'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ========= 部门导入弹窗 ========= */
function DepartmentImportDialog({ open, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setFile(null); setResult(null); setError(''); }
  }, [open]);

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/departments/import-template', { responseType: 'blob' });
      const blob = response.data || response;
      const blobUrl = window.URL.createObjectURL(new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a');
      link.href = blobUrl; link.download = '部门导入模板.xlsx';
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError('下载模板失败：' + (err.message || '未知错误'));
    }
  };

  const handleImport = async () => {
    if (!file) { setError('请先选择Excel文件'); return; }
    setImporting(true); setError(''); setResult(null);
    try {
      const formData = new FormData(); formData.append('file', file);
      const res = await api.post('/departments/import', formData);
      setResult(res.data);
    } catch (err) {
      setError(err.message || '导入失败');
    } finally { setImporting(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', py: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 36, height: 36 }}><ImportIcon fontSize="small" /></Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontSize: '1.05rem' }}>导入部门</Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>批量导入部门组织结构</Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
        {!result ? (
          <>
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2, bgcolor: alpha('#1976d2', 0.04) }}>
              请按模板格式填写部门信息后上传。上级部门名称必须与系统中已有部门名称一致，负责人姓名须为在职员工。
            </Alert>
            <Box sx={{ mb: 2, textAlign: 'center' }}>
              <Button size="small" variant="outlined" onClick={handleDownloadTemplate} startIcon={<ImportIcon />}
                sx={{
                  borderRadius: 2, textTransform: 'none', fontWeight: 500,
                  borderColor: alpha('#667eea', 0.35), color: '#667eea',
                  '&:hover': { borderColor: '#667eea', bgcolor: alpha('#667eea', 0.06) },
                }}>
                下载导入模板
              </Button>
            </Box>
            <Box
              sx={{
                border: '2px dashed', borderColor: file ? 'success.main' : alpha('#667eea', 0.4),
                borderRadius: 3, p: 4, textAlign: 'center', cursor: 'pointer',
                bgcolor: file ? alpha('#2e7d32', 0.04) : alpha('#667eea', 0.02),
                transition: 'all 0.2s',
                '&:hover': { borderColor: '#667eea', bgcolor: alpha('#667eea', 0.06) },
              }}
              onClick={() => document.getElementById('dept-import-file').click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault(); const dropped = e.dataTransfer.files[0];
                if (dropped && (dropped.name.endsWith('.xlsx') || dropped.name.endsWith('.xls'))) {
                  setFile(dropped); setError('');
                } else { setError('请上传 .xlsx 或 .xls 文件'); }
              }}
            >
              <input id="dept-import-file" type="file" accept=".xlsx,.xls" hidden
                onChange={(e) => { setFile(e.target.files[0] || null); setError(''); }} />
              {file ? (
                <Box>
                  <Typography variant="body1" color="success.main" fontWeight="bold">📎 {file.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{(file.size / 1024).toFixed(1)} KB</Typography>
                </Box>
              ) : (
                <Box>
                  <ImportIcon sx={{ fontSize: 48, color: alpha('#667eea', 0.4), mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">点击选择文件或拖拽 Excel 文件到此处</Typography>
                  <Typography variant="caption" color="text.secondary">支持 .xlsx / .xls 格式</Typography>
                </Box>
              )}
            </Box>
          </>
        ) : (
          <Box>
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
              导入完成！共处理 {result.total} 条，成功创建 {result.created} 个部门，跳过 {result.skipped} 条
            </Alert>
            {result.errors && result.errors.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle2" color="error.main" sx={{ mb: 0.5 }}>⚠️ 错误详情：</Typography>
                <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto', p: 1.5, borderRadius: 2, bgcolor: alpha('#d32f2f', 0.02) }}>
                  {result.errors.map((err, idx) => (
                    <Typography key={idx} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>• {err}</Typography>
                  ))}
                </Paper>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {!result ? (
          <>
            <Button onClick={onClose} variant="outlined"
              sx={{ borderRadius: 2, borderColor: alpha('#667eea', 0.3), color: 'text.secondary', '&:hover': { borderColor: '#667eea', bgcolor: alpha('#667eea', 0.04) } }}>
              取消
            </Button>
            <Button variant="contained" onClick={handleImport} disabled={!file || importing}
              sx={{
                borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 600,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '0 3px 12px rgba(102,126,234,0.35)',
                '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a3f93 100%)', boxShadow: '0 5px 20px rgba(102,126,234,0.45)', },
                '&:disabled': { background: alpha('#667eea', 0.3), color: 'white' },
              }}>
              {importing ? <CircularProgress size={20} color="inherit" /> : '开始导入'}
            </Button>
          </>
        ) : (
          <Button variant="contained" onClick={() => { onImported(); onClose(); }}
            sx={{
              borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 600,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              boxShadow: '0 3px 12px rgba(102,126,234,0.35)',
              '&:hover': { boxShadow: '0 5px 20px rgba(102,126,234,0.45)' },
            }}>
            完成
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

/* ========= 树形部门行 ========= */
function DepartmentRow({ dept, depth, siblings, index, onEdit, onDelete, onToggle, onReorder, expandedIds, onCountClick, showReorder, canEdit }) {
  const hasChildren = dept.children && dept.children.length > 0;
  const isExpanded = expandedIds.includes(dept.id);
  const directEmps = dept.employees?.length || 0;
  const totalEmps = directEmps + (dept.children?.reduce((s, c) => s + (c.employees?.length || 0), 0) || 0);
  const canMoveUp = index > 0;
  const canMoveDown = index < siblings.length - 1;
  const depthColor = depthColors[depth % depthColors.length];

  const treeGuides = [];
  for (let i = 0; i < depth; i++) {
    treeGuides.push(
      <Box key={i} sx={{ width: 24, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ width: 1, height: '100%', bgcolor: alpha(depthColors[i % depthColors.length], 0.15) }} />
      </Box>
    );
  }

  return (
    <>
      <TableRow
        hover
        sx={{
          '&:nth-of-type(odd)': { bgcolor: alpha('#667eea', 0.015) },
          '&:hover': { bgcolor: alpha('#667eea', 0.06) + '!important' },
          transition: 'background 0.15s',
        }}
      >
        <TableCell sx={{ borderBottom: `1px solid ${alpha('#667eea', 0.08)}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {treeGuides}
            {hasChildren ? (
              <IconButton size="small" onClick={() => onToggle(dept.id)} sx={{
                mr: 0.5, width: 28, height: 28,
                bgcolor: isExpanded ? alpha(depthColor, 0.1) : 'transparent',
                '&:hover': { bgcolor: alpha(depthColor, 0.15) },
                transition: 'all 0.2s',
              }}>
                {isExpanded ? <CollapseIcon fontSize="small" sx={{ color: depthColor }} /> : <ExpandIcon fontSize="small" />}
              </IconButton>
            ) : (
              <Box sx={{ width: 28, mr: 0.5 }} />
            )}
            <Avatar sx={{
              width: 32, height: 32, mr: 1.5, fontSize: 13, fontWeight: 700,
              bgcolor: alpha(depthColor, 0.12), color: depthColor,
            }}>
              {dept.name.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.9rem' }}>
                {dept.name}
              </Typography>
              {dept.parentId && (
                <Typography variant="caption" color="text.secondary">
                  上级：{dept.parent?.name || '—'}
                </Typography>
              )}
            </Box>
          </Box>
        </TableCell>
        <TableCell sx={{ borderBottom: `1px solid ${alpha('#667eea', 0.08)}` }}>
          {dept.manager ? (
            <Chip
              icon={<ManagerIcon sx={{ fontSize: 14 }} />}
              label={dept.manager.name}
              size="small"
              sx={{
                bgcolor: alpha(depthColor, 0.08), color: depthColor,
                fontWeight: 500, '& .MuiChip-icon': { color: depthColor },
              }}
            />
          ) : (
            <Chip label="—待指定—" size="small" variant="outlined" sx={{ color: 'text.secondary', borderStyle: 'dashed' }} />
          )}
        </TableCell>
        <TableCell align="center" sx={{ borderBottom: `1px solid ${alpha('#667eea', 0.08)}` }}>
          <Tooltip title={`直属: ${directEmps} | 总计: ${totalEmps}`}>
            <Chip
              icon={<GroupIcon />}
              label={totalEmps}
              size="small"
              clickable
              onClick={() => onCountClick(dept)}
              sx={{
                fontWeight: 600, minWidth: 48,
                bgcolor: alpha(depthColor, 0.08), color: depthColor,
                '&:hover': { bgcolor: depthColor, color: 'white', '& .MuiChip-icon': { color: 'white' } },
                '& .MuiChip-icon': { color: depthColor },
                transition: 'all 0.2s',
              }}
            />
          </Tooltip>
        </TableCell>
        <TableCell align="center" sx={{ borderBottom: `1px solid ${alpha('#667eea', 0.08)}` }}>
          <Stack direction="row" spacing={0.5} justifyContent="center">
            {showReorder && (
              <>
                <Tooltip title="上移">
                  <span>
                    <IconButton size="small" disabled={!canMoveUp} onClick={() => onReorder(dept, 'up')}
                      sx={{ '&:hover': { bgcolor: alpha('#1976d2', 0.1), color: '#1976d2' } }}>
                      <UpIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="下移">
                  <span>
                    <IconButton size="small" disabled={!canMoveDown} onClick={() => onReorder(dept, 'down')}
                      sx={{ '&:hover': { bgcolor: alpha('#1976d2', 0.1), color: '#1976d2' } }}>
                      <DownIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
              </>
            )}
            {canEdit && (
              <>
                <Tooltip title="编辑">
                  <IconButton size="small" color="primary" onClick={() => onEdit(dept)}
                    sx={{ '&:hover': { bgcolor: alpha('#1976d2', 0.1) } }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="删除">
                  <IconButton size="small" color="error" onClick={() => onDelete(dept)}
                    sx={{ '&:hover': { bgcolor: alpha('#d32f2f', 0.1) } }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Stack>
        </TableCell>
      </TableRow>
      {hasChildren && isExpanded && dept.children.map((child, childIdx) => (
        <DepartmentRow
          key={child.id} dept={child} depth={depth + 1}
          siblings={dept.children} index={childIdx}
          onEdit={onEdit} onDelete={onDelete} onToggle={onToggle}
          onReorder={onReorder} expandedIds={expandedIds}
          onCountClick={onCountClick} showReorder={showReorder} canEdit={canEdit}
        />
      ))}
    </>
  );
}

/* ========= 主页面 ========= */
export default function DepartmentTree() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const reorderAllowed = canReorder(user);
  const canEdit = useCanEdit();
  const [departments, setDepartments] = useState([]);
  const [flatDepts, setFlatDepts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [exporting, setExporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [deptRes, flatRes, empRes] = await Promise.all([
        api.get('/departments'),
        api.get('/departments/flat'),
        api.get('/employees?pageSize=1000&status=ACTIVE'),
      ]);
      setDepartments(deptRes.data || []);
      setFlatDepts(flatRes.data || []);
      setEmployees((empRes.data?.data || empRes.data || []).filter((e) => e.user?.role !== 'SUPER_ADMIN'));
      const allIds = (flatRes.data || []).map((d) => d.id);
      setExpandedIds(allIds);
    } catch {
      setMessage({ type: 'error', text: '加载数据失败' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleToggle = (id) => {
    setExpandedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleEdit = (dept) => { setEditing(dept); setFormOpen(true); };
  const handleAdd = () => { setEditing(null); setFormOpen(true); };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.get('/departments/export', { responseType: 'blob' });
      const blob = response.data || response;
      const blobUrl = window.URL.createObjectURL(new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `部门列表_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      setMessage({ type: 'success', text: '导出成功' });
    } catch (err) {
      setMessage({ type: 'error', text: '导出失败：' + (err.message || '未知错误') });
    } finally { setExporting(false); }
  };

  const handleCountClick = (dept) => {
    navigate(`/employees?departmentId=${dept.id}&departmentName=${encodeURIComponent(dept.name)}`);
  };

  const handleReorder = async (dept, direction) => {
    let siblings;
    if (!dept.parentId) {
      siblings = departments;
    } else {
      const findSiblings = (list) => {
        for (const d of list) {
          if (d.id === dept.parentId) return d.children || [];
          if (d.children) { const found = findSiblings(d.children); if (found) return found; }
        }
        return null;
      };
      siblings = findSiblings(departments) || [];
    }
    const idx = siblings.findIndex((d) => d.id === dept.id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const newSortOrders = siblings.map((d, i) => ({ id: d.id, sortOrder: i }));
    const tempSort = newSortOrders[idx].sortOrder;
    newSortOrders[idx].sortOrder = newSortOrders[swapIdx].sortOrder;
    newSortOrders[swapIdx].sortOrder = tempSort;
    try {
      await api.put('/departments/reorder', { items: newSortOrders });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: '排序调整失败：' + (err.message || '未知错误') });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/departments/${deleteTarget.id}`);
      setMessage({ type: 'success', text: `部门「${deleteTarget.name}」已删除` });
      setDeleteTarget(null); fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || '删除失败' });
      setDeleteTarget(null);
    }
  };

  const handleSave = () => {
    setFormOpen(false); setEditing(null);
    setMessage({ type: 'success', text: editing ? '部门已更新' : '部门已创建' });
    fetchData();
  };

  const totalDepts = flatDepts.length;
  const topDepts = departments.length;
  const totalEmps = departments.reduce((sum, d) => {
    const count = (d.employees?.length || 0);
    const childCount = (d.children || []).reduce((s, c) => s + (c.employees?.length || 0), 0);
    return sum + count + childCount;
  }, 0);
  const maxDepth = departments.reduce((max, d) => {
    const calc = (dept, depth) => {
      let m = depth;
      if (dept.children) dept.children.forEach((c) => { m = Math.max(m, calc(c, depth + 1)); });
      return m;
    };
    return Math.max(max, calc(d, 1));
  }, 0);

  return (
    <Box>
      <PageHeader title="部门管理" breadcrumbs={['部门管理']} />

      {message.text && (
        <Alert severity={message.type} sx={{ mb: 2, borderRadius: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {/* 统计卡片 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        {[
          { label: '部门总数', value: totalDepts, icon: <DomainIcon />, color: '#667eea' },
          { label: '一级部门', value: topDepts, icon: <BusinessIcon />, color: '#1976d2' },
          { label: '员工总数', value: totalEmps, icon: <GroupIcon />, color: '#2e7d32' },
          { label: '最大层级', value: maxDepth + '层', icon: <TreeIcon />, color: '#e65100' },
        ].map((card) => (
          <Card key={card.label} sx={{
            borderRadius: 3, overflow: 'hidden',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': { transform: 'translateY(-3px)', boxShadow: 4 },
          }}>
            <Box sx={{ height: 4, bgcolor: card.color }} />
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar sx={{
                  width: 44, height: 44, borderRadius: 2,
                  background: `linear-gradient(135deg, ${card.color} 0%, ${alpha(card.color, 0.6)} 100%)`,
                  boxShadow: `0 4px 12px ${alpha(card.color, 0.3)}`,
                }}>
                  {card.icon}
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                    {card.label}
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color={card.color}>
                    {card.value}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* 操作栏 */}
      <Paper sx={{
        p: 1.5, mb: 2, borderRadius: 3,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        bgcolor: alpha('#667eea', 0.02), border: `1px solid ${alpha('#667eea', 0.08)}`,
      }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <TreeIcon sx={{ color: '#667eea', fontSize: 20 }} />
          <Typography variant="body2" color="text.secondary">
            共 <b style={{ color: '#667eea' }}>{totalDepts}</b> 个部门 · 默认全部展开
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          {canEdit && (
            <Button variant="outlined" size="small" startIcon={<ImportIcon />}
              onClick={() => setImportOpen(true)}
              sx={{
                borderRadius: 2, textTransform: 'none', fontWeight: 500,
                borderColor: alpha('#667eea', 0.3), color: '#667eea',
                '&:hover': { borderColor: '#667eea', bgcolor: alpha('#667eea', 0.06), boxShadow: `0 2px 8px ${alpha('#667eea', 0.15)}` },
              }}>
              导入Excel
            </Button>
          )}
          <Button variant="outlined" size="small" startIcon={exporting ? <CircularProgress size={14} /> : <ExportIcon />}
            onClick={handleExport} disabled={exporting}
            sx={{
              borderRadius: 2, textTransform: 'none', fontWeight: 500,
              borderColor: alpha('#667eea', 0.3), color: '#667eea',
              '&:hover': { borderColor: '#667eea', bgcolor: alpha('#667eea', 0.06), boxShadow: `0 2px 8px ${alpha('#667eea', 0.15)}` },
              '&:disabled': { borderColor: alpha('#667eea', 0.15), color: alpha('#667eea', 0.4) },
            }}>
            {exporting ? '导出中...' : '导出Excel'}
          </Button>
          {canEdit && (
            <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleAdd}
              sx={{
                borderRadius: 2, px: 2.5, textTransform: 'none', fontWeight: 600,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '0 3px 12px rgba(102,126,234,0.35)',
                '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a3f93 100%)', boxShadow: '0 5px 20px rgba(102,126,234,0.45)' },
              }}>
              新建部门
            </Button>
          )}
        </Stack>
      </Paper>

      {/* 部门表格 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : departments.length === 0 ? (
        <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <DomainIcon sx={{ fontSize: 72, color: alpha('#667eea', 0.2), mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ mb: 0.5 }}>暂无部门数据</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              首次使用？请先创建部门（可不指定负责人），再录入员工，最后回填部门负责人
            </Typography>
            {canEdit && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}
                sx={{
                  borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 600,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 3px 12px rgba(102,126,234,0.35)',
                  '&:hover': { boxShadow: '0 5px 20px rgba(102,126,234,0.45)' },
                }}>
                新建部门
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: 'hidden', border: `1px solid ${alpha('#667eea', 0.08)}` }}>
          <Table>
            <TableHead>
              <TableRow sx={{
                bgcolor: alpha('#667eea', 0.06),
                '& .MuiTableCell-root': { borderBottom: `2px solid ${alpha('#667eea', 0.15)}`, py: 1.5 },
              }}>
                <TableCell sx={{ fontWeight: 700, color: '#667eea', fontSize: '0.85rem' }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <DomainIcon fontSize="small" /> <span>部门名称</span>
                  </Stack>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#667eea', fontSize: '0.85rem' }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <ManagerIcon fontSize="small" /> <span>负责人</span>
                  </Stack>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: '#667eea', fontSize: '0.85rem' }}>
                  <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                    <GroupIcon fontSize="small" /> <span>人数</span>
                  </Stack>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: '#667eea', fontSize: '0.85rem' }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {departments.map((dept, idx) => (
                <DepartmentRow
                  key={dept.id} dept={dept} depth={0}
                  siblings={departments} index={idx}
                  onEdit={handleEdit} onDelete={setDeleteTarget}
                  onToggle={handleToggle} onReorder={handleReorder}
                  expandedIds={expandedIds} onCountClick={handleCountClick}
                  showReorder={reorderAllowed} canEdit={canEdit}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 弹窗 */}
      <DepartmentFormDialog
        open={formOpen} editing={editing} departments={flatDepts}
        employees={employees} onClose={() => { setFormOpen(false); setEditing(null); }} onSave={handleSave}
      />
      <DepartmentImportDialog
        open={importOpen} onClose={() => setImportOpen(false)}
        onImported={() => { fetchData(); setMessage({ type: 'success', text: '部门导入完成' }); }}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除部门"
        message={deleteTarget ? `确定要删除部门「${deleteTarget.name}」吗？该操作不可撤销。` : ''}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
