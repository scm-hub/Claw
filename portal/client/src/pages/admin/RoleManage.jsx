import { useState, useEffect } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Snackbar, Alert, CircularProgress, Tooltip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Checkbox, Divider, Collapse, List, ListItem, ListItemText,
  ListItemIcon, TablePagination,
} from '@mui/material';
import { Refresh, Add, Edit, Delete, ExpandMore, ExpandLess, Business, Folder, Lock, SubdirectoryArrowRight } from '@mui/icons-material';
import api from '../../api';

const systemLabels = { portal: '平台', scm: 'SCM 供应链', hrms: 'HRMS 人力', mdm: 'MDM 主数据' };
const systemIcons = { portal: <Business fontSize="small" />, scm: <Business fontSize="small" />, hrms: <Business fontSize="small" />, mdm: <Business fontSize="small" /> };

export default function RoleManage() {
  const [roles, setRoles] = useState([]);
  const [moduleDefs, setModuleDefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [editDialog, setEditDialog] = useState({ open: false, isEdit: false, id: '' });
  const [form, setForm] = useState({ name: '', description: '', permissions: {} });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  // 子系统展开状态
  const [expandedSystems, setExpandedSystems] = useState({});
  // 模块展开状态（仅含子功能点的模块）
  const [expandedModules, setExpandedModules] = useState({});

  const showSnack = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  const fetchData = async () => {
    try {
      const [rolesResp, modulesResp] = await Promise.all([
        api.get('/roles'),
        api.get('/roles/modules'),
      ]);
      if (rolesResp.success) setRoles(rolesResp.data);
      if (modulesResp.success) {
        setModuleDefs(modulesResp.data);
      }
    } catch (err) {
      showSnack('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setForm({ name: '', description: '', permissions: {} });
    const expSys = {};
    const expMod = {};
    Object.entries(moduleDefs?.systemModules || {}).forEach(([s, mods]) => {
      expSys[s] = true;
      mods.forEach((m) => { if (m.children) expMod[`${s}:${m.code}`] = true; });
    });
    setExpandedSystems(expSys);
    setExpandedModules(expMod);
    setEditDialog({ open: true, isEdit: false, id: '' });
  };

  const openEdit = (role) => {
    const perms = {};
    role.permissions.forEach((p) => {
      perms[`${p.systemCode}:${p.moduleCode}`] = true;
    });
    setForm({
      name: role.name,
      description: role.description || '',
      permissions: perms,
    });
    // 展开有权限的系统
    const expSys = {};
    const expMod = {};
    Object.entries(moduleDefs?.systemModules || {}).forEach(([s, mods]) => {
      const hasAny = mods.some((m) =>
        perms[`${s}:${m.code}`] || (m.children && m.children.some((c) => perms[`${s}:${c.code}`]))
      );
      expSys[s] = hasAny;
      mods.forEach((m) => {
        if (m.children) {
          const hasChild = m.children.some((c) => perms[`${s}:${c.code}`]);
          expMod[`${s}:${m.code}`] = hasChild;
        }
      });
    });
    setExpandedSystems(expSys);
    setExpandedModules(expMod);
    setEditDialog({ open: true, isEdit: true, id: role.id });
  };

  // 切换子功能点
  const handleToggleChild = (systemCode, moduleCode, childCode) => {
    const childKey = `${systemCode}:${childCode}`;
    const parentKey = `${systemCode}:${moduleCode}`;
    const moduleDef = (moduleDefs?.systemModules?.[systemCode] || []).find((m) => m.code === moduleCode);
    const children = moduleDef?.children || [];
    const newPerms = { ...form.permissions };
    const willCheck = !newPerms[childKey];
    newPerms[childKey] = willCheck;

    // 更新父模块状态：所有子功能点都勾选则勾选父模块，否则取消
    const allChildrenChecked = children.every((c) => newPerms[`${systemCode}:${c.code}`]);
    newPerms[parentKey] = allChildrenChecked;

    setForm((prev) => ({ ...prev, permissions: newPerms }));
  };

  // 切换模块（含子功能点的模块：切换父+所有子；无子功能点的模块：只切换自身）
  const handleToggleModule = (systemCode, moduleCode) => {
    const moduleDef = (moduleDefs?.systemModules?.[systemCode] || []).find((m) => m.code === moduleCode);
    const parentKey = `${systemCode}:${moduleCode}`;
    const isCurrentlyChecked = !!form.permissions[parentKey];
    const newPerms = { ...form.permissions };

    if (moduleDef?.children && moduleDef.children.length > 0) {
      // 有子功能点：切换父+所有子
      newPerms[parentKey] = !isCurrentlyChecked;
      moduleDef.children.forEach((c) => {
        newPerms[`${systemCode}:${c.code}`] = !isCurrentlyChecked;
      });
    } else {
      // 无子功能点：只切换自身
      newPerms[parentKey] = !isCurrentlyChecked;
    }
    setForm((prev) => ({ ...prev, permissions: newPerms }));
  };

  // 切换整个系统
  const handleToggleSystem = (systemCode) => {
    const mods = moduleDefs?.systemModules?.[systemCode] || [];
    // 收集所有需要检查的 key
    const allKeys = [];
    mods.forEach((m) => {
      allKeys.push(`${systemCode}:${m.code}`);
      if (m.children) {
        m.children.forEach((c) => allKeys.push(`${systemCode}:${c.code}`));
      }
    });
    const allChecked = allKeys.every((k) => form.permissions[k]);
    const newPerms = { ...form.permissions };
    allKeys.forEach((k) => { newPerms[k] = !allChecked; });
    setForm((prev) => ({ ...prev, permissions: newPerms }));
  };

  const toggleSystemExpand = (sysCode) => {
    setExpandedSystems((prev) => ({ ...prev, [sysCode]: !prev[sysCode] }));
  };

  const toggleModuleExpand = (key) => {
    setExpandedModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showSnack('角色名称必填', 'error'); return; }

    const permissions = Object.entries(form.permissions)
      .filter(([_, checked]) => checked)
      .map(([key]) => {
        const [systemCode, moduleCode] = key.split(':');
        return { systemCode, moduleCode };
      });

    const payload = {
      name: form.name.trim(),
      description: form.description,
      permissions,
    };

    try {
      if (editDialog.isEdit) {
        await api.put(`/roles/${editDialog.id}`, payload);
        showSnack('角色已更新');
      } else {
        await api.post('/roles', payload);
        showSnack('角色已创建');
      }
      setEditDialog({ open: false, isEdit: false, id: '' });
      fetchData();
    } catch (err) {
      showSnack(err.message || '操作失败', 'error');
    }
  };

  const handleDelete = async (role) => {
    if (role.isSystem) { showSnack('系统内置角色不可删除', 'error'); return; }
    if (!window.confirm(`确认删除角色「${role.name}」？`)) return;
    try {
      await api.delete(`/roles/${role.id}`);
      showSnack('角色已删除');
      fetchData();
    } catch (err) {
      showSnack(err.message || '删除失败', 'error');
    }
  };

  // 计算系统的选中统计
  const getSystemStats = (sysCode, mods) => {
    const allKeys = [];
    mods.forEach((m) => {
      allKeys.push(`${sysCode}:${m.code}`);
      if (m.children) m.children.forEach((c) => allKeys.push(`${sysCode}:${c.code}`));
    });
    // 去重统计模块级别
    const checkedModules = mods.filter((m) => form.permissions[`${sysCode}:${m.code}`]).length;
    return { checkedModules, totalModules: mods.length };
  };

  if (loading || !moduleDefs) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>角色管理</Typography>
        <Box>
          <Tooltip title="刷新"><IconButton onClick={fetchData} sx={{ mr: 1 }}><Refresh /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>新增角色</Button>
        </Box>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        创建角色并以树状结构配置各子系统的模块和功能访问权限。然后在「用户管理」中给员工分配角色，实现统一权限管理。
      </Typography>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell>角色名称</TableCell>
              <TableCell>描述</TableCell>
              <TableCell>已分配用户</TableCell>
              <TableCell>模块权限</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {roles
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((role) => (
                <TableRow key={role.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{role.name}</Typography>
                    {role.isSystem && <Chip label="内置" size="small" color="error" sx={{ ml: 1 }} />}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{role.description || '-'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={role._count?.userRoles || 0} size="small" color={role._count?.userRoles > 0 ? 'primary' : 'default'} />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {Object.entries(
                        role.permissions.reduce((acc, p) => {
                          if (!acc[p.systemCode]) acc[p.systemCode] = new Set();
                          acc[p.systemCode].add(p.moduleCode);
                          return acc;
                        }, {})
                      ).map(([sys, modSet]) => (
                        <Chip
                          key={sys}
                          label={`${systemLabels[sys] || sys}: ${modSet.size}个`}
                          size="small"
                          variant="outlined"
                          color="info"
                        />
                      ))}
                      {role.permissions.length === 0 && <Typography variant="caption" color="text.disabled">无</Typography>}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    {role.isSystem ? (
                      <Tooltip title="系统内置角色，不可编辑">
                        <IconButton size="small" disabled><Lock fontSize="small" /></IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="编辑"><IconButton size="small" onClick={() => openEdit(role)}><Edit fontSize="small" /></IconButton></Tooltip>
                    )}
                    <Tooltip title={role._count?.userRoles > 0 ? `已分配给 ${role._count.userRoles} 个用户，无法删除` : '删除'}><span><IconButton size="small" onClick={() => handleDelete(role)} disabled={role.isSystem || role._count?.userRoles > 0}><Delete fontSize="small" /></IconButton></span></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={roles.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage="每页行数："
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count} 条`}
        />
      </TableContainer>

      {/* 新增/编辑角色弹窗 */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, isEdit: false, id: '' })} maxWidth="md" fullWidth>
        <DialogTitle>{editDialog.isEdit ? '编辑角色' : '新增角色'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="角色名称 *" size="small" fullWidth
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <TextField
                label="描述" size="small" fullWidth
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Box>

            <Divider sx={{ my: 1 }}>模块权限配置（三级树状结构）</Divider>

            {/* 三级树状权限配置 */}
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, maxHeight: 450, overflow: 'auto' }}>
              {Object.entries(moduleDefs.systemModules).map(([sysCode, modules]) => {
                const stats = getSystemStats(sysCode, modules);
                const allChecked = stats.checkedModules === modules.length;
                const someChecked = stats.checkedModules > 0;
                const isExpanded = expandedSystems[sysCode] !== false;

                return (
                  <Box key={sysCode}>
                    {/* 第一层：子系统 */}
                    <ListItem
                      button
                      onClick={() => toggleSystemExpand(sysCode)}
                      sx={{
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'grey.50',
                        '&:hover': { bgcolor: 'grey.100' },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }} onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={allChecked}
                          indeterminate={someChecked && !allChecked}
                          onChange={(e) => { e.stopPropagation(); handleToggleSystem(sysCode); }}
                          size="small"
                        />
                      </ListItemIcon>
                      <ListItemIcon sx={{ minWidth: 28, color: 'primary.main' }}>
                        {systemIcons[sysCode]}
                      </ListItemIcon>
                      <ListItemText
                        primary={systemLabels[sysCode] || sysCode}
                        primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }}
                      />
                      <Chip
                        label={`${stats.checkedModules}/${modules.length}`}
                        size="small"
                        color={someChecked ? 'primary' : 'default'}
                        sx={{ mr: 1 }}
                      />
                      {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                    </ListItem>

                    {/* 第二层：模块 */}
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <List disablePadding>
                        {modules.map((m) => {
                          const parentKey = `${sysCode}:${m.code}`;
                          const checked = !!form.permissions[parentKey];
                          const hasChildren = m.children && m.children.length > 0;
                          const modExpanded = expandedModules[parentKey];

                          // 计算子功能点的选中统计
                          let childStats = null;
                          if (hasChildren) {
                            const checkedChildren = m.children.filter((c) => form.permissions[`${sysCode}:${c.code}`]).length;
                            childStats = { checked: checkedChildren, total: m.children.length };
                          }

                          return (
                            <Box key={m.code}>
                              <ListItem
                                button
                                onClick={() => hasChildren ? toggleModuleExpand(parentKey) : handleToggleModule(sysCode, m.code)}
                                sx={{
                                  pl: 7,
                                  py: 0.5,
                                  '&:hover': { bgcolor: 'action.hover' },
                                }}
                              >
                                <ListItemIcon sx={{ minWidth: 32 }} onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={checked}
                                    indeterminate={hasChildren && childStats.checked > 0 && childStats.checked < childStats.total}
                                    onChange={(e) => { e.stopPropagation(); handleToggleModule(sysCode, m.code); }}
                                    size="small"
                                  />
                                </ListItemIcon>
                                <ListItemIcon sx={{ minWidth: 28, color: checked ? 'primary.main' : 'text.disabled' }}>
                                  <Folder fontSize="small" />
                                </ListItemIcon>
                                <ListItemText
                                  primary={m.label}
                                  primaryTypographyProps={{
                                    fontSize: 13,
                                    color: checked ? 'text.primary' : 'text.secondary',
                                    fontWeight: checked ? 500 : 400,
                                  }}
                                />
                                {hasChildren && (
                                  <>
                                    <Chip
                                      label={`${childStats.checked}/${childStats.total}`}
                                      size="small"
                                      color={childStats.checked > 0 ? 'primary' : 'default'}
                                      variant="outlined"
                                      sx={{ mr: 0.5, height: 20, fontSize: 11 }}
                                    />
                                    {modExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                                  </>
                                )}
                              </ListItem>

                              {/* 第三层：子功能点 */}
                              {hasChildren && (
                                <Collapse in={modExpanded} timeout="auto" unmountOnExit>
                                  <List disablePadding>
                                    {m.children.map((c) => {
                                      const childKey = `${sysCode}:${c.code}`;
                                      const childChecked = !!form.permissions[childKey];
                                      return (
                                        <ListItem
                                          button
                                          key={c.code}
                                          onClick={() => handleToggleChild(sysCode, m.code, c.code)}
                                          sx={{
                                            pl: 11,
                                            py: 0.25,
                                            '&:hover': { bgcolor: 'action.hover' },
                                          }}
                                        >
                                          <ListItemIcon sx={{ minWidth: 28 }}>
                                            <Checkbox checked={childChecked} size="small" />
                                          </ListItemIcon>
                                          <ListItemText
                                            primary={c.label}
                                            primaryTypographyProps={{
                                              fontSize: 12,
                                              color: childChecked ? 'text.primary' : 'text.secondary',
                                              fontWeight: childChecked ? 500 : 400,
                                            }}
                                          />
                                        </ListItem>
                                      );
                                    })}
                                  </List>
                                </Collapse>
                              )}
                            </Box>
                          );
                        })}
                      </List>
                    </Collapse>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, isEdit: false, id: '' })}>取消</Button>
          <Button variant="contained" onClick={handleSave}>{editDialog.isEdit ? '保存' : '创建'}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
