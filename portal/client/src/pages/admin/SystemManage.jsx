import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  Chip,
  Snackbar,
  Alert,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import api from '../../api';

export default function SystemManage() {
  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    url: '',
    apiUrl: '',
    icon: '',
    color: '#1976d2',
    sortOrder: 0,
  });

  const fetchSystems = async () => {
    try {
      const resp = await api.get('/systems/all');
      if (resp.success) setSystems(resp.data);
    } catch (err) {
      showSnackbar('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystems();
  }, []);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpen = (system = null) => {
    if (system) {
      setEditing(system);
      setFormData({
        code: system.code,
        name: system.name,
        description: system.description,
        url: system.url,
        apiUrl: system.apiUrl || '',
        icon: system.icon || '',
        color: system.color || '#1976d2',
        sortOrder: system.sortOrder,
      });
    } else {
      setEditing(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        url: '',
        apiUrl: '',
        icon: '',
        color: '#1976d2',
        sortOrder: 0,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/systems/${editing.id}`, formData);
        showSnackbar('更新成功');
      } else {
        await api.post('/systems', formData);
        showSnackbar('添加成功');
      }
      setDialogOpen(false);
      fetchSystems();
    } catch (err) {
      showSnackbar(err.message || '操作失败', 'error');
    }
  };

  const handleToggle = async (system) => {
    try {
      await api.put(`/systems/${system.id}`, { isActive: !system.isActive });
      fetchSystems();
      showSnackbar(system.isActive ? '已停用' : '已启用');
    } catch (err) {
      showSnackbar('操作失败', 'error');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          系统管理
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>
          注册新系统
        </Button>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell>排序</TableCell>
              <TableCell>编码</TableCell>
              <TableCell>名称</TableCell>
              <TableCell>前端地址</TableCell>
              <TableCell>API 地址</TableCell>
              <TableCell>用户数</TableCell>
              <TableCell>状态</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {systems.map((s) => (
              <TableRow key={s.id} hover>
                <TableCell>{s.sortOrder}</TableCell>
                <TableCell>
                  <Chip label={s.code} size="small" sx={{ bgcolor: s.color + '15', color: s.color, fontWeight: 600 }} />
                </TableCell>
                <TableCell>{s.name}</TableCell>
                <TableCell>
                  <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
                    {s.url}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                    {s.apiUrl || '-'}
                  </Typography>
                </TableCell>
                <TableCell>{s._count?.userAccess || 0}</TableCell>
                <TableCell>
                  <Switch checked={s.isActive} onChange={() => handleToggle(s)} size="small" />
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => handleOpen(s)}>
                    <Edit fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 添加/编辑弹窗 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? '编辑系统' : '注册新系统'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="系统编码"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              disabled={!!editing}
              helperText="唯一标识，如 hrms、scm、mdm"
              size="small"
            />
            <TextField
              label="系统名称"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              size="small"
            />
            <TextField
              label="描述"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
              size="small"
            />
            <TextField
              label="前端地址"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="http://localhost:5175"
              size="small"
            />
            <TextField
              label="API 地址"
              value={formData.apiUrl}
              onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
              placeholder="http://localhost:4003"
              size="small"
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="图标名"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                helperText="MUI 图标名: badge, inventory_2, settings"
                size="small"
                sx={{ flex: 1 }}
              />
              <TextField
                label="主题色"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                size="small"
                sx={{ width: 100 }}
              />
            </Box>
            <TextField
              label="排序"
              type="number"
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
              size="small"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave}>保存</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
