import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Paper, Button,
  Chip, Alert, CircularProgress, Snackbar,
} from '@mui/material';
import { Thermostat, Warning, Sensors, Refresh } from '@mui/icons-material';
import { api } from '../../lib/api';

export default function TemperatureDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });

  const loadData = () => {
    setLoading(true);
    api.get('/coldchain/dashboard').then((res) => setData(res.data)).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { loadData(); }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (!data) return <Alert severity="info">暂无数据</Alert>;

  const { stats, sensors } = data;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">温度监控看板</Typography>
        <Button startIcon={<Refresh />} onClick={loadData}>刷新</Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={3}><Card><CardContent><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Sensors color="primary" /><Box><Typography variant="h4">{stats.totalSensors}</Typography><Typography color="textSecondary" variant="body2">传感器总数</Typography></Box></Box></CardContent></Card></Grid>
        <Grid item xs={3}><Card><CardContent><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Sensors color="success" /><Box><Typography variant="h4">{stats.activeSensors}</Typography><Typography color="textSecondary" variant="body2">在线传感器</Typography></Box></Box></CardContent></Card></Grid>
        <Grid item xs={3}><Card><CardContent><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Warning color="error" /><Box><Typography variant="h4" color="error.main">{stats.activeAlerts}</Typography><Typography color="textSecondary" variant="body2">活跃告警</Typography></Box></Box></CardContent></Card></Grid>
        <Grid item xs={3}><Card><CardContent><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Thermostat color="info" /><Box><Typography variant="h4">{stats.todayRecords}</Typography><Typography color="textSecondary" variant="body2">今日记录</Typography></Box></Box></CardContent></Card></Grid>
      </Grid>

      <Typography variant="h6" sx={{ mb: 1 }}>传感器实时状态</Typography>
      <Grid container spacing={2}>
        {sensors.map((s) => (
          <Grid item xs={12} sm={6} md={4} key={s.id}>
            <Card variant="outlined" sx={{ borderLeft: 4, borderColor: s.isNormal ? 'success.main' : 'error.main' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2">{s.name}</Typography>
                  <Chip label={s.isNormal ? '正常' : '异常'} size="small" color={s.isNormal ? 'success' : 'error'} />
                </Box>
                <Typography variant="body2" color="textSecondary">{s.warehouseName} / {s.zoneName}</Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                  <Typography variant="body2">温度: <strong>{s.latestTemp ? `${s.latestTemp}°C` : '-'}</strong></Typography>
                  <Typography variant="body2">湿度: <strong>{s.latestHumidity ? `${s.latestHumidity}%` : '-'}</strong></Typography>
                </Box>
                <Typography variant="caption" color="textSecondary">范围: {s.tempMin ? `${s.tempMin}~${s.tempMax}°C` : '未设置'} | 最后读数: {s.lastReadingAt ? new Date(s.lastReadingAt).toLocaleString() : '从未'}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {!sensors.length && <Grid item xs={12}><Alert severity="info">暂无传感器，请先在传感器管理中添加</Alert></Grid>}
      </Grid>
    </Box>
  );
}
