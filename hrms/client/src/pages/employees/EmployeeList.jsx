import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Button, Chip, FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, Typography,
  Alert, CircularProgress, List, ListItem, ListItemText, Divider,
} from '@mui/material';
import {
  Add as AddIcon, FileDownload as ExportIcon, FileUpload as ImportIcon,
  Close as CloseIcon, CheckCircle as SuccessIcon, Error as ErrorIcon,
  DeleteSweep as BatchExportIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import PageHeader from '../../components/PageHeader';
import DataGrid from '../../components/DataGrid';
import api from '../../hooks/useFetch';
import useCanEdit from '../../hooks/useCanEdit';

const statusMap = {
  ACTIVE: { label: '在职', color: 'success' },
  INACTIVE: { label: '停职', color: 'warning' },
  RESIGNED: { label: '离职', color: 'error' },
};

export default function EmployeeList() {
  const canEdit = useCanEdit();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ACTIVE');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const fileInputRef = useRef(null);

  // 多选
  const [selectedIds, setSelectedIds] = useState([]);

  // 导入相关
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // 导出中
  const [exporting, setExporting] = useState(false);

  // 从 URL 参数读取部门筛选
  useEffect(() => {
    const deptId = searchParams.get('departmentId');
    if (deptId) {
      setSelectedDeptId(deptId);
    }
  }, [searchParams]);

  // 加载部门列表
  useEffect(() => {
    api.get('/departments/flat').then((res) => setDepartments(res.data || [])).catch(() => {});
  }, []);

  const fetchEmployees = async () => {
    try {
      const params = { page, pageSize, search };
      if (selectedDeptId) params.departmentId = selectedDeptId;
      if (selectedStatus) params.status = selectedStatus;
      const data = await api.get('/employees', { params });
      setEmployees(data.data.data);
      setTotal(data.data.total);
    } catch {}
  };

  useEffect(() => { fetchEmployees(); }, [page, pageSize, search, selectedDeptId, selectedStatus]);

  // 切换搜索/部门/状态/翻页时，清空已选
  useEffect(() => { setSelectedIds([]); }, [page, pageSize, search, selectedDeptId, selectedStatus]);

  const handleDeptChange = (e) => {
    setSelectedDeptId(e.target.value);
    setPage(1);
    if (e.target.value) {
      setSearchParams({ departmentId: e.target.value });
    } else {
      setSearchParams({});
    }
  };

  const clearDeptFilter = () => {
    setSelectedDeptId('');
    setPage(1);
    setSearchParams({});
  };

  const handleStatusChange = (e) => {
    setSelectedStatus(e.target.value);
    setPage(1);
  };

  const clearStatusFilter = () => {
    setSelectedStatus('');
    setPage(1);
  };

  // 通用 blob 下载
  const downloadBlob = (blob, filename) => {
    const blobUrl = window.URL.createObjectURL(new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  };

  // 导出 Excel（全部 / 按筛选条件）
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (selectedDeptId) params.departmentId = selectedDeptId;
      if (selectedStatus) params.status = selectedStatus;
      const queryString = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
      const url = `/employees/export${queryString ? '?' + queryString : ''}`;
      const response = await api.get(url, { responseType: 'blob' });
      downloadBlob(response.data, `employees_${new Date().toISOString().slice(0, 10)}.xlsx`);
      enqueueSnackbar('导出成功', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('导出失败：' + (err.message || '未知错误'), { variant: 'error' });
    } finally {
      setExporting(false);
    }
  };

  // 批量导出选中员工
  const handleBatchExport = async () => {
    if (selectedIds.length === 0) {
      enqueueSnackbar('请先选择要导出的员工', { variant: 'warning' });
      return;
    }
    setExporting(true);
    try {
      const idsParam = selectedIds.join(',');
      const url = `/employees/export?ids=${encodeURIComponent(idsParam)}`;
      const response = await api.get(url, { responseType: 'blob' });
      downloadBlob(response.data, `employees_selected_${selectedIds.length}人_${new Date().toISOString().slice(0, 10)}.xlsx`);
      enqueueSnackbar(`已导出 ${selectedIds.length} 名员工`, { variant: 'success' });
      setSelectedIds([]);
    } catch (err) {
      enqueueSnackbar('批量导出失败：' + (err.message || '未知错误'), { variant: 'error' });
    } finally {
      setExporting(false);
    }
  };

  // 下载导入模板
  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/employees/import/template', { responseType: 'blob' });
      downloadBlob(response.data, 'employee_import_template.xlsx');
    } catch (err) {
      enqueueSnackbar('下载模板失败', { variant: 'error' });
    }
  };

  // 打开导入弹窗
  const handleOpenImport = () => {
    setImportResult(null);
    setImportOpen(true);
  };

  // 选择文件后上传
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.match(/\.xlsx?$/i)) {
      enqueueSnackbar('请上传 Excel 文件（.xlsx 或 .xls）', { variant: 'error' });
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/employees/import', formData);
      setImportResult(res.data);
      if (res.data.failed === 0) {
        enqueueSnackbar(`导入成功！共导入 ${res.data.success} 条`, { variant: 'success' });
      } else {
        enqueueSnackbar(`导入完成：成功 ${res.data.success} 条，失败 ${res.data.failed} 条`, { variant: 'warning' });
      }
      fetchEmployees();
    } catch (err) {
      enqueueSnackbar('导入失败：' + (err.message || '未知错误'), { variant: 'error' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const currentDeptName = searchParams.get('departmentName') || departments.find(d => d.id === selectedDeptId)?.name || '';

  const columns = [
    { field: 'employeeNo', headerName: '工号' },
    { field: 'name', headerName: '姓名', renderCell: (row) => (
      <Box sx={{ cursor: 'pointer', color: 'primary.main', '&:hover': { textDecoration: 'underline' } }} onClick={() => navigate(`/employees/${row.id}`)}>
        {row.name}
      </Box>
    )},
    { field: 'gender', headerName: '性别', renderCell: (row) => row.gender === 'MALE' ? '男' : row.gender === 'FEMALE' ? '女' : '其他' },
    { field: 'age', headerName: '年龄', renderCell: (row) => {
      if (!row.birthday) return '-';
      const birth = new Date(row.birthday);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      return age >= 0 ? `${age}` : '-';
    }},
    { field: 'department', headerName: '部门', renderCell: (row) => row.department?.name || '-' },
    { field: 'position', headerName: '岗位', renderCell: (row) => row.position?.name || row.positionTitle || '-' },
    { field: 'phone', headerName: '手机号' },
    { field: 'education', headerName: '学历' },
    { field: 'status', headerName: '状态', renderCell: (row) => {
      const s = statusMap[row.status] || { label: row.status, color: 'default' };
      return <Chip label={s.label} color={s.color} size="small" />;
    }},
  ];

  return (
    <Box>
      <PageHeader title="员工管理" breadcrumbs={['员工管理']} />

      {/* 部门筛选栏 + 操作按钮 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>按部门筛选</InputLabel>
          <Select value={selectedDeptId} onChange={handleDeptChange} label="按部门筛选">
            <MenuItem value="">全部部门</MenuItem>
            {departments.map((d) => (
              <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>按状态筛选</InputLabel>
          <Select value={selectedStatus} onChange={handleStatusChange} label="按状态筛选">
            <MenuItem value="">全部状态</MenuItem>
            <MenuItem value="ACTIVE">在职</MenuItem>
            <MenuItem value="INACTIVE">停职</MenuItem>
            <MenuItem value="RESIGNED">离职</MenuItem>
          </Select>
        </FormControl>
        {selectedDeptId && (
          <Chip
            label={currentDeptName ? `${currentDeptName} 的员工` : '已筛选'}
            onDelete={clearDeptFilter}
            color="primary"
            variant="outlined"
          />
        )}
        {selectedStatus && (
          <Chip
            label={statusMap[selectedStatus]?.label || selectedStatus}
            onDelete={clearStatusFilter}
            color={statusMap[selectedStatus]?.color || 'default'}
            variant="outlined"
          />
        )}
        <Box sx={{ flex: 1 }} />

        {/* 批量导出按钮（有选中时显示） */}
        {canEdit && selectedIds.length > 0 && (
          <Button
            variant="contained"
            color="secondary"
            startIcon={exporting ? <CircularProgress size={16} color="inherit" /> : <BatchExportIcon />}
            onClick={handleBatchExport}
            disabled={exporting}
            size="small"
          >
            {exporting ? '导出中...' : `批量导出 (${selectedIds.length})`}
          </Button>
        )}

        <Button
          variant="outlined"
          startIcon={exporting ? <CircularProgress size={16} /> : <ExportIcon />}
          onClick={handleExport}
          disabled={exporting}
          size="small"
        >
          {exporting ? '导出中...' : '导出全部'}
        </Button>
        {canEdit && (
          <Button
            variant="outlined"
            startIcon={<ImportIcon />}
            onClick={handleOpenImport}
            size="small"
          >
            导入
          </Button>
        )}
        {canEdit && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/employees/new')}>
            新增员工
          </Button>
        )}
      </Box>

      <DataGrid
        columns={columns}
        rows={employees}
        totalCount={total}
        page={page - 1}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        onSearch={setSearch}
        searchPlaceholder="搜索姓名/工号/邮箱..."
        selectable={canEdit}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {/* 导入弹窗 */}
      <Dialog open={importOpen} onClose={() => !importing && setImportOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>批量导入员工</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              1. 先下载导入模板，按格式填写员工信息后上传
            </Typography>
            <Button variant="text" size="small" onClick={handleDownloadTemplate}>
              下载导入模板
            </Button>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              2. 选择填写好的 Excel 文件上传
            </Typography>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <Button
              variant="contained"
              component="span"
              startIcon={importing ? <CircularProgress size={16} /> : <ImportIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              {importing ? '导入中...' : '选择文件并导入'}
            </Button>
          </Box>

          {/* 导入结果 */}
          {importResult && (
            <Box sx={{ mt: 3 }}>
              <Alert
                severity={importResult.failed === 0 ? 'success' : 'warning'}
                icon={importResult.failed === 0 ? <SuccessIcon /> : <ErrorIcon />}
              >
                导入完成：成功 {importResult.success} 条
                {importResult.failed > 0 && `，失败 ${importResult.failed} 条`}
              </Alert>
              {importResult.errors?.length > 0 && (
                <List dense sx={{ mt: 1, maxHeight: 200, overflow: 'auto' }}>
                  {importResult.errors.map((err, idx) => (
                    <ListItem key={idx} sx={{ py: 0 }}>
                      <ListItemText
                        primary={`第 ${err.row} 行：${err.error}`}
                        primaryTypographyProps={{ variant: 'body2', color: 'error.main' }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportOpen(false)} disabled={importing}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
