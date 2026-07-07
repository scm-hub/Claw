import { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Chip, Alert, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Skeleton, Divider, Tooltip, Stack, LinearProgress,
} from '@mui/material';
import {
  People as PeopleIcon, PersonAdd as HireIcon, PersonRemove as ResignIcon,
  EventNote as LeaveIcon, AccessTime as AttIcon, Work as JobIcon,
  FilterAlt as FilterIcon, TrendingUp, TrendingDown, Cake as CakeIcon,
  Warning as WarningIcon, School as TrainIcon, Assignment as ContractIcon,
} from '@mui/icons-material';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import {
  LineChart, BarChart, PieChart,
} from 'echarts/charts';
import {
  GridComponent, TooltipComponent, LegendComponent, TitleComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import PageHeader from '../components/PageHeader';
import api from '../hooks/useFetch';
import useAuthStore from '../store/authStore';

echarts.use([LineChart, BarChart, PieChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, CanvasRenderer]);

const STATUS_MAP = {
  ACTIVE: { label: '在职', color: '#2e7d32' },
  INACTIVE: { label: '待岗', color: '#9e9e9e' },
  RESIGNED: { label: '离职', color: '#d32f2f' },
  ON_LEAVE: { label: '请假中', color: '#ed6c02' },
  PROBATION: { label: '试用期', color: '#0288d1' },
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then((data) => setStats(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isFiltered = !!stats?.departmentFilter;
  const departmentName = user?.employee?.departmentName || '';

  // 环比箭头
  const trendArrow = (current, last) => {
    if (!last) return null;
    if (current > last) return <TrendingUp fontSize="inherit" sx={{ color: 'success.main', ml: 0.5 }} />;
    if (current < last) return <TrendingDown fontSize="inherit" sx={{ color: 'error.main', ml: 0.5 }} />;
    return null;
  };

  // ---- 图表配置 ----
  const trendOption = stats ? {
    tooltip: { trigger: 'axis' },
    legend: { data: ['入职', '离职'], bottom: 0 },
    grid: { left: 40, right: 20, top: 10, bottom: 30 },
    xAxis: {
      type: 'category',
      data: stats.monthlyTrend?.map((m) => m.month?.slice(5)) || [],
      axisLabel: { fontSize: 11 },
    },
    yAxis: { type: 'value', minInterval: 1, axisLabel: { fontSize: 11 } },
    series: [
      {
        name: '入职', type: 'bar', barWidth: 14, itemStyle: { borderRadius: [3, 3, 0, 0] },
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#4caf50' }, { offset: 1, color: '#81c784' },
        ]),
        data: stats.monthlyTrend?.map((m) => m.hires) || [],
      },
      {
        name: '离职', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6,
        lineStyle: { color: '#ef5350', width: 2 }, itemStyle: { color: '#ef5350' },
        data: stats.monthlyTrend?.map((m) => m.resigns) || [],
      },
    ],
  } : null;

  const genderOption = stats ? {
    tooltip: { trigger: 'item', formatter: '{b}: {c} 人 ({d}%)' },
    legend: { orient: 'vertical', right: 0, top: 'center', itemWidth: 10, itemHeight: 10 },
    series: [{
      type: 'pie', radius: ['55%', '78%'], center: ['38%', '50%'],
      label: { show: false },
      emphasis: { scaleSize: 8 },
      data: [
        { value: stats.genderDistribution?.male || 0, name: '男', itemStyle: { color: '#1976d2' } },
        { value: stats.genderDistribution?.female || 0, name: '女', itemStyle: { color: '#ec407a' } },
      ],
    }],
  } : null;

  const statusOption = stats ? {
    tooltip: { trigger: 'item', formatter: '{b}: {c} 人 ({d}%)' },
    legend: { orient: 'vertical', right: 0, top: 'center', itemWidth: 10, itemHeight: 10 },
    series: [{
      type: 'pie', radius: ['55%', '78%'], center: ['38%', '50%'],
      label: { show: false },
      emphasis: { scaleSize: 8 },
      data: (stats.statusDistribution || []).map((s) => ({
        value: s.count,
        name: STATUS_MAP[s.status]?.label || s.status,
        itemStyle: { color: STATUS_MAP[s.status]?.color || '#9e9e9e' },
      })),
    }],
  } : null;

  const deptOption = stats ? {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 100, right: 40, top: 10, bottom: 20 },
    xAxis: { type: 'value', axisLabel: { fontSize: 11 } },
    yAxis: {
      type: 'category',
      data: stats.departmentDistribution?.map((d) => d.name) || [],
      axisLabel: { fontSize: 11 },
      inverse: true,
    },
    series: [{
      type: 'bar',
      data: stats.departmentDistribution?.map((d, i) => ({
        value: d.count,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#1976d2' }, { offset: 1, color: '#42a5f5' },
          ]),
          borderRadius: [0, 4, 4, 0],
        },
      })) || [],
      barWidth: 18,
      label: { show: true, position: 'right', fontSize: 11, fontWeight: 'bold' },
    }],
  } : null;

  // ---- 加载状态 ----
  if (loading) {
    return (
      <Box>
        <PageHeader title="仪表盘" breadcrumbs={['仪表盘']} />
        <Grid container spacing={3}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rounded" height={100} />
            </Grid>
          ))}
          <Grid item xs={12} md={8}><Skeleton variant="rounded" height={320} /></Grid>
          <Grid item xs={12} md={4}><Skeleton variant="rounded" height={320} /></Grid>
          <Grid item xs={12} md={6}><Skeleton variant="rounded" height={280} /></Grid>
          <Grid item xs={12} md={6}><Skeleton variant="rounded" height={280} /></Grid>
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader title="仪表盘" breadcrumbs={['仪表盘']} />

      {isFiltered && departmentName && (
        <Alert severity="info" icon={<FilterIcon />} sx={{ mb: 3, borderRadius: 2 }}>
          当前数据范围：<strong>{departmentName}</strong>（仅展示您所属部门的数据）
        </Alert>
      )}

      {/* ========== 第一行：核心统计卡片 ========== */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { title: '员工总数', value: stats?.totalEmployees, icon: <PeopleIcon />, color: '#1976d2', bg: '#e3f2fd', subtitle: `在职 ${stats?.activeEmployees} 人` },
          { title: '本月入职', value: stats?.thisMonthHires, icon: <HireIcon />, color: '#2e7d32', bg: '#e8f5e9', trend: trendArrow(stats?.thisMonthHires, stats?.lastMonthHires) },
          { title: '本月离职', value: stats?.thisMonthResign, icon: <ResignIcon />, color: '#d32f2f', bg: '#ffebee', trend: trendArrow(stats?.thisMonthResign, stats?.lastMonthResign) },
          { title: '待审批请假', value: stats?.pendingLeaves, icon: <LeaveIcon />, color: '#ed6c02', bg: '#fff3e0' },
          { title: '今日出勤', value: stats?.todayAttendance, icon: <AttIcon />, color: '#0288d1', bg: '#e1f5fe' },
          { title: '在招岗位', value: stats?.openJobs, icon: <JobIcon />, color: '#7b1fa2', bg: '#f3e5f5' },
          { title: '即将培训', value: stats?.upcomingTrainings, icon: <TrainIcon />, color: '#00838f', bg: '#e0f7fa', subtitle: `进行中 ${stats?.trainingInProgress}` },
          { title: '合同预警', value: stats?.expiringContracts?.length || 0, icon: <ContractIcon />, color: '#c62828', bg: '#ffebee', subtitle: '30天内到期' },
        ].map((card, i) => (
          <Grid item xs={6} sm={4} md={3} lg={1.5} key={i}>
            <Card sx={{ height: '100%', transition: 'box-shadow 0.3s', '&:hover': { boxShadow: 4 } }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{
                    width: 44, height: 44, borderRadius: 1.5, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    bgcolor: card.bg, color: card.color,
                  }}>
                    {card.icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" noWrap>{card.title}</Typography>
                    <Stack direction="row" alignItems="baseline" spacing={0.5}>
                      <Typography variant="h5" fontWeight="bold">{card.value}</Typography>
                      {card.trend}
                    </Stack>
                    {card.subtitle && (
                      <Typography variant="caption" color="text.secondary">{card.subtitle}</Typography>
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ========== 第二行：趋势图 + 饼图 ========== */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent sx={{ pb: 1 }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>近 6 个月入职/离职趋势</Typography>
              {trendOption && (
                <ReactEChartsCore echarts={echarts} option={trendOption} style={{ height: 280 }} notMerge />
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ pb: 1 }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>性别分布</Typography>
              {genderOption && (
                <ReactEChartsCore echarts={echarts} option={genderOption} style={{ height: 120 }} notMerge />
              )}
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>员工状态</Typography>
              {statusOption && (
                <ReactEChartsCore echarts={echarts} option={statusOption} style={{ height: 110 }} notMerge />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ========== 第三行：部门分布 + 快捷列表 ========== */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ pb: 1 }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                部门人员分布
                {isFiltered && <Chip label={departmentName} size="small" color="primary" sx={{ ml: 1 }} />}
              </Typography>
              {deptOption && (
                <ReactEChartsCore echarts={echarts} option={deptOption} style={{ height: 240 }} notMerge />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ pb: 1 }}>
              <TabsRow stats={stats} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

/* ========== 快捷信息 Tab 切换 ========== */
function TabsRow({ stats }) {
  const [tab, setTab] = useState(0);
  const tabs = [
    { label: '最近入职', icon: <HireIcon fontSize="small" />, data: stats?.recentHires || [] },
    { label: '本月生日', icon: <CakeIcon fontSize="small" />, data: stats?.upcomingBirthdays || [] },
    { label: '合同预警', icon: <WarningIcon fontSize="small" />, data: stats?.expiringContracts || [], type: 'contract' },
  ];

  const current = tabs[tab];

  if (!current) return null;

  return (
    <Box>
      <Stack direction="row" spacing={0.5} sx={{ mb: 2 }}>
        {tabs.map((t, i) => (
          <Chip
            key={i}
            icon={t.icon}
            label={`${t.label} (${t.data.length})`}
            size="small"
            variant={tab === i ? 'filled' : 'outlined'}
            color={i === 2 && t.data.length > 0 ? 'error' : 'primary'}
            onClick={() => setTab(i)}
            sx={{ fontWeight: tab === i ? 'bold' : 'normal' }}
          />
        ))}
      </Stack>

      {current.type === 'contract' ? (
        // 合同预警
        current.data.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>暂无即将到期的合同 🎉</Box>
        ) : (
          <TableContainer sx={{ maxHeight: 280 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: 12 }}>员工</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: 12 }}>到期日期</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', fontSize: 12 }} align="right">剩余天数</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {current.data.map((c) => {
                  const daysLeft = Math.ceil((new Date(c.endDate) - new Date()) / 86400000);
                  return (
                    <TableRow key={c.id} hover>
                      <TableCell sx={{ fontSize: 12 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: 11 }}>{c.employee?.name?.[0]}</Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">{c.employee?.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{c.employee?.department?.name}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        {new Date(c.endDate).toLocaleDateString('zh-CN')}
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${daysLeft} 天`}
                          size="small"
                          color={daysLeft <= 7 ? 'error' : daysLeft <= 15 ? 'warning' : 'primary'}
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )
      ) : (
        // 最近入职 / 本月生日
        current.data.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
            {tab === 0 ? '暂无最近入职记录' : '本月无员工生日'}
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {current.data.map((item, idx) => (
              <Stack key={item.id || idx} direction="row" alignItems="center" spacing={1.5}
                sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'grey.50', '&:hover': { bgcolor: 'grey.100' } }}
              >
                <Avatar sx={{ width: 36, height: 36, fontSize: 14, bgcolor: tab === 1 ? '#ec407a' : '#1976d2' }}>
                  {tab === 1 ? '🎂' : item.name?.[0]}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight="bold">{item.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.employeeNo} · {item.department?.name || ''}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {tab === 0
                    ? new Date(item.hireDate).toLocaleDateString('zh-CN')
                    : item.birthday ? `${new Date(item.birthday).getMonth() + 1}月${new Date(item.birthday).getDate()}日` : ''
                  }
                </Typography>
              </Stack>
            ))}
          </Stack>
        )
      )}
    </Box>
  );
}
