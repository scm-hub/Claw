import { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, CircularProgress, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Divider, LinearProgress,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory2';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SyncIcon from '@mui/icons-material/Sync';
import api from '../api/index.js';

function StatCard({ icon, title, value, sub, color }) {
  return (
    <Card elevation={2}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ bgcolor: `${color}.main`, color: 'white', borderRadius: 2, p: 1, display: 'flex' }}>
            {icon}
          </Box>
          <Box>
            <Typography variant="caption" color="textSecondary">{title}</Typography>
            <Typography variant="h5" fontWeight="bold">{value}</Typography>
            {sub && <Typography variant="caption" color="textSecondary">{sub}</Typography>}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [sales, setSales] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [hr, setHr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getOverview(),
      api.getSalesAnalysis(),
      api.getInventoryAnalysis(),
      api.getHrAnalysis(),
    ]).then(([o, s, i, h]) => {
      if (o.success) setOverview(o.data);
      if (s.success) setSales(s.data);
      if (i.success) setInventory(i.data);
      if (h.success) setHr(h.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>📊 数据分析</Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        跨系统数据聚合分析 — HRMS + SCM + MDM
      </Typography>

      {/* 概览卡片 */}
      {overview && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard icon={<PeopleIcon />} title="员工总数" value={overview.hrms?.totalEmployees || 0} sub="HRMS 系统" color="success" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard icon={<ShoppingCartIcon />} title="销售订单" value={overview.scm?.totalOrders || 0} sub={`¥${(overview.scm?.totalSalesAmount || 0).toLocaleString()}`} color="primary" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard icon={<InventoryIcon />} title="SKU 总数" value={overview.scm?.totalSKUs || 0} sub={`低库存: ${overview.scm?.lowStock || 0}`} color="warning" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard icon={<SyncIcon />} title="主数据同步" value={`${overview.mdm?.departments || 0}/${overview.mdm?.employees || 0}`} sub="部门/员工" color="info" />
          </Grid>
        </Grid>
      )}

      <Grid container spacing={2}>
        {/* 销售分析 */}
        {sales && (
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>📋 销售分析</Typography>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">订单总数</Typography>
                    <Typography variant="h6">{sales.totalOrders}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">总金额</Typography>
                    <Typography variant="h6">¥{sales.totalAmount?.toLocaleString()}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">平均金额</Typography>
                    <Typography variant="h6">¥{sales.avgOrderAmount?.toLocaleString()}</Typography>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" gutterBottom>状态分布</Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                  {Object.entries(sales.byStatus || {}).map(([status, count]) => (
                    <Chip key={status} label={`${status}: ${count}`} size="small" variant="outlined" />
                  ))}
                </Box>
                {sales.topCustomers?.length > 0 && (
                  <>
                    <Typography variant="subtitle2" gutterBottom>Top 5 客户</Typography>
                    <Table size="small">
                      <TableBody>
                        {sales.topCustomers.map((c, i) => (
                          <TableRow key={i}>
                            <TableCell>{c.name}</TableCell>
                            <TableCell align="right">¥{c.amount.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* 库存分析 */}
        {inventory && (
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>📦 库存分析</Typography>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">SKU 总数</Typography>
                    <Typography variant="h6">{inventory.totalSKUs}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">低库存</Typography>
                    <Typography variant="h6" color="error.main">{inventory.lowStock}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">活跃批次</Typography>
                    <Typography variant="h6">{inventory.totalBatches}</Typography>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" gutterBottom>库存分布</Typography>
                <Box sx={{ mb: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={100}
                    sx={{
                      height: 24,
                      borderRadius: 1,
                      bgcolor: '#e0e0e0',
                      '& .MuiLinearProgress-bar': {
                        background: `linear-gradient(90deg, #f44336 0%, #f44336 ${inventory.distribution?.critical || 0}%, #ff9800 ${inventory.distribution?.critical || 0}%, #ff9800 ${(inventory.distribution?.critical || 0) + (inventory.distribution?.low || 0)}%, #ffc107 ${(inventory.distribution?.critical || 0) + (inventory.distribution?.low || 0)}%, #ffc107 ${(inventory.distribution?.critical || 0) + (inventory.distribution?.low || 0) + (inventory.distribution?.medium || 0)}%, #4caf50 ${(inventory.distribution?.critical || 0) + (inventory.distribution?.low || 0) + (inventory.distribution?.medium || 0)}%, #4caf50 100%)`,
                      },
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 2, fontSize: '0.75rem' }}>
                  <span>🔴 紧急: {inventory.distribution?.critical || 0}</span>
                  <span>🟡 偏低: {inventory.distribution?.low || 0}</span>
                  <span>🟠 中等: {inventory.distribution?.medium || 0}</span>
                  <span>🟢 充足: {inventory.distribution?.healthy || 0}</span>
                </Box>
                {inventory.byWarehouse?.length > 0 && (
                  <>
                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>按仓库分布</Typography>
                    <Table size="small">
                      <TableBody>
                        {inventory.byWarehouse.map((w, i) => (
                          <TableRow key={i}>
                            <TableCell>{w.name}</TableCell>
                            <TableCell align="right">{w.count} SKU</TableCell>
                            <TableCell align="right">{w.totalQty} 件</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* HR 分析 */}
        {hr && (
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>👥 人力资源分析</Typography>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">员工总数</Typography>
                    <Typography variant="h6">{hr.totalEmployees}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">部门数量</Typography>
                    <Typography variant="h6">{hr.totalDepartments}</Typography>
                  </Grid>
                </Grid>
                {hr.byDepartment?.length > 0 && (
                  <>
                    <Typography variant="subtitle2" gutterBottom>按部门分布</Typography>
                    <Table size="small">
                      <TableBody>
                        {hr.byDepartment.map((d, i) => (
                          <TableRow key={i}>
                            <TableCell>{d.name}</TableCell>
                            <TableCell align="right">{d.count} 人</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
