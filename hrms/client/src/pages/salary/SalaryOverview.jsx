import { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Button, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip } from '@mui/material';
import { Calculate as CalcIcon, Refresh as RecalcIcon } from '@mui/icons-material';
import PageHeader from '../../components/PageHeader';
import api from '../../hooks/useFetch';
import { useSnackbar } from 'notistack';

export default function SalaryOverview() {
  const [records, setRecords] = useState([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState(null);
  const [recalcOpen, setRecalcOpen] = useState(false);
  const [recalcing, setRecalcing] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const fetchData = async () => {
    try {
      const [recordsData, summaryData] = await Promise.all([
        api.get('/salary/records', { params: { month, pageSize: 50 } }),
        api.get('/salary/summary', { params: { month } }),
      ]);
      setRecords(recordsData.data.data);
      setSummary(summaryData.data);
    } catch {}
  };

  useEffect(() => { fetchData(); }, [month]);

  const handleCalculate = async () => {
    try {
      await api.post('/salary/calculate', { month });
      enqueueSnackbar('薪资计算完成', { variant: 'success' });
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.message || '计算失败', { variant: 'error' });
    }
  };

  const handleRecalculate = async () => {
    setRecalcing(true);
    try {
      await api.post('/salary/calculate', { month, force: true });
      enqueueSnackbar('薪资已重新计算', { variant: 'success' });
      setRecalcOpen(false);
      fetchData();
    } catch (err) {
      enqueueSnackbar(err.message || '重新计算失败', { variant: 'error' });
    } finally {
      setRecalcing(false);
    }
  };

  return (
    <Box>
      <PageHeader title="薪资管理" breadcrumbs={['薪资管理']} />
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <TextField type="month" size="small" value={month} onChange={(e) => setMonth(e.target.value)} label="选择月份" InputLabelProps={{ shrink: true }} />
        <Button variant="contained" startIcon={<CalcIcon />} onClick={handleCalculate}>计算月度薪资</Button>
        <Tooltip title="使用员工最新薪资数据重新计算，已有记录将被覆盖">
          <Button variant="outlined" startIcon={<RecalcIcon />} onClick={() => setRecalcOpen(true)} color="warning">重新计算</Button>
        </Tooltip>
      </Box>
      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}>
            <Card><CardContent><Typography variant="body2" color="text.secondary">应发总额</Typography><Typography variant="h5" fontWeight="bold">¥{summary.totalGross?.toLocaleString()}</Typography></CardContent></Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card><CardContent><Typography variant="body2" color="text.secondary">实发总额</Typography><Typography variant="h5" fontWeight="bold" color="success.main">¥{summary.totalNet?.toLocaleString()}</Typography></CardContent></Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card><CardContent><Typography variant="body2" color="text.secondary">个税总额</Typography><Typography variant="h5" fontWeight="bold">¥{summary.totalTax?.toLocaleString()}</Typography></CardContent></Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card><CardContent><Typography variant="body2" color="text.secondary">社保总额</Typography><Typography variant="h5" fontWeight="bold">¥{summary.totalSocialIns?.toLocaleString()}</Typography></CardContent></Card>
          </Grid>
        </Grid>
      )}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>员工</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>部门</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">基本工资</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">津贴</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">社保</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">个税</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">实发工资</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.employee?.name}</TableCell>
                <TableCell>{r.employee?.department?.name}</TableCell>
                <TableCell align="right">¥{r.baseSalary?.toLocaleString()}</TableCell>
                <TableCell align="right">¥{r.allowance?.toLocaleString()}</TableCell>
                <TableCell align="right">¥{r.socialIns?.toLocaleString()}</TableCell>
                <TableCell align="right">¥{r.tax?.toLocaleString()}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>¥{r.netSalary?.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 重新计算确认弹窗 */}
      <Dialog open={recalcOpen} onClose={() => setRecalcOpen(false)}>
        <DialogTitle>确认重新计算？</DialogTitle>
        <DialogContent>
          <Typography>
            重新计算将使用员工当前最新的薪资数据（如基本工资、岗位等）覆盖 {month} 月份已有的薪资记录。
          </Typography>
          <Typography color="error" sx={{ mt: 1 }}>
            此操作不可撤销，已有记录将被覆盖。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRecalcOpen(false)}>取消</Button>
          <Button variant="contained" color="warning" onClick={handleRecalculate} disabled={recalcing}>
            {recalcing ? '计算中...' : '确认重新计算'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
