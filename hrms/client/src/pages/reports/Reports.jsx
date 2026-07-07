import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Tabs, Tab, Button, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Skeleton, CircularProgress, Chip,
  alpha,
} from '@mui/material';
import {
  Download as DownloadIcon,
  People, AttachMoney,
  School, Work, Assessment, Description,
  CheckCircle, Warning, PersonAdd,
} from '@mui/icons-material';
import ReactEChartsCore from 'echarts-for-react';
import PageHeader from '../../components/PageHeader';
import api from '../../hooks/useFetch';
import { useSnackbar } from 'notistack';
import useAuthStore from '../../store/authStore';

/* ========== 配色 & 常量 ========== */
const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#30cfd0'];
const GRADIENT_BG = { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };

/* ========== 骨架屏工具 ========== */
function BlockSkeleton({ height = 260 }) {
  return <Skeleton variant="rounded" width="100%" height={height} animation="wave" sx={{ borderRadius: 2 }} />;
}

function CardSkeletons({ count = 5, xs = 6, sm = 2.4 }) {
  return [...Array(count)].map((_, i) => (
    <Grid item xs={xs} sm={sm} key={i}>
      <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
        <Skeleton variant="text" width="40%" height={28} sx={{ mx: 'auto', mb: 0.5 }} animation="wave" />
        <Skeleton variant="text" width="60%" height={18} sx={{ mx: 'auto' }} animation="wave" />
      </Paper>
    </Grid>
  ));
}

