import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Card, CardContent, Typography, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, FormControl, InputLabel, Select, Alert,
  CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Tooltip, Stack, Stepper, Step, StepLabel, Divider, Link,
  Checkbox, FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Warning as WarningIcon, Autorenew as RenewIcon,
  AttachFile as AttachFileIcon, Download as DownloadIcon,
  Visibility as ViewIcon, Close as CloseIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import PageHeader from '../../components/PageHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import api from '../../hooks/useFetch';
import useCanEdit from '../../hooks/useCanEdit';
import useAuthStore from '../../store/authStore';
import { useSnackbar } from 'notistack';

const typeMap = {
  FIXED_TERM: '固定期限',
  PROBATION: '试用期',
  OUTSOURCING: '外包',
  INTERNSHIP: '实习',
  UNLIMITED: '无固定期限',
};

const statusMap = {
  ACTIVE: { label: '生效中', color: 'success' },
  PENDING: { label: '待生效', color: 'warning' },
  RENEWED: { label: '已续签', color: 'info' },
  EXPIRED: { label: '已过期', color: 'error' },
  TERMINATED: { label: '已终止', color: 'default' },
};

/* ========= 文件下载/查看辅助函数 ========= */
const downloadAttachment = async (att) => {
  try {
    const response = await api.get(`/contracts/attachments/${att.id}?download=true`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = att.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('下载失败:', err);
  }
};

const viewAttachment = async (att) => {
  try {
    const response = await api.get(`/contracts/attachments/${att.id}`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => window.URL.revokeObjectURL(url), 60000);
  } catch (err) {
    console.error('查看失败:', err);
  }
};

/* ========= 附件列表组件（表单弹窗内） ========= */
function AttachmentList({ attachments, onDelete, canEdit }) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <Box sx={{ mt: 1 }}>
      {attachments.map((att) => (
        <Box
          key={att.id}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1, py: 0.5, px: 1,
            borderRadius: 1, bgcolor: 'grey.50', mb: 0.5,
          }}
        >
          <AttachFileIcon sx={{ fontSize: 18, color: 'error.main' }} />
          <Typography variant="body2" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {att.originalName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {(att.fileSize / 1024).toFixed(1)} KB
          </Typography>
          <Tooltip title="查看"><IconButton size="small" onClick={() => viewAttachment(att)}><ViewIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="下载"><IconButton size="small" onClick={() => downloadAttachment(att)}><DownloadIcon fontSize="small" /></IconButton></Tooltip>
          {canEdit && (
            <Tooltip title="删除附件"><IconButton size="small" color="error" onClick={() => onDelete(att.id)}><CloseIcon fontSize="small" /></IconButton></Tooltip>
          )}
        </Box>
      ))}
    </Box>
  );
}

