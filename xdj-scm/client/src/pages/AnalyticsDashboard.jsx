import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, CircularProgress, Alert, Divider,
} from '@mui/material';
import { ShoppingCart, Sell, Inventory, AccountBalance, Warning, Inventory2, TrendingUp } from '@mui/icons-material';
import { api } from '../lib/api';

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/extra/analytics').then((res) => setData(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (!data) return <Alert severity="info">暂无数据</Alert>;

  const StatCard = ({ icon, title, value, sub, color }) => (
    <Card><CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>{icon}<Typography color="textSecondary" variant="body2">{title}</Typography></Box>
      <Typography variant="h5" color={color}>{value}</Typography>
      {sub && <Typography variant="caption" color="textSecondary">{sub}</Typography>}
    </CardContent></Card>
  );

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>数据分析看板</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}><StatCard icon={<ShoppingCart color="primary" />} title="采购总额" value={`¥${Number(data.purchase.totalAmount).toLocaleString()}`} sub={`${data.purchase.count} 笔订单`} color="primary.main" /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard icon={<Sell color="success" />} title="销售总额" value={`¥${Number(data.sales.totalAmount).toLocaleString()}`} sub={`${data.sales.count} 笔订单`} color="success.main" /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard icon={<Inventory color="info" />} title="库存总量" value={`${data.inventory.totalQty}`} sub={`${data.inventory.skuCount} 个SKU`} color="info.main" /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard icon={<AccountBalance color="warning" />} title="应收余额" value={`¥${Number(data.receivable.totalBalance).toLocaleString()}`} sub={`${data.receivable.count} 笔`} color="warning.main" /></Grid>
      </Grid>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}><StatCard icon={<AccountBalance color="error" />} title="应付余额" value={`¥${Number(data.payable.totalBalance).toLocaleString()}`} sub={`${data.payable.count} 笔`} color="error.main" /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard icon={<Inventory2 color="info" />} title="活跃批次" value={`${data.batch.activeCount}`} sub={`${data.batch.expiringCount} 个临期`} color="info.main" /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard icon={<TrendingUp color="primary" />} title="供应商" value={`${data.master.supplierCount}`} sub="活跃" color="primary.main" /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard icon={<TrendingUp color="success" />} title="客户" value={`${data.master.customerCount}`} sub="活跃" color="success.main" /></Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />
      <Typography variant="h6" sx={{ mb: 1 }}>近30天趋势</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card><CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>采购趋势 ({data.trend.purchases.length} 笔)</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: 200, overflow: 'auto' }}>
              {data.trend.purchases.map((p, i) => (
                <Box key={i} sx={{ p: 0.5, bgcolor: 'primary.light', borderRadius: 1, fontSize: 11, color: 'white' }}>
                  {new Date(p.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}: ¥{Number(p.amount).toFixed(0)}
                </Box>
              ))}
              {!data.trend.purchases.length && <Typography variant="body2" color="textSecondary">暂无数据</Typography>}
            </Box>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card><CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>销售趋势 ({data.trend.sales.length} 笔)</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: 200, overflow: 'auto' }}>
              {data.trend.sales.map((s, i) => (
                <Box key={i} sx={{ p: 0.5, bgcolor: 'success.light', borderRadius: 1, fontSize: 11, color: 'white' }}>
                  {new Date(s.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}: ¥{Number(s.amount).toFixed(0)}
                </Box>
              ))}
              {!data.trend.sales.length && <Typography variant="body2" color="textSecondary">暂无数据</Typography>}
            </Box>
          </CardContent></Card>
        </Grid>
      </Grid>
    </Box>
  );
}
