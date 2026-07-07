import { useState, useEffect, useRef } from 'react';
import {
  Box, Button, Grid, Card, CardContent, Typography, TextField, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Chip,
  Tooltip, InputAdornment, CircularProgress, Alert, LinearProgress,
} from '@mui/material';
import {
  FileDownload as ExportIcon, FileUpload as ImportIcon,
  Delete as DeleteIcon, Edit as EditIcon, Visibility as ViewIcon,
  Download as TemplateIcon, Refresh as RefreshIcon,
  Search as SearchIcon, Warning as WarningIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import PageHeader from '../../components/PageHeader';
import api from '../../hooks/useFetch';

const EARNING_FIELDS = [
  { key: 'baseWage', label: '基本/计件工资' },
  { key: 'performanceBonus', label: '绩效工资' },
  { key: 'overtimePay', label: '加班费' },
  { key: 'commission', label: '提成' },
  { key: 'fullAttendanceBonus', label: '全勤奖' },
  { key: 'seniorityAllowance', label: '工龄补贴' },
  { key: 'partyMemberSubsidy', label: '党员补贴' },
  { key: 'certificateSubsidy', label: '证书补贴' },
  { key: 'positionAllowance', label: '岗位津贴' },
  { key: 'educationSubsidy', label: '学历补贴' },
  { key: 'technicianSubsidy', label: '技术员补贴' },
  { key: 'filialSubsidy', label: '孝心补贴' },
  { key: 'highTempSubsidy', label: '高温补贴' },
  { key: 'paidAnnualLeave', label: '带薪年休假' },
  { key: 'otherSubsidy', label: '其他补贴' },
  { key: 'welfareFee', label: '福利费' },
  { key: 'rewardItem', label: '奖励项' },
  { key: 'penaltyItem', label: '处罚项' },
];

const DEDUCTION_FIELDS = [
  { key: 'individualTax', label: '个税' },
  { key: 'socialInsurance', label: '社保' },
  { key: 'housingFund', label: '公积金' },
  { key: 'partyFee', label: '党费' },
  { key: 'otherDeduction', label: '其他扣款' },
];

const ALL_MONEY_FIELDS = [...EARNING_FIELDS, ...DEDUCTION_FIELDS];

function fmt(n) {
  const v = Number(n) || 0;
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SalaryManage() {
  const { enqueueSnackbar } = useSnackbar();
  const fileInputRef = useRef(null);

  const [list, setList] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // 筛选
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [department, setDepartment] = useState('');
  const [search, setSearch] = useState('');

  // 弹窗
  const [editDialog, setEditDialog] = useState({ open: false, data: null });
  const [viewDialog, setViewDialog] = useState({ open: false, data: null });
  const [importResult, setImportResult] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, month: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [listRes, summaryRes] = await Promise.all([
        api.get('/payroll/records', { params: { month, department, search, page, pageSize } }),
        api.get('/payroll/summary', { params: { month } }),
      ]);
      setList(listRes.data.data);
      setTotal(listRes.data.total);
      setSummary(summaryRes.data);
    } catch (err) {
      enqueueSnackbar(err.message || '加载失败', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [month, page]);

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const handleExport = async () => {
    try {
      const resp = await api.get('/payroll/export', {
        params: { month, department },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `工资表_${month || 'all'}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      enqueueSnackbar('导出成功', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err.message || '导出失败', { variant: 'error' });
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const resp = await api.get('/payroll/template', {
        params: { month },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = '工资表导入模板.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      enqueueSnackbar(err.message || '下载失败', { variant: 'error' });
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const resp = await api.post('/payroll/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(resp.data);
      enqueueSnackbar(`导入完成：成功 ${resp.data.success} 条，失败 ${resp.data.failed} 条`, {
        variant: resp.data.failed > 0 ? 'warning' : 'success',
      });
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.message || '导入失败', { variant: 'error' });
    }
  };

  const handleSaveEdit = async () => {
    try {
      await api.put(`/payroll/records/${editDialog.data.id}`, editDialog.data);
      enqueueSnackbar('保存成功', { variant: 'success' });
      setEditDialog({ open: false, data: null });
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.message || '保存失败', { variant: 'error' });
    }
  };

  const handleDeleteMonth = async () => {
    try {
      const resp = await api.delete('/payroll/records', { params: { month: deleteDialog.month } });
      enqueueSnackbar(`已删除 ${resp.data.deleted} 条记录`, { variant: 'success' });
      setDeleteDialog({ open: false, month: '' });
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.message || '删除失败', { variant: 'error' });
    }
  };

  const updateEditField = (key, val) => {
    setEditDialog({ ...editDialog, data: { ...editDialog.data, [key]: val } });
  };

  return (
    <Box>
      <div style={{
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto',
        height: 'calc(100vh - 112px)',
        width: '100%',
        overflow: 'hidden',
      }}>
        {/* ── 第一行：固定区（标题 + 工具栏 + 统计卡片）── */}
        <div>
          <PageHeader title="工资管理" breadcrumbs={['工资管理']} />

          {/* 工具栏 */}
          <Box sx={{ display: 'flex', gap: 1.5, mb: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              type="month" size="small" label="月份" value={month}
              onChange={(e) => setMonth(e.target.value)} InputLabelProps={{ shrink: true }}
              sx={{ width: 150 }}
            />
            <TextField
              size="small" label="部门" value={department}
              onChange={(e) => setDepartment(e.target.value)}
              sx={{ width: 150 }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <TextField
              size="small" label="搜索姓名/工号" value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
              sx={{ width: 200 }}
            />
            <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={handleSearch}>查询</Button>
            <Box sx={{ flexGrow: 1 }} />
            <Tooltip title="下载导入模板">
              <Button variant="outlined" size="small" startIcon={<TemplateIcon />} onClick={handleDownloadTemplate}>模板</Button>
            </Tooltip>
            <Button variant="outlined" size="small" startIcon={<ImportIcon />} onClick={handleImportClick}>导入</Button>
            <Button variant="contained" size="small" startIcon={<ExportIcon />} onClick={handleExport}>导出</Button>
            <Tooltip title="删除整月数据">
              <Button variant="outlined" size="small" color="error" startIcon={<DeleteIcon />}
                onClick={() => setDeleteDialog({ open: true, month })}>清空</Button>
            </Tooltip>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleImportFile} />
          </Box>

          {/* 统计卡片 */}
          {summary && summary.employeeCount > 0 && (
            <Grid container spacing={1} sx={{ mb: 1 }}>
              <Grid item xs={6} md={2}>
                <Card><CardContent>
                  <Typography variant="body2" color="text.secondary">人数</Typography>
                  <Typography variant="h5" fontWeight="bold">{summary.employeeCount}</Typography>
                </CardContent></Card>
              </Grid>
              <Grid item xs={6} md={2}>
                <Card><CardContent>
                  <Typography variant="body2" color="text.secondary">应付总额</Typography>
                  <Typography variant="h5" fontWeight="bold">¥{fmt(summary.totalGross)}</Typography>
                </CardContent></Card>
              </Grid>
              <Grid item xs={6} md={2}>
                <Card><CardContent>
                  <Typography variant="body2" color="text.secondary">扣款总额</Typography>
                  <Typography variant="h5" fontWeight="bold" color="error.main">¥{fmt(summary.totalDeduction)}</Typography>
                </CardContent></Card>
              </Grid>
              <Grid item xs={6} md={2}>
                <Card><CardContent>
                  <Typography variant="body2" color="text.secondary">实付总额</Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main">¥{fmt(summary.totalNet)}</Typography>
                </CardContent></Card>
              </Grid>
              <Grid item xs={6} md={2}>
                <Card><CardContent>
                  <Typography variant="body2" color="text.secondary">个税合计</Typography>
                  <Typography variant="h6" fontWeight="bold">¥{fmt(summary.totalTax)}</Typography>
                </CardContent></Card>
              </Grid>
              <Grid item xs={6} md={2}>
                <Card><CardContent>
                  <Typography variant="body2" color="text.secondary">社保+公积金</Typography>
                  <Typography variant="h6" fontWeight="bold">¥{fmt(summary.totalSocial + summary.totalFund)}</Typography>
                </CardContent></Card>
              </Grid>
            </Grid>
          )}
        </div>

        {/* ── 第二行：表格滚动区（1fr 自适应剩余高度）── */}
        <div style={{ overflowX: 'auto', overflowY: 'auto' }}>
          {loading && <LinearProgress />}
          <div style={{ minWidth: 'max-content' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 60 }}>序号</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 80 }}>工号</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 80 }}>姓名</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>部门</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 80 }}>岗位</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 70 }} align="right">出勤(天)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }} align="right">基本工资</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 90 }} align="right">绩效工资</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 80 }} align="right">加班费</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }} align="right">岗位津贴</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }} align="right">应付工资</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 80 }} align="right">个税</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 80 }} align="right">社保</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 80 }} align="right">公积金</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }} align="right">扣款小计</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 110 }} align="right">实付工资</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={17} align="center">
                      <Typography color="text.secondary" sx={{ py: 3 }}>暂无数据，请导入工资表</Typography>
                    </TableCell>
                  </TableRow>
                )}
                {list.map((r, i) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{(page - 1) * pageSize + i + 1}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{r.employeeNo}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.department || '-'}</TableCell>
                    <TableCell>{r.position || '-'}</TableCell>
                    <TableCell align="right">{r.attendanceDays || 0}</TableCell>
                    <TableCell align="right">{fmt(r.baseWage)}</TableCell>
                    <TableCell align="right">{fmt(r.performanceBonus)}</TableCell>
                    <TableCell align="right">{fmt(r.overtimePay)}</TableCell>
                    <TableCell align="right">{fmt(r.positionAllowance)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{fmt(r.grossPay)}</TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>{fmt(r.individualTax)}</TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>{fmt(r.socialInsurance)}</TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>{fmt(r.housingFund)}</TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>{fmt(r.totalDeduction)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>{fmt(r.netPay)}</TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => setViewDialog({ open: true, data: r })} title="查看">
                        <ViewIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setEditDialog({ open: true, data: { ...r } })} title="编辑">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* ── 第三行：分页（固定底部）── */}
        {total > pageSize && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1, gap: 1, alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              共 {total} 条
            </Typography>
            <Button size="small" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
            <Typography variant="body2">第 {page} 页</Typography>
            <Button size="small" disabled={page * pageSize >= total} onClick={() => setPage(page + 1)}>下一页</Button>
          </Box>
        )}
      </div>

      {/* 查看详情弹窗 */}
      <Dialog open={viewDialog.open} onClose={() => setViewDialog({ open: false, data: null })} maxWidth="md" fullWidth>
        <DialogTitle>工资详情 — {viewDialog.data?.name}（{viewDialog.data?.month}）</DialogTitle>
        <DialogContent>
          {viewDialog.data && (
            <Box>
              {/* 基本信息 */}
              <Typography variant="subtitle2" sx={{ mt: 1, mb: 1, color: 'primary.main' }}>基本信息</Typography>
              <Grid container spacing={1} sx={{ mb: 2 }}>
                {[
                  ['公司', viewDialog.data.company],
                  ['部门', viewDialog.data.department],
                  ['班组', viewDialog.data.team],
                  ['岗位', viewDialog.data.position],
                  ['岗位层级', viewDialog.data.positionLevel],
                  ['岗位类别', viewDialog.data.positionCategory],
                  ['工号', viewDialog.data.employeeNo],
                  ['计薪方式', viewDialog.data.payMethod],
                  ['状态', viewDialog.data.status],
                  ['出勤天数', viewDialog.data.attendanceDays],
                  ['工资卡银行', viewDialog.data.bankName],
                  ['银行卡号', viewDialog.data.bankAccount],
                ].map(([label, val]) => (
                  <Grid item xs={4} key={label}>
                    <Typography variant="body2"><strong>{label}：</strong>{val || '-'}</Typography>
                  </Grid>
                ))}
              </Grid>

              {/* 薪资项 */}
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'success.main' }}>薪资项（+）</Typography>
              <Table size="small" sx={{ mb: 2 }}>
                <TableBody>
                  {EARNING_FIELDS.map((f, i) => (
                    <TableRow key={f.key} sx={{ bgcolor: i % 2 === 0 ? 'action.hover' : '' }}>
                      <TableCell sx={{ width: '50%' }}>{f.label}</TableCell>
                      <TableCell align="right">{fmt(viewDialog.data[f.key])}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: 'success.light' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>应付工资</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{fmt(viewDialog.data.grossPay)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* 扣款项 */}
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'error.main' }}>扣款项（-）</Typography>
              <Table size="small">
                <TableBody>
                  {DEDUCTION_FIELDS.map((f, i) => (
                    <TableRow key={f.key} sx={{ bgcolor: i % 2 === 0 ? 'action.hover' : '' }}>
                      <TableCell sx={{ width: '50%' }}>{f.label}</TableCell>
                      <TableCell align="right">{fmt(viewDialog.data[f.key])}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: 'error.light' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>扣款小计</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{fmt(viewDialog.data.totalDeduction)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Box sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 1, textAlign: 'center' }}>
                <Typography variant="h6" fontWeight="bold">
                  实付工资：¥{fmt(viewDialog.data.netPay)}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog({ open: false, data: null })}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 编辑弹窗 */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, data: null })} maxWidth="md" fullWidth>
        <DialogTitle>编辑工资 — {editDialog.data?.name}（{editDialog.data?.month}）</DialogTitle>
        <DialogContent>
          {editDialog.data && (
            <Box>
              <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                <Grid item xs={3}><TextField fullWidth size="small" label="公司" value={editDialog.data.company || ''} onChange={(e) => updateEditField('company', e.target.value)} /></Grid>
                <Grid item xs={3}><TextField fullWidth size="small" label="部门" value={editDialog.data.department || ''} onChange={(e) => updateEditField('department', e.target.value)} /></Grid>
                <Grid item xs={3}><TextField fullWidth size="small" label="班组" value={editDialog.data.team || ''} onChange={(e) => updateEditField('team', e.target.value)} /></Grid>
                <Grid item xs={3}><TextField fullWidth size="small" label="岗位" value={editDialog.data.position || ''} onChange={(e) => updateEditField('position', e.target.value)} /></Grid>
                <Grid item xs={3}><TextField fullWidth size="small" label="岗位层级" value={editDialog.data.positionLevel || ''} onChange={(e) => updateEditField('positionLevel', e.target.value)} /></Grid>
                <Grid item xs={3}><TextField fullWidth size="small" label="岗位类别" value={editDialog.data.positionCategory || ''} onChange={(e) => updateEditField('positionCategory', e.target.value)} /></Grid>
                <Grid item xs={3}><TextField fullWidth size="small" label="计薪方式" value={editDialog.data.payMethod || ''} onChange={(e) => updateEditField('payMethod', e.target.value)} /></Grid>
                <Grid item xs={3}><TextField fullWidth size="small" type="number" label="出勤天数" value={editDialog.data.attendanceDays || 0} onChange={(e) => updateEditField('attendanceDays', Number(e.target.value))} /></Grid>
              </Grid>

              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: 'success.main' }}>薪资项</Typography>
              <Grid container spacing={1}>
                {EARNING_FIELDS.map((f) => (
                  <Grid item xs={3} key={f.key}>
                    <TextField fullWidth size="small" type="number" label={f.label}
                      value={editDialog.data[f.key] ?? 0}
                      onChange={(e) => updateEditField(f.key, Number(e.target.value))}
                      InputProps={{ inputProps: { step: '0.01' } }}
                    />
                  </Grid>
                ))}
              </Grid>

              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: 'error.main' }}>扣款项</Typography>
              <Grid container spacing={1}>
                {DEDUCTION_FIELDS.map((f) => (
                  <Grid item xs={3} key={f.key}>
                    <TextField fullWidth size="small" type="number" label={f.label}
                      value={editDialog.data[f.key] ?? 0}
                      onChange={(e) => updateEditField(f.key, Number(e.target.value))}
                      InputProps={{ inputProps: { step: '0.01' } }}
                    />
                  </Grid>
                ))}
              </Grid>

              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>银行信息</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={4}><TextField fullWidth size="small" label="工资卡银行" value={editDialog.data.bankName || ''} onChange={(e) => updateEditField('bankName', e.target.value)} /></Grid>
                <Grid item xs={8}><TextField fullWidth size="small" label="银行卡号" value={editDialog.data.bankAccount || ''} onChange={(e) => updateEditField('bankAccount', e.target.value)} /></Grid>
              </Grid>

              <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.100', borderRadius: 1, display: 'flex', gap: 3 }}>
                <Typography><strong>应付工资：</strong>¥{fmt(editDialog.data.grossPay)}</Typography>
                <Typography><strong>扣款小计：</strong>¥{fmt(editDialog.data.totalDeduction)}</Typography>
                <Typography color="success.main"><strong>实付工资：¥{fmt(editDialog.data.netPay)}</strong></Typography>
                <Typography variant="caption" color="text.secondary">（保存时自动重算）</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, data: null })}>取消</Button>
          <Button variant="contained" onClick={handleSaveEdit}>保存</Button>
        </DialogActions>
      </Dialog>

      {/* 导入结果弹窗 */}
      <Dialog open={!!importResult} onClose={() => setImportResult(null)} maxWidth="sm" fullWidth>
        <DialogTitle>导入结果</DialogTitle>
        <DialogContent>
          {importResult && (
            <Box>
              <Alert severity={importResult.failed > 0 ? 'warning' : 'success'} sx={{ mb: 2 }}>
                成功导入 {importResult.success} 条，失败 {importResult.failed} 条
              </Alert>
              {importResult.errors?.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>错误详情：</Typography>
                  {importResult.errors.map((err, i) => (
                    <Typography key={i} variant="body2" color="error.main" sx={{ mb: 0.5 }}>
                      {err}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setImportResult(null)}>确定</Button>
        </DialogActions>
      </Dialog>

      {/* 清空确认弹窗 */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, month: '' })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="error" /> 确认清空？
        </DialogTitle>
        <DialogContent>
          <Typography>
            将删除 <strong>{deleteDialog.month}</strong> 月份的全部工资记录，此操作不可撤销。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, month: '' })}>取消</Button>
          <Button variant="contained" color="error" onClick={handleDeleteMonth}>确认清空</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
