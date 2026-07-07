import { useState, useEffect } from 'react';
import { Box, TextField, Chip, Button } from '@mui/material';
import { FileDownload as ExportIcon } from '@mui/icons-material';
import PageHeader from '../../components/PageHeader';
import DataGrid from '../../components/DataGrid';
import api from '../../hooks/useFetch';
import { useSnackbar } from 'notistack';

const statusMap = {
  NORMAL: { label: '正常', color: 'success' },
  LATE: { label: '迟到', color: 'warning' },
  EARLY_LEAVE: { label: '早退', color: 'warning' },
  LATE_EARLY: { label: '迟到+早退', color: 'error' },
  ABSENT: { label: '缺勤', color: 'error' },
};

export default function AttendanceRecords() {
  const [records, setRecords] = useState([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const fetchRecords = async () => {
    try {
      const data = await api.get('/attendance/records', { params: { month, page, pageSize: 20 } });
      setRecords(data.data.data);
      setTotal(data.data.total);
    } catch {}
  };

  useEffect(() => { fetchRecords(); }, [month, page]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/attendance/export?month=${month}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('导出失败');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `考勤记录_${month}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      enqueueSnackbar('导出成功', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err.message || '导出失败', { variant: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    { field: 'date', headerName: '日期', renderCell: (row) => new Date(row.date).toLocaleDateString('zh-CN') },
    { field: 'employee', headerName: '员工', renderCell: (row) => row.employee?.name || '-' },
    { field: 'clockIn', headerName: '上班时间', renderCell: (row) => row.clockIn ? new Date(row.clockIn).toLocaleTimeString('zh-CN') : '-' },
    { field: 'clockOut', headerName: '下班时间', renderCell: (row) => row.clockOut ? new Date(row.clockOut).toLocaleTimeString('zh-CN') : '-' },
    { field: 'punchCount', headerName: '打卡次数', renderCell: (row) => row.punchCount || (row.clockRecords?.length) || '-' },
    { field: 'status', headerName: '状态', renderCell: (row) => {
      const s = statusMap[row.status] || { label: row.status, color: 'default' };
      return <Chip label={s.label} color={s.color} size="small" />;
    }},
  ];

  return (
    <Box>
      <PageHeader title="考勤记录" breadcrumbs={['考勤管理', '记录']} />
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField type="month" size="small" value={month} onChange={(e) => { setMonth(e.target.value); setPage(1); }} label="选择月份" InputLabelProps={{ shrink: true }} />
        <Button variant="outlined" startIcon={<ExportIcon />} onClick={handleExport} disabled={exporting} size="small">
          {exporting ? '导出中...' : '导出Excel'}
        </Button>
      </Box>
      <DataGrid columns={columns} rows={records} totalCount={total} page={page - 1} pageSize={20} onPageChange={setPage} />
    </Box>
  );
}