/* ========== 统计卡片 ========== */
function StatCard({ icon, title, value, suffix, color, loading }) {
  return (
    <Card sx={{ height: '100%', transition: 'all 0.25s', '&:hover': { transform: 'translateY(-3px)', boxShadow: 4 } }}>
      <Box sx={{ height: 3, background: `linear-gradient(90deg, ${color}, ${alpha(color, 0.4)})` }} />
      <CardContent sx={{ pt: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box sx={{ width: 40, height: 40, borderRadius: 1.5, background: alpha(color, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {icon}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary">{title}</Typography>
            <Stack direction="row" alignItems="baseline" spacing={0.5}>
              {loading ? (
                <Skeleton variant="text" width={60} height={32} animation="wave" />
              ) : (
                <Typography variant="h5" fontWeight={700}>{value ?? '—'}</Typography>
              )}
              {suffix && !loading && <Typography variant="caption" color="text.secondary">{suffix}</Typography>}
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

/* ========== ECharts 配置 ========== */
const pieOption = (data, title) => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { bottom: 0, type: 'scroll', textStyle: { fontSize: 11 } },
  series: [{
    name: title, type: 'pie', radius: ['40%', '70%'], center: ['50%', '48%'],
    avoidLabelOverlap: false,
    itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
    label: { show: false },
    emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
    data,
  }],
  color: COLORS,
});

const barOption = (data, xKey, yKey) => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: '3%', right: '4%', bottom: '10%', top: '8%', containLabel: true },
  xAxis: { type: 'category', data: data.map((d) => d[xKey]), axisLabel: { rotate: data.length > 8 ? 30 : 0, fontSize: 10 } },
  yAxis: { type: 'value' },
  series: [{
    type: 'bar', data: data.map((d) => d[yKey]),
    itemStyle: { borderRadius: [6, 6, 0, 0], color: '#667eea' },
  }],
});

const lineOption = (data, xKey, yKeys) => ({
  tooltip: { trigger: 'axis' },
  grid: { left: '3%', right: '4%', bottom: '10%', top: '8%', containLabel: true },
  xAxis: { type: 'category', data: data.map((d) => d[xKey]), axisLabel: { fontSize: 10 } },
  yAxis: { type: 'value' },
  series: yKeys.map((k, i) => ({
    name: k.label, type: 'line', data: data.map((d) => d[k.key]), smooth: true,
    lineStyle: { color: COLORS[i], width: 2 }, itemStyle: { color: COLORS[i] },
    areaStyle: { color: alpha(COLORS[i], 0.15) },
  })),
  color: COLORS,
});

/* ========== 通用子Tab加载骨架屏 ========== */
function TabLoadingSkeleton({ showFilters = false }) {
  return (
    <Grid container spacing={3}>
      {showFilters && (
        <Grid item xs={12}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Stack direction="row" spacing={2}>
              <Skeleton variant="rounded" width={180} height={40} animation="wave" />
              <Skeleton variant="rounded" width={80} height={40} animation="wave" />
            </Stack>
          </Paper>
        </Grid>
      )}
      <CardSkeletons />
      <Grid item xs={12} md={6}><BlockSkeleton /></Grid>
      <Grid item xs={12} md={6}><BlockSkeleton /></Grid>
      <Grid item xs={12}><BlockSkeleton height={300} /></Grid>
    </Grid>
  );
}

/* ========== 主页面 ========== */
export default function Reports() {
  const { enqueueSnackbar } = useSnackbar();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'HR_ADMIN' || user?.role === 'SUPER_ADMIN';

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [exporting, setExporting] = useState('');

  const [dashboardData, setDashboardData] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [attMonth, setAttMonth] = useState(new Date().toISOString().slice(0, 7));
  const [salaryData, setSalaryData] = useState(null);
  const [salaryMonth, setSalaryMonth] = useState(new Date().toISOString().slice(0, 7));
  const [trainingData, setTrainingData] = useState(null);
  const [recruitmentData, setRecruitmentData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [performancePeriod, setPerformancePeriod] = useState('');
  const [contractData, setContractData] = useState(null);
  const [leaveData, setLeaveData] = useState(null);
  const [leaveMonth, setLeaveMonth] = useState(new Date().toISOString().slice(0, 7));

  /* ===== 公共加载 ===== */
  const fetchSummary = useCallback(async () => {
    setDashboardLoading(true);
    try {
      const res = await api.get('/reports/dashboard-summary');
      setDashboardData(res.data);
    } catch { /* ignore */ }
    finally { setDashboardLoading(false); }
  }, []);

  const fetchByTab = useCallback(async (idx) => {
    setLoading(true);
    try {
      let res;
      switch (idx) {
        case 1: res = await api.get('/reports/employee-summary'); setEmployeeData(res.data); break;
        case 2: res = await api.get('/reports/attendance-summary', { params: { month: attMonth } }); setAttendanceData(res.data); break;
        case 3: if (isAdmin) { res = await api.get('/reports/salary-summary', { params: { month: salaryMonth } }); setSalaryData(res.data); } break;
        case 4: res = await api.get('/reports/training-summary'); setTrainingData(res.data); break;
        case 5: res = await api.get('/reports/recruitment-summary'); setRecruitmentData(res.data); break;
        case 6:
          const p = performancePeriod || `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
          res = await api.get('/reports/performance-summary', { params: { period: p } }); setPerformanceData(res.data); break;
        case 7: res = await api.get('/reports/contract-summary'); setContractData(res.data); break;
        case 8: res = await api.get('/reports/leave-summary', { params: { month: leaveMonth } }); setLeaveData(res.data); break;
        default: break;
      }
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || err.message || '加载失败', { variant: 'error' });
    } finally { setLoading(false); }
  }, [attMonth, salaryMonth, performancePeriod, leaveMonth, isAdmin, enqueueSnackbar]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { if (tab > 0) fetchByTab(tab); }, [tab, fetchByTab]);

  /* ===== 导出 ===== */
  const handleExport = async (type) => {
    setExporting(type);
    try {
      let res;
      if (type === 'employees') res = await api.get('/reports/employee-export', { responseType: 'blob' });
      else if (type === 'attendance') res = await api.get('/reports/attendance-export', { params: { month: attMonth }, responseType: 'blob' });
      else if (type === 'salary') res = await api.get('/reports/salary-export', { params: { month: salaryMonth }, responseType: 'blob' });
      const blob = res.data;
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a');
      link.href = url; link.download = `${type}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link); link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      enqueueSnackbar('导出成功', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err.message || '导出失败', { variant: 'error' });
    } finally { setExporting(''); }
  };

  return (
    <Box>
      <PageHeader title="报表中心" breadcrumbs={['报表中心']} />

      {/* 概览卡 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2.4}>
          <StatCard icon={<People sx={{ color: '#667eea' }} />} title="员工总数" value={dashboardData?.totalEmployees} color="#667eea" loading={dashboardLoading} />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <StatCard icon={<CheckCircle sx={{ color: '#43e97b' }} />} title="今日出勤率" value={dashboardData ? `${dashboardData.todayAttendanceRate}%` : undefined} color="#43e97b" loading={dashboardLoading} />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <StatCard icon={<PersonAdd sx={{ color: '#4facfe' }} />} title="本月入职" value={dashboardData?.newThisMonth} suffix="人" color="#4facfe" loading={dashboardLoading} />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <StatCard icon={<Warning sx={{ color: '#fa709a' }} />} title="合同预警(30天)" value={dashboardData?.expiringContracts} suffix="份" color="#fa709a" loading={dashboardLoading} />
        </Grid>
        <Grid item xs={6} sm={4} md={2.4}>
          <StatCard icon={<Work sx={{ color: '#f093fb' }} />} title="招聘中岗位" value={dashboardData?.openJobs} suffix="个" color="#f093fb" loading={dashboardLoading} />
        </Grid>
      </Grid>

      {/* Tab 导航 */}
      <Paper sx={{ mb: 2, borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ px: 1, '& .MuiTab-root': { textTransform: 'none', fontWeight: 500, fontSize: 14, minHeight: 48 } }}>
          <Tab label="📊 概览" />
          <Tab label="👥 员工" />
          <Tab label="📅 考勤" />
          {isAdmin && <Tab label="💰 薪资" />}
          <Tab label="🎓 培训" />
          <Tab label="💼 招聘" />
          <Tab label="📈 绩效" />
          <Tab label="📝 合同" />
          <Tab label="🏖️ 请假" />
        </Tabs>
      </Paper>

      {/* ===== 概览 & Tab 加载骨架屏 ===== */}
      {/* 概览数据加载中 */}
      {tab === 0 && dashboardLoading && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2.5, borderRadius: 2 }}>
              <Skeleton variant="text" width={100} height={24} sx={{ mb: 2 }} animation="wave" />
              <Grid container spacing={2}>
                {[...Array(6)].map((_, i) => (
                  <Grid item xs={6} sm={4} key={i}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                      <Skeleton variant="circular" width={24} height={24} sx={{ mx: 'auto', mb: 1 }} animation="wave" />
                      <Skeleton variant="text" width="50%" height={32} sx={{ mx: 'auto', mb: 0.5 }} animation="wave" />
                      <Skeleton variant="text" width="35%" height={16} sx={{ mx: 'auto' }} animation="wave" />
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2.5, borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Skeleton variant="circular" width={80} height={80} sx={{ mb: 2 }} animation="wave" />
              <Skeleton variant="text" width={80} height={28} sx={{ mb: 1 }} animation="wave" />
              <Skeleton variant="rounded" width={200} height={36} sx={{ mb: 1.5 }} animation="wave" />
              <Skeleton variant="rounded" width={200} height={36} animation="wave" />
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* 子Tab加载中 */}
      {tab > 0 && loading && <TabLoadingSkeleton showFilters={tab === 2 || tab === 3 || tab === 6 || tab === 8} />}

      {/* ===== Tab 0: 概览 ===== */}
      {tab === 0 && dashboardData && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>数据总览</Typography>
              <Grid container spacing={2}>
                {[
                  { label: '在职员工', value: dashboardData.activeEmployees, icon: <People />, color: '#667eea' },
                  { label: '部门数量', value: dashboardData.totalDepartments, icon: <Work />, color: '#764ba2' },
                  { label: '培训项目', value: dashboardData.totalTrainings, icon: <School />, color: '#4facfe' },
                  { label: '有效合同', value: dashboardData.activeContracts, icon: <Description />, color: '#43e97b' },
                  { label: '合同即将到期(30天)', value: dashboardData.expiringContracts, icon: <Warning />, color: '#fa709a' },
                  { label: '本月薪资总额', value: `¥${(dashboardData.thisMonthSalaryTotal || 0).toLocaleString()}`, icon: <AttachMoney />, color: '#f093fb' },
                ].map((item) => (
                  <Grid item xs={6} sm={4} key={item.label}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center', borderColor: alpha(item.color, 0.3) }}>
                      <Box sx={{ color: item.color, mb: 1 }}>{item.icon}</Box>
                      <Typography variant="h6" fontWeight={700}>{item.value}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2.5, borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ mb: 2, width: 80, height: 80, borderRadius: '50%', ...GRADIENT_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Assessment sx={{ fontSize: 36, color: 'white' }} />
              </Box>
              <Typography variant="h6" fontWeight={600} gutterBottom>快速导出</Typography>
              <Stack spacing={1.5} sx={{ width: '100%', maxWidth: 240 }}>
                <Button fullWidth variant="outlined" startIcon={exporting === 'employees' ? <CircularProgress size={16} /> : <DownloadIcon />}
                  onClick={() => handleExport('employees')} disabled={!!exporting}
                  sx={{ borderRadius: 2, textTransform: 'none', borderColor: alpha('#667eea', 0.3), color: '#667eea', '&:hover': { borderColor: '#667eea', bgcolor: alpha('#667eea', 0.06) } }}>
                  员工花名册 Excel
                </Button>
                {isAdmin && (
                  <Button fullWidth variant="outlined" startIcon={exporting === 'salary' ? <CircularProgress size={16} /> : <DownloadIcon />}
                    onClick={() => handleExport('salary')} disabled={!!exporting}
                    sx={{ borderRadius: 2, textTransform: 'none', borderColor: alpha('#764ba2', 0.3), color: '#764ba2', '&:hover': { borderColor: '#764ba2', bgcolor: alpha('#764ba2', 0.06) } }}>
                    薪资明细 Excel
                  </Button>
                )}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ===== Tab 1: 员工报表 ===== */}
      {tab === 1 && !loading && employeeData && (
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center', ...GRADIENT_BG, color: 'white' }}>
              <Typography variant="h4" fontWeight={700}>{employeeData.total}</Typography>
              <Typography variant="body2">员工总数</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3} md={3}>
            <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={700} color="#43e97b">{employeeData.activeOnboard}</Typography>
              <Typography variant="body2" color="text.secondary">在职</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3} md={3}>
            <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={700} color="#fa709a">{employeeData.resignedCount}</Typography>
              <Typography variant="body2" color="text.secondary">离职</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3} md={3}>
            <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={700} color="#f093fb">{employeeData.inactiveCount}</Typography>
              <Typography variant="body2" color="text.secondary">待岗</Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>性别分布</Typography>
              {employeeData.genderDistribution?.length > 0 ? (
                <ReactEChartsCore option={pieOption(employeeData.genderDistribution, '性别')} style={{ height: 260 }} />
              ) : <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>暂无数据</Typography>}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>状态分布</Typography>
              {employeeData.statusDistribution?.length > 0 ? (
                <ReactEChartsCore option={pieOption(employeeData.statusDistribution, '状态')} style={{ height: 260 }} />
              ) : <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>暂无数据</Typography>}
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>部门人员分布</Typography>
              {employeeData.departmentDistribution?.length > 0 ? (
                <ReactEChartsCore option={barOption(employeeData.departmentDistribution, 'name', 'value')} style={{ height: 300 }} />
              ) : <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>暂无数据</Typography>}
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>近12月入职 / 离职趋势</Typography>
              {employeeData.hireTrend?.length > 0 ? (
                <ReactEChartsCore
                  option={lineOption(employeeData.hireTrend, 'month', [{ key: 'onboarded', label: '入职' }, { key: 'left', label: '离职' }])}
                  style={{ height: 280 }} />
              ) : <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>暂无数据</Typography>}
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Stack direction="row" justifyContent="flex-end">
              <Button variant="outlined" startIcon={exporting === 'employees' ? <CircularProgress size={16} /> : <DownloadIcon />}
                onClick={() => handleExport('employees')} disabled={!!exporting}
                sx={{ borderRadius: 2, textTransform: 'none', borderColor: alpha('#667eea', 0.3), color: '#667eea' }}>
                导出花名册 Excel
              </Button>
            </Stack>
          </Grid>
        </Grid>
      )}

      {/* ===== Tab 2: 考勤报表 ===== */}
      {tab === 2 && !loading && attendanceData && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 2, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <TextField type="month" size="small" label="选择月份" value={attMonth}
                  onChange={(e) => setAttMonth(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 180 }} />
                <Button variant="contained" size="small" onClick={() => fetchByTab(2)}
                  sx={{ borderRadius: 2, textTransform: 'none', ...GRADIENT_BG }}>查询</Button>
              </Stack>
              <Button variant="outlined" startIcon={exporting === 'attendance' ? <CircularProgress size={16} /> : <DownloadIcon />}
                onClick={() => handleExport('attendance')} disabled={!!exporting}
                sx={{ borderRadius: 2, textTransform: 'none', borderColor: alpha('#667eea', 0.3), color: '#667eea' }}>
                导出考勤 Excel
              </Button>
            </Paper>
          </Grid>

          {[
            { label: '出勤率', value: `${attendanceData.attendanceRate}%`, color: '#667eea' },
            { label: '正常', value: attendanceData.normalCount, color: '#43e97b' },
            { label: '迟到', value: attendanceData.lateCount, color: '#fee140' },
            { label: '早退', value: attendanceData.earlyCount, color: '#4facfe' },
            { label: '缺勤', value: attendanceData.absentCount, color: '#fa709a' },
          ].map((s) => (
            <Grid item xs={6} sm={2.4} key={s.label}>
              <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={700} color={s.color}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </Paper>
            </Grid>
          ))}

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>每日出勤率</Typography>
              {attendanceData.dailyStats?.length > 0 ? (
                <ReactEChartsCore option={lineOption(attendanceData.dailyStats, 'date', [{ key: 'rate', label: '出勤率(%)' }])} style={{ height: 280 }} />
              ) : <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>暂无数据</Typography>}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>部门出勤率</Typography>
              {attendanceData.deptStats?.length > 0 ? (
                <ReactEChartsCore option={barOption(attendanceData.deptStats, 'name', 'rate')} style={{ height: 280 }} />
              ) : <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>暂无数据</Typography>}
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>考勤明细</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>员工姓名</TableCell><TableCell>工号</TableCell><TableCell>部门</TableCell>
                      <TableCell>日期</TableCell><TableCell>上班时间</TableCell><TableCell>下班时间</TableCell><TableCell>状态</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {attendanceData.records?.slice(0, 50).map((r) => {
                      const sc = r.status === 'NORMAL' ? '#43e97b' : r.status === 'LATE' ? '#fee140' : r.status === 'EARLY' ? '#4facfe' : '#fa709a';
                      const sl = r.status === 'NORMAL' ? '正常' : r.status === 'LATE' ? '迟到' : r.status === 'EARLY' ? '早退' : '缺勤';
                      return (
                        <TableRow key={r.id} hover>
                          <TableCell>{r.employee?.name}</TableCell><TableCell>{r.employee?.employeeNo}</TableCell><TableCell>{r.employee?.department?.name}</TableCell>
                          <TableCell>{new Date(r.date).toLocaleDateString('zh-CN')}</TableCell>
                          <TableCell>{r.clockIn ? new Date(r.clockIn).toLocaleTimeString('zh-CN') : '未打卡'}</TableCell>
                          <TableCell>{r.clockOut ? new Date(r.clockOut).toLocaleTimeString('zh-CN') : '未打卡'}</TableCell>
                          <TableCell><Chip label={sl} size="small" sx={{ bgcolor: alpha(sc, 0.12), color: sc, fontWeight: 600, minWidth: 48 }} /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ===== Tab 3: 薪资报表 (仅管理员) ===== */}
      {tab === 3 && isAdmin && !loading && salaryData && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 2, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <TextField type="month" size="small" label="选择月份" value={salaryMonth}
                  onChange={(e) => setSalaryMonth(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 180 }} />
                <Button variant="contained" size="small" onClick={() => fetchByTab(3)}
                  sx={{ borderRadius: 2, textTransform: 'none', ...GRADIENT_BG }}>查询</Button>
              </Stack>
              <Button variant="outlined" startIcon={exporting === 'salary' ? <CircularProgress size={16} /> : <DownloadIcon />}
                onClick={() => handleExport('salary')} disabled={!!exporting}
                sx={{ borderRadius: 2, textTransform: 'none', borderColor: alpha('#667eea', 0.3), color: '#667eea' }}>
                导出薪资 Excel
              </Button>
            </Paper>
          </Grid>

          {[
            { label: '实发总额', value: `¥${(salaryData.totalNet || 0).toLocaleString()}`, color: '#667eea' },
            { label: '基本工资', value: `¥${(salaryData.totalBase || 0).toLocaleString()}`, color: '#43e97b' },
            { label: '奖金总额', value: `¥${(salaryData.totalBonus || 0).toLocaleString()}`, color: '#f093fb' },
            { label: '个税总额', value: `¥${(salaryData.totalTax || 0).toLocaleString()}`, color: '#fa709a' },
            { label: '人均实发', value: `¥${salaryData.avgNet?.toLocaleString()}`, color: '#4facfe' },
          ].map((s) => (
            <Grid item xs={6} sm={2.4} key={s.label}>
              <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={700} color={s.color}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </Paper>
            </Grid>
          ))}

          <Grid item xs={12}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>月度薪资趋势</Typography>
              {salaryData.trend?.length > 0 ? (
                <ReactEChartsCore option={lineOption(salaryData.trend, 'month', [{ key: 'totalNet', label: '实发总额(元)' }, { key: 'totalBase', label: '基本工资(元)' }])} style={{ height: 280 }} />
              ) : <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>暂无数据</Typography>}
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>薪资明细 (Top 30)</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>姓名</TableCell><TableCell>部门</TableCell><TableCell>基本工资</TableCell><TableCell>津贴</TableCell><TableCell>奖金</TableCell><TableCell>实发</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {salaryData.records?.slice(0, 30).map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell>{r.employee?.name}</TableCell><TableCell>{r.employee?.department?.name}</TableCell>
                        <TableCell>¥{r.baseSalary?.toLocaleString()}</TableCell><TableCell>¥{r.allowance?.toLocaleString()}</TableCell>
                        <TableCell>¥{r.bonus?.toLocaleString()}</TableCell><TableCell><strong>¥{r.netSalary?.toLocaleString()}</strong></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ===== Tab 4: 培训报表 ===== */}
      {tab === 4 && !loading && trainingData && (
        <Grid container spacing={3}>
          {[
            { label: '培训总数', value: trainingData.totalTrainings, color: '#667eea' },
            { label: '报名人次', value: trainingData.totalEnrollments, color: '#43e97b' },
            { label: '签到率', value: `${trainingData.participationRate}%`, color: '#4facfe' },
            { label: '平均评分', value: trainingData.avgScore, color: '#f093fb' },
            { label: '在职总人数', value: trainingData.totalEmployees, color: '#fee140' },
          ].map((s) => (
            <Grid item xs={6} sm={2.4} key={s.label}>
              <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={700} color={s.color}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </Paper>
            </Grid>
          ))}

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>培训状态分布</Typography>
              {trainingData.statusDistribution?.length > 0 ? (
                <ReactEChartsCore option={pieOption(trainingData.statusDistribution, '状态')} style={{ height: 260 }} />
              ) : <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>暂无数据</Typography>}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>部门参训率</Typography>
              {trainingData.deptStats?.length > 0 ? (
                <ReactEChartsCore option={barOption(trainingData.deptStats.map((d) => ({ name: d.name, value: d.rate })), 'name', 'value')} style={{ height: 260 }} />
              ) : <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>暂无数据</Typography>}
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>员工学时排名 (Top 20)</Typography>
              {trainingData.employeeHours?.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>排名</TableCell><TableCell>姓名</TableCell><TableCell>部门</TableCell><TableCell>累计学时(h)</TableCell><TableCell>参训次数</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {trainingData.employeeHours.map((e, i) => (
                        <TableRow key={e.name} hover>
                          <TableCell><Chip label={i + 1} size="small" color={i < 3 ? 'primary' : 'default'} variant={i < 3 ? 'filled' : 'outlined'} /></TableCell>
                          <TableCell>{e.name}</TableCell><TableCell>{e.dept}</TableCell>
                          <TableCell><strong>{e.hours}h</strong></TableCell><TableCell>{e.count} 次</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>暂无签到记录</Typography>}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ===== Tab 5: 招聘报表 ===== */}
      {tab === 5 && !loading && recruitmentData && (
        <Grid container spacing={3}>
          {[
            { label: '岗位总数', value: recruitmentData.totalJobs, color: '#667eea' },
            { label: '招聘中', value: recruitmentData.openJobs, color: '#43e97b' },
            { label: '候选人总数', value: recruitmentData.totalCandidates, color: '#4facfe' },
            { label: '活跃候选人', value: recruitmentData.activeCandidates, color: '#f093fb' },
            { label: '活跃率', value: `${recruitmentData.totalCandidates ? Math.round((recruitmentData.activeCandidates / recruitmentData.totalCandidates) * 100) : 0}%`, color: '#fee140' },
          ].map((s) => (
            <Grid item xs={6} sm={2.4} key={s.label}>
              <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={700} color={s.color}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </Paper>
            </Grid>
          ))}

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>候选人阶段漏斗</Typography>
              {recruitmentData.stageDistribution?.length > 0 ? (
                <ReactEChartsCore option={barOption(recruitmentData.stageDistribution, 'name', 'value')} style={{ height: 280 }} />
              ) : <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>暂无数据</Typography>}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>急聘程度分布</Typography>
              {recruitmentData.urgencyDistribution?.length > 0 ? (
                <ReactEChartsCore option={pieOption(recruitmentData.urgencyDistribution, '急聘程度')} style={{ height: 280 }} />
              ) : <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>暂无数据</Typography>}
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>岗位竞争度</Typography>
              {recruitmentData.jobStats?.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead><TableRow><TableCell>岗位</TableCell><TableCell>编制</TableCell><TableCell>候选人</TableCell><TableCell>竞争比</TableCell><TableCell>状态</TableCell></TableRow></TableHead>
                    <TableBody>
                      {recruitmentData.jobStats.map((j) => (
                        <TableRow key={j.name} hover>
                          <TableCell><strong>{j.name}</strong></TableCell><TableCell>{j.headcount}</TableCell><TableCell>{j.candidates}</TableCell>
                          <TableCell><Chip label={`${(j.candidates / j.headcount).toFixed(1)}:1`} size="small" color={j.candidates / j.headcount >= 3 ? 'warning' : 'default'} /></TableCell>
                          <TableCell><Chip label={j.status === 'OPEN' ? '招聘中' : j.status} size="small" color={j.status === 'OPEN' ? 'success' : 'default'} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>暂无数据</Typography>}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ===== Tab 6: 绩效报表 ===== */}
      {tab === 6 && !loading && performanceData && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 2, borderRadius: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <TextField size="small" label="考核周期" value={performancePeriod}
                onChange={(e) => setPerformancePeriod(e.target.value)}
                placeholder="如 2026-Q2" InputLabelProps={{ shrink: true }} sx={{ width: 180 }} />
              <Button variant="contained" size="small" onClick={() => fetchByTab(6)}
                sx={{ borderRadius: 2, textTransform: 'none', ...GRADIENT_BG }}>查询</Button>
            </Paper>
          </Grid>

          {[
            { label: '考核人数', value: performanceData.totalRecords, color: '#667eea' },
            { label: '综合均分', value: performanceData.avgFinalRating, color: '#43e97b' },
            { label: '自评均分', value: performanceData.avgSelfRating, color: '#4facfe' },
            { label: '上级均分', value: performanceData.avgMgrRating, color: '#f093fb' },
            { label: '已完成', value: `${performanceData.completedRecords}/${performanceData.totalRecords}`, color: '#fee140' },
          ].map((s) => (
            <Grid item xs={6} sm={2.4} key={s.label}>
              <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={700} color={s.color}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </Paper>
            </Grid>
          ))}

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>评分等级分布</Typography>
              {performanceData.ratingDistribution?.length > 0 ? (
                <ReactEChartsCore option={pieOption(performanceData.ratingDistribution, '等级')} style={{ height: 260 }} />
              ) : <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>暂无数据</Typography>}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>绩效趋势</Typography>
              {performanceData.trend?.length > 0 ? (
                <ReactEChartsCore option={lineOption(performanceData.trend, 'period', [{ key: 'avgRating', label: '综合均分' }, { key: 'count', label: '考核人数' }])} style={{ height: 260 }} />
              ) : <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>暂无数据</Typography>}
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>绩效明细</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>姓名</TableCell><TableCell>部门</TableCell><TableCell>自评</TableCell><TableCell>上级评分</TableCell><TableCell>综合评分</TableCell><TableCell>等级</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {performanceData.records?.slice(0, 50).map((r) => {
                      const final = r.finalRating || 0;
                      const level = final >= 90 ? 'A' : final >= 80 ? 'B' : final >= 70 ? 'C' : final >= 60 ? 'D' : 'E';
                      const lc = final >= 90 ? '#43e97b' : final >= 80 ? '#667eea' : final >= 70 ? '#fee140' : final >= 60 ? '#fa709a' : '#ff4444';
                      return (
                        <TableRow key={r.id} hover>
                          <TableCell>{r.employee?.name}</TableCell><TableCell>{r.employee?.department?.name}</TableCell>
                          <TableCell>{r.selfRating ?? '—'}</TableCell><TableCell>{r.mgrRating ?? '—'}</TableCell>
                          <TableCell><strong>{final || '—'}</strong></TableCell>
                          <TableCell><Chip label={level} size="small" sx={{ bgcolor: alpha(lc, 0.12), color: lc, fontWeight: 700 }} /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ===== Tab 7: 合同报表 ===== */}
      {tab === 7 && !loading && contractData && (
        <Grid container spacing={3}>
          {[
            { label: '合同总数', value: contractData.total, color: '#667eea' },
            { label: '有效合同', value: contractData.activeCount, color: '#43e97b' },
            { label: '30天内到期', value: contractData.expiring30Count, color: '#fa709a' },
            { label: '60天内到期', value: contractData.expiring60Count, color: '#fee140' },
            { label: '已过期', value: contractData.expiredCount, color: '#999' },
          ].map((s) => (
            <Grid item xs={6} sm={2.4} key={s.label}>
              <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={700} color={s.color}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </Paper>
            </Grid>
          ))}

          <Grid item xs={12}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>⚠️ 合同到期预警</Typography>
              {contractData.expiring60?.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead><TableRow><TableCell>员工</TableCell><TableCell>工号</TableCell><TableCell>部门</TableCell><TableCell>合同编号</TableCell><TableCell>类型</TableCell><TableCell>到期日期</TableCell><TableCell>剩余天数</TableCell></TableRow></TableHead>
                    <TableBody>
                      {contractData.expiring60.map((c) => {
                        const remainDays = Math.ceil((new Date(c.endDate) - new Date()) / (1000 * 60 * 60 * 24));
                        const warnColor = remainDays <= 30 ? '#fa709a' : '#fee140';
                        return (
                          <TableRow key={c.id} hover sx={{ bgcolor: alpha(warnColor, 0.04) }}>
                            <TableCell>{c.employee?.name}</TableCell><TableCell>{c.employee?.employeeNo}</TableCell><TableCell>{c.employee?.department?.name}</TableCell>
                            <TableCell>{c.contractNo || '—'}</TableCell><TableCell>{c.type}</TableCell>
                            <TableCell>{new Date(c.endDate).toLocaleDateString('zh-CN')}</TableCell>
                            <TableCell><Chip label={`${remainDays} 天`} size="small" sx={{ bgcolor: alpha(warnColor, 0.12), color: warnColor, fontWeight: 600 }} /></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>暂无即将到期的合同 ✅</Typography>}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>合同类型分布</Typography>
              {contractData.typeDistribution?.length > 0 ? (
                <ReactEChartsCore option={pieOption(contractData.typeDistribution, '类型')} style={{ height: 260 }} />
              ) : <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>暂无数据</Typography>}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>未来12月到期趋势</Typography>
              {contractData.monthExpiry?.length > 0 ? (
                <ReactEChartsCore option={lineOption(contractData.monthExpiry, 'month', [{ key: 'count', label: '到期数' }])} style={{ height: 260 }} />
              ) : <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>暂无数据</Typography>}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ===== Tab 8: 请假报表 ===== */}
      {tab === 8 && !loading && leaveData && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 2, borderRadius: 2, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <TextField type="month" size="small" label="选择月份" value={leaveMonth}
                onChange={(e) => setLeaveMonth(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 180 }} />
              <Button variant="contained" size="small" onClick={() => fetchByTab(8)}
                sx={{ borderRadius: 2, textTransform: 'none', ...GRADIENT_BG }}>查询</Button>
            </Paper>
          </Grid>

          {[
            { label: '请假人次', value: leaveData.totalLeaves, color: '#667eea' },
            { label: '请假总天数', value: leaveData.totalDays, color: '#43e97b' },
            { label: '人均天数', value: leaveData.totalLeaves ? (leaveData.totalDays / leaveData.totalLeaves).toFixed(1) : '—', color: '#f093fb' },
          ].map((s) => (
            <Grid item xs={6} sm={4} key={s.label}>
              <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={700} color={s.color}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </Paper>
            </Grid>
          ))}

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>请假类型（人次）</Typography>
              {leaveData.typeDistribution?.length > 0 ? (
                <ReactEChartsCore option={barOption(leaveData.typeDistribution.map((d) => ({ name: d.name, value: d.count })), 'name', 'value')} style={{ height: 280 }} />
              ) : <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>暂无数据</Typography>}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>请假类型（天数）</Typography>
              {leaveData.typeDistribution?.length > 0 ? (
                <ReactEChartsCore option={barOption(leaveData.typeDistribution.map((d) => ({ name: d.name, value: d.days })), 'name', 'value')} style={{ height: 280 }} />
              ) : <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>暂无数据</Typography>}
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>请假明细</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>姓名</TableCell><TableCell>工号</TableCell><TableCell>部门</TableCell>
                      <TableCell>类型</TableCell><TableCell>开始</TableCell><TableCell>结束</TableCell><TableCell>天数</TableCell><TableCell>原因</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {leaveData.leaves?.slice(0, 50).map((l) => (
                      <TableRow key={l.id} hover>
                        <TableCell>{l.employee?.name}</TableCell><TableCell>{l.employee?.employeeNo}</TableCell><TableCell>{l.employee?.department?.name}</TableCell>
                        <TableCell><Chip label={l.type} size="small" variant="outlined" /></TableCell>
                        <TableCell>{new Date(l.startDate).toLocaleDateString('zh-CN')}</TableCell>
                        <TableCell>{new Date(l.endDate).toLocaleDateString('zh-CN')}</TableCell>
                        <TableCell><strong>{l.duration}</strong></TableCell>
                        <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
