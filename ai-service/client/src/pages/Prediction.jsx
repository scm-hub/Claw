import { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, CircularProgress, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Alert, LinearProgress, Divider,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import WarningIcon from '@mui/icons-material/Warning';
import api from '../api/index.js';

function TrendIcon({ trend }) {
  if (trend === 'rising') return <TrendingUpIcon color="success" />;
  if (trend === 'declining') return <TrendingDownIcon color="error" />;
  return <TrendingFlatIcon color="action" />;
}

export default function Prediction() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPredictionDashboard().then((resp) => {
      if (resp.success) setData(resp.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>;
  }

  if (!data) {
    return <Alert severity="warning">无法获取预测数据</Alert>;
  }

  const { sales, inventory, insights } = data;

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>🔮 智能预测</Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        基于历史数据的趋势分析与库存预测
      </Typography>

      {/* 智能洞察 */}
      {insights && insights.length > 0 && (
        <Box sx={{ mb: 3 }}>
          {insights.map((insight, i) => (
            <Alert
              key={i}
              severity={insight.type === 'critical' ? 'error' : insight.type === 'warning' ? 'warning' : insight.type === 'positive' ? 'success' : 'info'}
              sx={{ mb: 1 }}
              icon={insight.icon ? <span>{insight.icon}</span> : undefined}
            >
              <strong>{insight.title}</strong> — {insight.detail}
            </Alert>
          ))}
        </Box>
      )}

      <Grid container spacing={2}>
        {/* 销售预测 */}
        {sales && (
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <TrendIcon trend={sales.trend} /> 销售趋势预测
                </Typography>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="textSecondary">趋势</Typography>
                    <Typography variant="body1" fontWeight="bold">{sales.trendLabel}</Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="textSecondary">增长率</Typography>
                    <Typography variant="body1" fontWeight="bold" color={sales.growthRate >= 0 ? 'success.main' : 'error.main'}>
                      {sales.growthRate >= 0 ? '+' : ''}{sales.growthRate}%
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="textSecondary">日均销售</Typography>
                    <Typography variant="body1" fontWeight="bold">¥{sales.dailyAvg?.toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="textSecondary">总订单</Typography>
                    <Typography variant="body1" fontWeight="bold">{sales.totalOrders}</Typography>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 1 }} />

                <Typography variant="subtitle2" gutterBottom>未来三期预测</Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  {sales.prediction?.map((val, i) => (
                    <Box key={i} sx={{ flex: 1, textAlign: 'center', bgcolor: '#f5f5f5', borderRadius: 1, p: 1 }}>
                      <Typography variant="caption" color="textSecondary">{['下一期', '下两期', '下三期'][i]}</Typography>
                      <Typography variant="h6" color="primary.main">¥{val?.toLocaleString()}</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* 库存预测 */}
        {inventory && (
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <WarningIcon color="warning" /> 库存预测与补货建议
                </Typography>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">SKU 总数</Typography>
                    <Typography variant="h6">{inventory.totalSKUs}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">紧急补货</Typography>
                    <Typography variant="h6" color="error.main">{inventory.urgentCount}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">建议补货</Typography>
                    <Typography variant="h6" color="warning.main">{inventory.reorderCount}</Typography>
                  </Grid>
                </Grid>

                {/* 库存分布条 */}
                <Typography variant="subtitle2" gutterBottom>库存分布</Typography>
                <Box sx={{ display: 'flex', height: 24, borderRadius: 1, overflow: 'hidden', mb: 1 }}>
                  {inventory.distribution && [
                    { label: 'critical', color: '#f44336', value: inventory.distribution.critical },
                    { label: 'low', color: '#ff9800', value: inventory.distribution.low },
                    { label: 'medium', color: '#ffc107', value: inventory.distribution.medium },
                    { label: 'healthy', color: '#4caf50', value: inventory.distribution.healthy },
                  ].map((seg) => {
                    const total = Object.values(inventory.distribution).reduce((a, b) => a + b, 0) || 1;
                    const pct = (seg.value / total) * 100;
                    return pct > 0 ? (
                      <Box key={seg.label} sx={{ width: `${pct}%`, bgcolor: seg.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {pct > 10 && <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold' }}>{seg.value}</Typography>}
                      </Box>
                    ) : null;
                  })}
                </Box>

                {inventory.suggestions?.length > 0 && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" gutterBottom>补货建议 (Top 10)</Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>商品</TableCell>
                            <TableCell align="right">可用</TableCell>
                            <TableCell align="right">建议补货</TableCell>
                            <TableCell>优先级</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {inventory.suggestions.map((s, i) => (
                            <TableRow key={i}>
                              <TableCell>{s.materialName}</TableCell>
                              <TableCell align="right">{s.availableQty} {s.unit}</TableCell>
                              <TableCell align="right">{s.suggestedQty} {s.unit}</TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={s.priority === 'urgent' ? '紧急' : '建议'}
                                  color={s.priority === 'urgent' ? 'error' : 'warning'}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
