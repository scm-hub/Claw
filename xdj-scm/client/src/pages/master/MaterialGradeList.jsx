import React, { useState, useEffect } from 'react';
import { 
  Box, Button, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, TextField, Typography, Dialog, DialogActions, 
  DialogContent, DialogTitle, IconButton, MenuItem, FormControl, 
  InputLabel, Select, Snackbar, Alert, Chip, Stack, Tooltip
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Close as CloseIcon, ToggleOn, ToggleOff } from '@mui/icons-material';
import api from '../../lib/api';

const STATUS_MAP = {
  DRAFT: '草稿', PENDING: '待审批', APPROVED: '已审批', REJECTED: '已驳回',
  IN_PROGRESS: '进行中', COMPLETED: '已完成', CANCELLED: '已取消',
  CLOSED: '已关闭', ACTIVE: '启用', INACTIVE: '停用',
};

const MaterialGradeList = () => {
  const [grades, setGrades] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, totalCount: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  
  // 弹窗状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('add'); // 'add' or 'edit'
  const [dialogData, setDialogData] = useState({
    code: '',
    name: '',
    description: '',
    sortOrder: 0,
    status: 'ACTIVE'
  });
  
  // 删除确认弹窗
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  
  // 其他状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [statusFilter, setStatusFilter] = useState('ALL');

  // 未保存变更确认
  const [confirmClose, setConfirmClose] = useState(false);

  // 删除引用详情弹窗
  const [refDialog, setRefDialog] = useState({
    open: false, message: '', references: [],
  });

  // 获取物料等级列表
  const fetchGrades = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, pageSize });
      if (searchKeyword) params.append('search', searchKeyword);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const response = await api.get(`/master/material-grades?${params.toString()}`);
      const { list, pagination: pageInfo } = response || {};

      setGrades(list);
      setPagination(pageInfo);
    } catch (err) {
      console.error('获取物料等级列表失败:', err);
      showSnackbar(err.data?.message || '获取物料等级列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 显示提示信息
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // 打开添加弹窗
  const handleAdd = () => {
    setDialogType('add');
    setDialogData({
      name: '',
      description: '',
      sortOrder: 0,
      status: 'ACTIVE'
    });
    setDialogOpen(true);
  };

  // 打开编辑弹窗
  const handleEdit = (item) => {
    setDialogType('edit');
    setDialogData({
      id: item.id,
      code: item.code,
      name: item.name,
      description: item.description,
      sortOrder: item.sortOrder,
      status: item.status
    });
    setDialogOpen(true);
  };

  // 保存（添加或更新）
  const handleSave = async () => {
    try {
      if (dialogType === 'add') {
        await api.post('/master/material-grades', dialogData);
        showSnackbar('添加成功');
      } else {
        await api.put(`/master/material-grades/${dialogData.id}`, dialogData);
        showSnackbar('更新成功');
      }
      setDialogOpen(false);
      fetchGrades(pagination.page, pagination.pageSize);
    } catch (err) {
      console.error(dialogType === 'add' ? '添加失败:' : '更新失败:', err);
      showSnackbar(err.data?.message || (dialogType === 'add' ? '添加失败' : '更新失败'), 'error');
    }
  };

  // 状态切换
  const handleToggleStatus = async (item) => {
    const newStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.put(`/master/material-grades/${item.id}`, {
        code: item.code,
        name: item.name,
        description: item.description,
        sortOrder: item.sortOrder,
        status: newStatus,
      });
      showSnackbar(newStatus === 'ACTIVE' ? '已启用' : '已停用');
      fetchGrades(pagination.page, pagination.pageSize);
    } catch (err) {
      showSnackbar(err.data?.message || '状态切换失败', 'error');
    }
  };

  // 删除确认
  const handleDeleteConfirm = (item) => {
    setDeleteItem(item);
    setDeleteConfirmOpen(true);
  };

  // 确认删除
  const handleDelete = async () => {
    try {
      await api.delete(`/master/material-grades/${deleteItem.id}`);
      showSnackbar('删除成功');
      setDeleteConfirmOpen(false);
      setDeleteItem(null);
      fetchGrades(pagination.page, pagination.pageSize);
    } catch (err) {
      console.error('删除失败:', err);
      // 有引用详情 → 弹出引用对话框
      if (err.status === 400 && err.data?.references) {
        setDeleteConfirmOpen(false);
        setRefDialog({
          open: true,
          message: err.data.message || '该等级已被业务单据引用，无法删除',
          references: err.data.references,
        });
      } else {
        showSnackbar(err.data?.message || err.message || '删除失败', 'error');
      }
    }
  };

  // ===== 未保存变更确认 =====
  const hasFormChanges = () => {
    if (!dialogOpen) return false;
    if (dialogType === 'edit') {
      // 编辑模式：找原始数据对比
      const orig = grades.find(g => g.id === dialogData.id);
      if (!orig) return false;
      const keys = ['name', 'description', 'sortOrder', 'status'];
      return keys.some(k => String(orig[k] ?? '') !== String(dialogData[k] ?? ''));
    }
    // 新增模式：表单有任何非空值
    return dialogData.name !== '' || dialogData.description !== '' ||
      dialogData.sortOrder !== 0 || dialogData.status !== 'ACTIVE';
  };

  const handleCloseDialog = () => {
    if (hasFormChanges()) {
      setConfirmClose(true);
    } else {
      setDialogOpen(false);
    }
  };

  // 页面变化
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchGrades(newPage, pagination.pageSize);
    }
  };

  // 搜索
  const handleSearch = () => {
    fetchGrades(1, pagination.pageSize);
  };

  // 页面初始化和搜索变化时重新加载数据
  useEffect(() => {
    fetchGrades();
  }, [statusFilter]);

  return (
    <Box sx={{ p: 3 }}>
      {/* 页面标题和操作栏 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">物料等级管理</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          添加等级
        </Button>
      </Box>

      {/* 搜索和筛选栏 */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label="搜索"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            size="small"
            sx={{ minWidth: 200 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>状态</InputLabel>
            <Select
              value={statusFilter}
              label="状态"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="ALL">全部</MenuItem>
              <MenuItem value="ACTIVE">启用</MenuItem>
              <MenuItem value="INACTIVE">禁用</MenuItem>
            </Select>
          </FormControl>
          
          <Button variant="outlined" onClick={handleSearch}>
            搜索
          </Button>
        </Box>
      </Paper>

      {/* 数据表格 */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>等级编码</TableCell>
              <TableCell>等级名称</TableCell>
              <TableCell>排序</TableCell>
              <TableCell>描述</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>创建时间</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">加载中...</TableCell>
              </TableRow>
            ) : grades.length > 0 ? (
              grades.map((grade) => (
                <TableRow key={grade.id}>
                  <TableCell>{grade.code}</TableCell>
                  <TableCell>{grade.name}</TableCell>
                  <TableCell>{grade.sortOrder}</TableCell>
                  <TableCell>{grade.description || '-'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={grade.status === 'ACTIVE' ? '启用' : '禁用'} 
                      color={grade.status === 'ACTIVE' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{new Date(grade.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <Button size="small" variant="contained"
                        color={grade.status === 'ACTIVE' ? 'warning' : 'success'}
                        onClick={() => handleToggleStatus(grade)}
                        sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>
                        {grade.status === 'ACTIVE' ? '停用' : '启用'}
                      </Button>
                      <Button size="small" variant="contained" color="primary"
                        onClick={() => handleEdit(grade)}
                        sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>
                        编辑
                      </Button>
                      <Button size="small" variant="contained" color="error"
                        onClick={() => handleDeleteConfirm(grade)}
                        sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>
                        删除
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">暂无数据</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button 
              disabled={pagination.page <= 1} 
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              上一页
            </Button>
            
            <Box>
              第 {pagination.page} 页，共 {pagination.totalPages} 页
            </Box>
            
            <Button 
              disabled={pagination.page >= pagination.totalPages} 
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              下一页
            </Button>
            
            <Box>
              总计 {pagination.totalCount} 条记录
            </Box>
          </Stack>
        </Box>
      )}

      {/* 添加/编辑弹窗 */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogType === 'add' ? '添加物料等级' : '编辑物料等级'}
          <IconButton
            aria-label="close"
            onClick={handleCloseDialog}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {dialogType === 'add' ? (
              <TextField
                label="等级编码"
                value="保存时自动生成"
                disabled
                fullWidth
                helperText="格式：MG + 日期 + 随机码，如 MG202607023F8K2A"
              />
            ) : (
              <TextField
                label="等级编码"
                value={dialogData.code}
                disabled
                fullWidth
              />
            )}
            <TextField
              label="等级名称"
              value={dialogData.name}
              onChange={(e) => setDialogData({ ...dialogData, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="排序"
              type="number"
              value={dialogData.sortOrder}
              onChange={(e) => setDialogData({ ...dialogData, sortOrder: parseInt(e.target.value) || 0 })}
              fullWidth
            />
            <TextField
              label="描述"
              value={dialogData.description}
              onChange={(e) => setDialogData({ ...dialogData, description: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>状态</InputLabel>
              <Select
                value={dialogData.status}
                label="状态"
                onChange={(e) => setDialogData({ ...dialogData, status: e.target.value })}
              >
                <MenuItem value="ACTIVE">启用</MenuItem>
                <MenuItem value="INACTIVE">禁用</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button 
            variant="contained" 
            onClick={handleSave}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent dividers>
          <Typography>
            确定要删除物料等级 "<strong>{deleteItem?.name}</strong>" 吗？
            删除后将无法恢复。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>取消</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleDelete}
          >
            确认删除
          </Button>
        </DialogActions>
      </Dialog>

      {/* 提示框 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* ===== 关闭确认弹窗 ===== */}
      <Dialog open={confirmClose} onClose={() => setConfirmClose(false)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 600 }}>未保存的更改</DialogTitle>
        <DialogContent>
          <Typography>您有尚未保存的更改，确定要关闭吗？关闭后所有更改将丢失。</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClose(false)}>继续编辑</Button>
          <Button onClick={() => { setConfirmClose(false); setDialogOpen(false); }} color="error" variant="contained">放弃更改</Button>
        </DialogActions>
      </Dialog>

      {/* ===== 删除引用详情弹窗 ===== */}
      <Dialog open={refDialog.open} onClose={() => setRefDialog({ open: false, message: '', references: [] })} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 600 }}>无法删除 — {refDialog.message}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            以下业务单据引用了该等级，请对照处理后重试：
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
                      {ref.items[0].status !== undefined && <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ref.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.code || '-'}</TableCell>
                        {item.title !== undefined && <TableCell>{item.title || '-'}</TableCell>}
                        {item.status !== undefined && <TableCell>{STATUS_MAP[item.status] || item.status}</TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2">{ref.count} 条引用记录</Typography>
              )}
              {ref.more > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>还有 {ref.more} 条未展示</Typography>
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
};

export default MaterialGradeList;