/* ========= 合同表单弹窗 ========= */
function ContractFormDialog({ open, editing, employees, onClose, onSave }) {
  const [form, setForm] = useState({ contractNo: '', employeeId: '', type: '', startDate: '', endDate: '', terms: '', socialInsuranceAccount: '', hasHousingFund: false, housingFundAccount: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [existingAttachments, setExistingAttachments] = useState([]);

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          contractNo: editing.contractNo || '',
          employeeId: editing.employeeId || '',
          type: editing.type || '',
          startDate: editing.startDate ? new Date(editing.startDate).toISOString().slice(0, 10) : '',
          endDate: editing.endDate ? new Date(editing.endDate).toISOString().slice(0, 10) : '',
          terms: editing.terms || '',
          socialInsuranceAccount: editing.socialInsuranceAccount || '',
          hasHousingFund: editing.hasHousingFund ?? false,
          housingFundAccount: editing.housingFundAccount || '',
        });
        setExistingAttachments(editing.attachments || []);
      } else {
        setForm({ contractNo: '', employeeId: '', type: '', startDate: '', endDate: '', terms: '', socialInsuranceAccount: '', hasHousingFund: false, housingFundAccount: '' });
        setExistingAttachments([]);
      }
      setSelectedFile(null);
      setError('');
    }
  }, [open, editing]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('仅支持 PDF 文件');
      e.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('文件大小不能超过 10MB');
      e.target.value = '';
      return;
    }
    setError('');
    setSelectedFile(file);
  };

  const handleDeleteExistingAttachment = async (attachmentId) => {
    try {
      await api.delete(`/contracts/attachments/${attachmentId}`);
      setExistingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch (err) {
      setError(err.message || '删除附件失败');
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.employeeId) { setError('请选择员工'); return; }
    if (!form.type) { setError('请选择合同类型'); return; }
    if (!form.startDate) { setError('请选择开始日期'); return; }
    if (!form.endDate) { setError('请选择结束日期'); return; }
    setSaving(true);
    try {
      const payload = {
        contractNo: form.contractNo || null,
        employeeId: form.employeeId,
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        terms: form.terms || null,
        socialInsuranceAccount: form.socialInsuranceAccount || null,
        hasHousingFund: form.hasHousingFund,
        housingFundAccount: form.hasHousingFund ? (form.housingFundAccount || null) : null,
      };
      let savedContract;
      if (editing) {
        const res = await api.put(`/contracts/${editing.id}`, payload);
        savedContract = res.data.data || res;
      } else {
        const res = await api.post('/contracts', payload);
        savedContract = res.data.data || res;
      }

      // 上传附件
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        await api.post(`/contracts/${savedContract.id}/attachments`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      onSave();
    } catch (err) {
      setError(err.message || '操作失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editing ? '编辑合同' : '新建合同'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <FormControl fullWidth margin="normal" required>
          <InputLabel>员工</InputLabel>
          <Select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} label="员工">
            <MenuItem value="" disabled>请选择员工</MenuItem>
            {employees.map((emp) => (
              <MenuItem key={emp.id} value={emp.id}>{emp.name}（{emp.employeeNo}）</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          fullWidth label="合同编号" margin="normal"
          value={form.contractNo}
          onChange={(e) => setForm({ ...form, contractNo: e.target.value })}
          placeholder="留空则自动生成"
          helperText="格式：HT-年月日-序号，留空自动生成"
        />
        <FormControl fullWidth margin="normal" required>
          <InputLabel>合同类型</InputLabel>
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} label="合同类型">
            {Object.entries(typeMap).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField fullWidth type="date" label="开始日期" margin="normal" required InputLabelProps={{ shrink: true }}
          value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        <TextField fullWidth type="date" label="结束日期" margin="normal" required InputLabelProps={{ shrink: true }}
          value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
        <TextField fullWidth label="合同条款" margin="normal" multiline rows={3}
          value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} placeholder="可选填写合同主要条款" />

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>社保与公积金</Typography>
        <TextField fullWidth label="社保账户名称" margin="normal"
          value={form.socialInsuranceAccount}
          onChange={(e) => setForm({ ...form, socialInsuranceAccount: e.target.value })}
          placeholder="请输入社保账户名称" />
        <FormControlLabel
          sx={{ mt: 1, mb: 0 }}
          control={
            <Checkbox
              checked={form.hasHousingFund}
              onChange={(e) => setForm({ ...form, hasHousingFund: e.target.checked, housingFundAccount: e.target.checked ? form.housingFundAccount : '' })}
              color="primary"
            />
          }
          label="是否缴纳公积金"
        />
        {form.hasHousingFund && (
          <TextField fullWidth label="公积金账户名称" margin="normal"
            value={form.housingFundAccount}
            onChange={(e) => setForm({ ...form, housingFundAccount: e.target.value })}
            placeholder="请输入公积金账户名称" />
        )}

        {/* 已有附件 */}
        {existingAttachments.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>已有附件：</Typography>
            <AttachmentList
              attachments={existingAttachments}
              onDelete={handleDeleteExistingAttachment}
              canEdit
            />
          </Box>
        )}

        {/* 上传附件 */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            {editing ? '添加新附件：' : '上传合同附件：'}
          </Typography>
          <Button variant="outlined" component="label" startIcon={<AttachFileIcon />} size="small">
            选择 PDF 文件
            <input type="file" hidden accept=".pdf,application/pdf" onChange={handleFileChange} />
          </Button>
          {selectedFile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <AttachFileIcon sx={{ fontSize: 18, color: 'error.main' }} />
              <Typography variant="body2">{selectedFile.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                ({(selectedFile.size / 1024).toFixed(1)} KB)
              </Typography>
              <IconButton size="small" onClick={() => setSelectedFile(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : editing ? '保存' : '创建'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ========= 续签弹窗 ========= */
function RenewDialog({ open, contract, onClose, onSuccess }) {
  const [form, setForm] = useState({ contractNo: '', type: '', startDate: '', endDate: '', terms: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (open && contract) {
      // 默认：新合同开始日期 = 原合同结束日期 + 1天
      const origEnd = new Date(contract.endDate);
      const newStart = new Date(origEnd);
      newStart.setDate(newStart.getDate() + 1);
      // 默认合同期限 = 原合同期限
      const origDuration = (new Date(contract.endDate) - new Date(contract.startDate)) / (1000 * 60 * 60 * 24);
      const newEnd = new Date(newStart);
      newEnd.setDate(newEnd.getDate() + origDuration);

      setForm({
        contractNo: '',
        type: contract.type || 'FIXED_TERM',
        startDate: newStart.toISOString().slice(0, 10),
        endDate: newEnd.toISOString().slice(0, 10),
        terms: contract.terms || '',
      });
      setError('');
      setSelectedFile(null);
    }
  }, [open, contract]);

  if (!contract) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('仅支持 PDF 文件');
      e.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('文件大小不能超过 10MB');
      e.target.value = '';
      return;
    }
    setError('');
    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.startDate) { setError('请选择新合同开始日期'); return; }
    if (!form.endDate) { setError('请选择新合同结束日期'); return; }
    setSaving(true);
    try {
      const res = await api.post(`/contracts/${contract.id}/renew`, {
        contractNo: form.contractNo || null,
        startDate: form.startDate,
        endDate: form.endDate,
        type: form.type,
        terms: form.terms || null,
      });
      // 续签成功后，上传附件到新合同
      const newContract = res.data.data || res;
      if (selectedFile && newContract.id) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        await api.post(`/contracts/${newContract.id}/attachments`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      onSuccess();
    } catch (err) {
      setError(err.message || '续签失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <RenewIcon color="primary" />
        合同续签
      </DialogTitle>
      <DialogContent>
        {/* 原合同信息 */}
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight={500}>原合同信息</Typography>
          <Typography variant="body2">
            员工：{contract.employee?.name} | 类型：{typeMap[contract.type] || contract.type}
          </Typography>
          <Typography variant="body2">
            期限：{new Date(contract.startDate).toLocaleDateString()} ~ {new Date(contract.endDate).toLocaleDateString()}
          </Typography>
        </Alert>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField
          fullWidth label="新合同编号" margin="normal"
          value={form.contractNo}
          onChange={(e) => setForm({ ...form, contractNo: e.target.value })}
          placeholder="留空则自动生成"
          helperText="格式：HT-年月日-序号，留空自动生成"
        />

        <FormControl fullWidth margin="normal">
          <InputLabel>新合同类型</InputLabel>
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} label="新合同类型">
            {Object.entries(typeMap).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField
          fullWidth type="date" label="新合同开始日期" margin="normal" required
          InputLabelProps={{ shrink: true }}
          value={form.startDate}
          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          helperText="默认为原合同结束日期的次日"
        />
        <TextField
          fullWidth type="date" label="新合同结束日期" margin="normal" required
          InputLabelProps={{ shrink: true }}
          value={form.endDate}
          onChange={(e) => setForm({ ...form, endDate: e.target.value })}
          helperText="默认与原合同等长"
        />
        <TextField
          fullWidth label="新合同条款" margin="normal" multiline rows={2}
          value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })}
          placeholder="可修改新合同条款"
        />

        {/* 上传新合同附件 */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            上传新合同附件：
          </Typography>
          <Button variant="outlined" component="label" startIcon={<AttachFileIcon />} size="small">
            选择 PDF 文件
            <input type="file" hidden accept=".pdf,application/pdf" onChange={handleFileChange} />
          </Button>
          {selectedFile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <AttachFileIcon sx={{ fontSize: 18, color: 'error.main' }} />
              <Typography variant="body2">{selectedFile.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                ({(selectedFile.size / 1024).toFixed(1)} KB)
              </Typography>
              <IconButton size="small" onClick={() => setSelectedFile(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" color="primary" onClick={handleSubmit} disabled={saving} startIcon={<RenewIcon />}>
          {saving ? <CircularProgress size={20} color="inherit" /> : '确认续签'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ========= 续签历史弹窗 ========= */
function RenewalHistoryDialog({ open, contract, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && contract) {
      setLoading(true);
      api.get(`/contracts/${contract.id}/renewal-history`)
        .then((res) => setHistory(res.data || []))
        .catch(() => setHistory([]))
        .finally(() => setLoading(false));
    }
  }, [open, contract]);

  if (!contract) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <HistoryIcon color="primary" />
        续签历史 - {contract.employee?.name || '未知员工'}
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        ) : history.length <= 1 ? (
          <Alert severity="info">该合同暂无续签记录</Alert>
        ) : (
          <Stepper orientation="vertical" nonLinear>
            {history.map((item, idx) => (
              <Step key={item.id} active expanded>
                <StepLabel
                  optional={
                    <Typography variant="caption" color="text.secondary">
                      {typeMap[item.type] || item.type}
                    </Typography>
                  }
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    {item.contractNo && (
                      <Typography variant="body2" fontFamily="monospace" color="text.secondary" sx={{ mr: 0.5 }}>
                        {item.contractNo}
                      </Typography>
                    )}
                    <Chip
                      label={statusMap[item.status]?.label || item.status}
                      size="small"
                      color={statusMap[item.status]?.color || 'default'}
                    />
                    <Typography variant="body2">
                      {new Date(item.startDate).toLocaleDateString()} ~ {new Date(item.endDate).toLocaleDateString()}
                    </Typography>
                    {item.id === contract.id && (
                      <Chip label="当前" size="small" color="primary" variant="outlined" />
                    )}
                  </Stack>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ========= 附件详情弹窗 ========= */
function AttachmentDetailDialog({ open, contract, onClose, onDelete, canEdit }) {
  if (!contract) return null;
  const attachments = contract.attachments || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        附件管理 - {contract.employee?.name || '未知员工'}
      </DialogTitle>
      <DialogContent>
        {attachments.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>暂无附件</Typography>
        ) : (
          <AttachmentList attachments={attachments} onDelete={onDelete} canEdit={canEdit} />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ========= 主页面 ========= */
export default function ContractList() {
  const canEdit = useCanEdit();
  const user = useAuthStore((s) => s.user);
  const isRestrictedRole = user?.role === 'MANAGER' || user?.role === 'EMPLOYEE';
  const [contracts, setContracts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [attDialogContract, setAttDialogContract] = useState(null);
  const [renewContract, setRenewContract] = useState(null);
  const [historyContract, setHistoryContract] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [highlightedId, setHighlightedId] = useState(null);
  const [pendingScrollId, setPendingScrollId] = useState(null);
  const prevPageSizeRef = useRef(10);
  const { enqueueSnackbar } = useSnackbar();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, pageSize };
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;
      if (filterSearch) params.search = filterSearch;
      if (filterDepartment) params.departmentId = filterDepartment;
      const res = await api.get('/contracts', { params });
      setContracts(res.data.data);
      setTotal(res.data.total);
    } catch { setMessage({ type: 'error', text: '加载数据失败' }); }
    finally { setLoading(false); }
  }, [page, pageSize, filterType, filterStatus, filterSearch, filterDepartment]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const highlightAndScroll = (id) => {
    setHighlightedId(id);
    setTimeout(() => {
      const row = document.querySelector(`[data-contract-id="${id}"]`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    setTimeout(() => setHighlightedId(null), 3000);
  };

  const scrollToContract = (contractId) => {
    if (contracts.some((c) => c.id === contractId)) {
      highlightAndScroll(contractId);
    } else {
      // 目标不在当前页，临时加载全部数据来定位
      prevPageSizeRef.current = pageSize;
      setPageSize(1000);
      setPage(1);
      setPendingScrollId(contractId);
    }
  };

  // 续签跳转：当数据加载完成后，执行挂起的滚动
  useEffect(() => {
    if (pendingScrollId && !loading) {
      const found = contracts.some((c) => c.id === pendingScrollId);
      if (found) {
        highlightAndScroll(pendingScrollId);
        // 滚动高亮结束后恢复原来的每页条数（高亮持续3秒）
        setTimeout(() => setPageSize(prevPageSizeRef.current), 3500);
      } else {
        // 即便放大到1000条也没找到，恢复页码
        setPageSize(prevPageSizeRef.current);
      }
      setPendingScrollId(null);
    }
    // eslint-disable-next-line
  }, [loading, contracts]);

  // 加载员工列表（用于表单下拉）
  useEffect(() => {
    api.get('/employees?pageSize=1000').then((res) => setEmployees(res.data.data || [])).catch(() => {});
    api.get('/departments/flat').then((res) => {
      const allDepts = res.data || [];
      if (isRestrictedRole && user?.employee?.departmentId) {
        // MANAGER/EMPLOYEE 只显示本部门
        setDepartments(allDepts.filter((d) => d.id === user.employee.departmentId));
      } else {
        setDepartments(allDepts);
      }
    }).catch(() => {});
  }, []);

  const handleSave = () => {
    setFormOpen(false);
    setEditing(null);
    enqueueSnackbar(editing ? '合同已更新' : '合同已创建', { variant: 'success' });
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/contracts/${deleteTarget.id}`);
      enqueueSnackbar('合同已删除', { variant: 'success' });
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.message || '删除失败', { variant: 'error' });
      setDeleteTarget(null);
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    try {
      await api.delete(`/contracts/attachments/${attachmentId}`);
      enqueueSnackbar('附件已删除', { variant: 'success' });
      // 更新弹窗中的附件列表
      if (attDialogContract) {
        setAttDialogContract({
          ...attDialogContract,
          attachments: attDialogContract.attachments.filter((a) => a.id !== attachmentId),
        });
      }
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.message || '删除附件失败', { variant: 'error' });
    }
  };

  const handleRenewSuccess = () => {
    setRenewContract(null);
    enqueueSnackbar('合同续签成功', { variant: 'success' });
    fetchData();
  };

  // 统计
  const expiringSoon = contracts.filter((c) => {
    if (c.status !== 'ACTIVE') return false;
    const end = new Date(c.endDate);
    const now = new Date();
    const diff = (end - now) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 30;
  }).length;

  const renewedCount = contracts.filter((c) => c.renewedFromId).length;

  /** 判断合同是否可续签：仅 ACTIVE、RENEWED 或 EXPIRED 状态且未被续签过 */
  const canRenew = (c) => {
    if (!canEdit) return false;
    if (c.renewedTo) return false; // 已有续签合同
    return c.status === 'ACTIVE' || c.status === 'RENEWED' || c.status === 'EXPIRED';
  };

  /** 判断是否有续签历史 */
  const hasRenewalHistory = (c) => {
    return c.renewedFromId || c.renewedTo;
  };

  return (
    <Box>
      <PageHeader title="合同管理" breadcrumbs={['合同管理']} />

      {message.text && <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>{message.text}</Alert>}

      {/* 统计卡片 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ flex: 1, minWidth: 140 }}>
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="body2" color="text.secondary">合同总数</Typography>
            <Typography variant="h4" fontWeight="bold" color="primary">{total}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 140 }}>
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="body2" color="text.secondary">生效中</Typography>
            <Typography variant="h4" fontWeight="bold" color="success.main">{contracts.filter((c) => c.status === 'ACTIVE').length}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 140 }}>
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="body2" color="text.secondary">即将到期（30天内）</Typography>
            <Typography variant="h4" fontWeight="bold" color="warning.main">{expiringSoon}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 140 }}>
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="body2" color="text.secondary">已续签</Typography>
            <Typography variant="h4" fontWeight="bold" color="info.main">{renewedCount}</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 筛选 + 操作 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small" placeholder="搜索员工姓名/合同编号"
          value={filterSearch}
          onChange={(e) => { setFilterSearch(e.target.value); setPage(1); }}
          sx={{ minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>部门</InputLabel>
          <Select value={filterDepartment} onChange={(e) => { setFilterDepartment(e.target.value); setPage(1); }} label="部门">
            <MenuItem value="">全部</MenuItem>
            {departments.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>合同类型</InputLabel>
          <Select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }} label="合同类型">
            <MenuItem value="">全部</MenuItem>
            {Object.entries(typeMap).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>状态</InputLabel>
          <Select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} label="状态">
            <MenuItem value="">全部</MenuItem>
            {Object.entries(statusMap).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
          </Select>
        </FormControl>
        <Box sx={{ flex: 1 }} />
        {canEdit && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setFormOpen(true); }}>新建合同</Button>
        )}
      </Box>

      {/* 表格 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>员工</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>合同编号</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>部门</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>类型</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>开始日期</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>结束日期</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">附件</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {contracts.length === 0 ? (
                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>暂无合同记录</TableCell></TableRow>
              ) : contracts.map((c) => {
                const isExpiring = c.status === 'ACTIVE' && (() => {
                  const diff = (new Date(c.endDate) - new Date()) / (1000 * 60 * 60 * 24);
                  return diff > 0 && diff <= 30;
                })();
                const isExpired = c.status === 'EXPIRED';
                const attCount = c.attachments?.length || 0;
                const isRenewed = Boolean(c.renewedTo);
                return (
                  <TableRow
                    key={c.id}
                    hover
                    data-contract-id={c.id}
                    sx={
                      highlightedId === c.id
                        ? { bgcolor: '#e3f2fd', transition: 'background-color 0.6s ease' }
                        : isExpired && !isRenewed
                          ? { bgcolor: 'rgba(255,0,0,0.04)' }
                          : {}
                    }
                  >
                    <TableCell>{c.employee?.name || '-'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace" color="text.secondary">
                        {c.contractNo || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>{c.employee?.department?.name || '-'}</TableCell>
                    <TableCell><Chip label={typeMap[c.type] || c.type} size="small" variant="outlined" /></TableCell>
                    <TableCell>{new Date(c.startDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {new Date(c.endDate).toLocaleDateString()}
                        {isExpiring && <WarningIcon sx={{ color: 'warning.main', fontSize: 18 }} />}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Chip label={statusMap[c.status]?.label || c.status} color={statusMap[c.status]?.color || 'default'} size="small" />
                        {isRenewed && (
                          <Tooltip title="已续签">
                            <Chip label="已续签" size="small" color="info" variant="outlined" icon={<RenewIcon sx={{ fontSize: 14 }} />} />
                          </Tooltip>
                        )}
                        {c.renewedFromId && (
                          <Tooltip title="续签自上一份合同，点击跳转">
                            <Chip
                              label="续签"
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ cursor: 'pointer' }}
                              onClick={() => scrollToContract(c.renewedFromId)}
                            />
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="center">
                      {attCount > 0 ? (
                        <Tooltip
                          title={
                            <Box>
                              {c.attachments.map((att) => (
                                <Typography key={att.id} variant="caption" display="block">
                                  {att.originalName}
                                </Typography>
                              ))}
                              <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>点击查看详情</Typography>
                            </Box>
                          }
                        >
                          <Chip
                            icon={<AttachFileIcon sx={{ fontSize: 16 }} />}
                            label={attCount}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ cursor: 'pointer' }}
                            onClick={() => setAttDialogContract(c)}
                          />
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        {attCount > 0 && (
                          <Tooltip title="查看第一个附件">
                            <IconButton size="small" color="info"
                              onClick={() => viewAttachment(c.attachments[0])}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {attCount > 0 && (
                          <Tooltip title="下载第一个附件">
                            <IconButton size="small" color="secondary"
                              onClick={() => downloadAttachment(c.attachments[0])}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {/* 续签按钮：即将到期/已过期且未被续签 */}
                        {canRenew(c) && (
                          <Tooltip title={isExpiring ? '即将到期，点击续签' : isExpired ? '合同已过期，点击续签' : '续签合同'}>
                            <IconButton size="small" color="warning"
                              onClick={() => setRenewContract(c)}
                            >
                              <RenewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {/* 续签历史按钮 */}
                        {hasRenewalHistory(c) && (
                          <Tooltip title="查看续签历史">
                            <IconButton size="small" color="info"
                              onClick={() => setHistoryContract(c)}
                            >
                              <HistoryIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canEdit && (
                          <>
                            <Tooltip title="编辑"><IconButton size="small" color="primary" onClick={() => { setEditing(c); setFormOpen(true); }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="删除"><IconButton size="small" color="error" onClick={() => setDeleteTarget(c)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                          </>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 分页 */}
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 2 }}>
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <Select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          >
            <MenuItem value={10}>每页 10 条</MenuItem>
            <MenuItem value={20}>每页 20 条</MenuItem>
            <MenuItem value={50}>每页 50 条</MenuItem>
            <MenuItem value={100}>每页 100 条</MenuItem>
          </Select>
        </FormControl>
        <Button disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
        <Typography sx={{ px: 3, py: 1 }}>第 {page} 页 / 共 {Math.ceil(total / pageSize)} 页</Typography>
        <Button disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage(page + 1)}>下一页</Button>
      </Box>

      <ContractFormDialog open={formOpen} editing={editing} employees={employees} onClose={() => { setFormOpen(false); setEditing(null); }} onSave={handleSave} />
      <RenewDialog open={Boolean(renewContract)} contract={renewContract} onClose={() => setRenewContract(null)} onSuccess={handleRenewSuccess} />
      <RenewalHistoryDialog open={Boolean(historyContract)} contract={historyContract} onClose={() => setHistoryContract(null)} />
      <ConfirmDialog open={Boolean(deleteTarget)} title="删除合同" message={deleteTarget ? `确定要删除该合同吗？` : ''} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      <AttachmentDetailDialog
        open={Boolean(attDialogContract)}
        contract={attDialogContract}
        onClose={() => setAttDialogContract(null)}
        onDelete={handleDeleteAttachment}
        canEdit={canEdit}
      />
    </Box>
  );
}
