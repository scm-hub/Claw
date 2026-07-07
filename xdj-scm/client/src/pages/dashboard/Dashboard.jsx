import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid, Card, CardContent, Typography, Box, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, Chip, Skeleton, IconButton, Tooltip,
} from '@mui/material';
import {
  ShoppingCart, Storefront, Inventory2, AccountBalanceWallet,
  Warning, TrendingUp, Category, Business, Warehouse,
  ArrowForward, Receipt, Payments, LocalShipping,
  Analytics, Assessment, QrCodeScanner, AcUnit,
  PendingActions, CheckCircle, Schedule, Error as ErrorIcon,
} from '@mui/icons-material';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

// ============ 格式化金额 ============
function fmtMoney(n) {
  if (n == null || isNaN(n)) return '0.00';
  return Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ============ 渐变统计卡片 ============
function StatCard({ icon, label, value, gradient, delay, loading, onClick }) {
  return (
    <Card
      onClick={onClick}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        background: gradient,
        color: '#fff',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': onClick ? {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
        } : {},
      }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" sx={{ opacity: 0.85, mb: 0.5 }}>{label}</Typography>
            {loading ? (
              <Skeleton width={60} height={36} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
            ) : (
              <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.1 }}>{value}</Typography>
            )}
          </Box>
          <Box sx={{
            opacity: 0.25,
            '& > svg': { fontSize: 56 },
          }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
      {/* 装饰圆 */}
      <Box sx={{
        position: 'absolute', right: -20, bottom: -20,
        width: 80, height: 80, borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)',
      }} />
    </Card>
  );
}

// ============ 财务概览卡片 ============
function FinanceCard({ title, icon, total, settled, balance, color, loading }) {
  const pct = total > 0 ? Math.round((settled / total) * 100) : 0;
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Box sx={{ color, display: 'flex' }}>{icon}</Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{title}</Typography>
        </Box>
        {loading ? (
          <Skeleton variant="rounded" height={80} />
        ) : (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">总金额</Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                ¥{fmtMoney(total)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="body2" color="text.secondary">已收/付</Typography>
              <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                ¥{fmtMoney(settled)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <LinearProgress
                variant="determinate"
                value={pct}
                sx={{
                  flex: 1, height: 8, borderRadius: 4,
                  bgcolor: 'grey.200',
                  '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 },
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 32 }}>{pct}%</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="body2" color="text.secondary">未收/付</Typography>
              <Chip
                label={`¥${fmtMoney(balance)}`}
                size="small"
                color={balance > 0 ? 'warning' : 'default'}
                sx={{ fontWeight: 600 }}
              />
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============ 待办事项行 ============
function TodoRow({ icon, label, count, color, onClick }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.5, py: 1.2, px: 1,
        borderRadius: 1.5, cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.2s',
        '&:hover': onClick ? { background: 'action.hover' } : {},
      }}
    >
      <Box sx={{ color, display: 'flex' }}>{icon}</Box>
      <Typography variant="body2" sx={{ flex: 1 }}>{label}</Typography>
      <Chip label={count} size="small" color={count > 0 ? 'error' : 'default'} sx={{ fontWeight: 700, minWidth: 32 }} />
    </Box>
  );
}

// ============ 快捷入口 ============
function QuickAccess({ icon, label, path, color }) {
  const navigate = useNavigate();
  return (
    <Card
      onClick={() => navigate(path)}
      sx={{
        cursor: 'pointer', textAlign: 'center', py: 2,
        transition: 'all 0.25s',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
      }}
    >
      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
        <Box sx={{ color, mb: 0.5, '& > svg': { fontSize: 32 } }}>{icon}</Box>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
      </CardContent>
    </Card>
  );
}

// ============ 主组件 ============
export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    materialCount: 0,
    customerCount: 0,
    supplierCount: 0,
    warehouseCount: 0,
    purchaseOrderCount: 0,
    salesOrderCount: 0,
  });
  const [invStats, setInvStats] = useState({ totalSKUs: 0, lowStock: 0, totalBatches: 0, warehouses: [] });
  const [finance, setFinance] = useState({ ar: {}, ap: {}, invoiceCount: 0, payment: {} });
  const [pending, setPending] = useState({ purchasePending: 0, salesPending: 0, lowStock: 0 });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [
        materials, customers, suppliers, warehouses,
        purchaseOrders, salesOrders,
        invStatsRes, financeRes,
        poPending, soPending,
      ] = await Promise.all([
        api.get('/master/materials?pageSize=1').catch(() => null),
        api.get('/master/customers?pageSize=1').catch(() => null),
        api.get('/master/suppliers?pageSize=1').catch(() => null),
        api.get('/master/warehouses').catch(() => null),
        api.get('/purchase/orders?pageSize=1').catch(() => null),
        api.get('/sales/orders?pageSize=1').catch(() => null),
        api.get('/wms/inventory/stats').catch(() => null),
        api.get('/finance/dashboard').catch(() => null),
        api.get('/purchase/orders?pageSize=1&status=PENDING').catch(() => null),
        api.get('/sales/orders?pageSize=1&status=PENDING_APPROVAL').catch(() => null),
      ]);

      setStats({
        materialCount: materials?.data?.total ?? 0,
        customerCount: customers?.data?.total ?? 0,
        supplierCount: suppliers?.data?.total ?? 0,
        warehouseCount: Array.isArray(warehouses?.data) ? warehouses.data.length : 0,
        purchaseOrderCount: purchaseOrders?.data?.total ?? 0,
        salesOrderCount: salesOrders?.data?.total ?? 0,
      });

      const invData = invStatsRes?.data;
      if (invData) {
        setInvStats({
          totalSKUs: invData.totalSKUs ?? 0,
          lowStock: invData.lowStock ?? 0,
          totalBatches: invData.totalBatches ?? 0,
          warehouses: invData.warehouses ?? [],
        });
      }

      const finData = financeRes?.data;
      if (finData) {
        setFinance({
          ar: finData.ar || {},
          ap: finData.ap || {},
          invoiceCount: finData.invoiceCount ?? 0,
          payment: finData.payment || {},
        });
      }

      setPending({
        purchasePending: poPending?.data?.total ?? 0,
        salesPending: soPending?.data?.total ?? 0,
        lowStock: invData?.lowStock ?? 0,
      });
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  const userName = user?.name || user?.username || '用户';

  const statCards = [
    { label: '产品数量', value: stats.materialCount, icon: <Inventory2 />, gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', path: '/master/materials' },
    { label: '客户数量', value: stats.customerCount, icon: <Storefront />, gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', path: '/master/customers' },
    { label: '供应商数量', value: stats.supplierCount, icon: <Business />, gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', path: '/master/suppliers' },
    { label: '采购订单', value: stats.purchaseOrderCount, icon: <ShoppingCart />, gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', path: '/purchase/orders' },
    { label: '销售订单', value: stats.salesOrderCount, icon: <TrendingUp />, gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', path: '/sales/orders' },
    { label: '仓库数量', value: stats.warehouseCount, icon: <Warehouse />, gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', path: '/master/warehouses' },
  ];

  const quickAccess = [
    { label: '采购管理', path: '/purchase/orders', icon: <ShoppingCart />, color: '#7B1FA2' },
    { label: '销售管理', path: '/sales/orders', icon: <Storefront />, color: '#2E7D32' },
    { label: '库存管理', path: '/wms/inventory', icon: <Inventory2 />, color: '#1565C0' },
    { label: '财务结算', path: '/finance/receivable', icon: <AccountBalanceWallet />, color: '#E65100' },
    { label: '批次追溯', path: '/traceability/batches', icon: <Assessment />, color: '#00695C' },
    { label: '物流发货', path: '/logistics/shipping-orders', icon: <LocalShipping />, color: '#37474F' },
    { label: '冷链监控', path: '/coldchain/dashboard', icon: <AcUnit />, color: '#0277BD' },
    { label: '数据分析', path: '/analytics', icon: <Analytics />, color: '#BF360C' },
    { label: '扫码作业', path: '/barcode', icon: <QrCodeScanner />, color: '#455A64' },
    { label: '供应商评估', path: '/supplier-eval', icon: <Assessment />, color: '#1B5E20' },
  ];

  const totalTodos = pending.purchasePending + pending.salesPending + pending.lowStock;

  return (
    <Box>
      {/* ====== 欢迎横幅 ====== */}
      <Card sx={{
        mb: 3,
        background: 'linear-gradient(135deg, #1a237e 0%, #283593 40%, #3949ab 100%)',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
            欢迎回来，{userName}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            {dateStr} · 鲜当家供应链管理系统
          </Typography>
          {/* 装饰圆 */}
          <Box sx={{
            position: 'absolute', right: -30, top: -30,
            width: 140, height: 140, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          }} />
          <Box sx={{
            position: 'absolute', right: 40, bottom: -40,
            width: 90, height: 90, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
          }} />
          {totalTodos > 0 && (
            <Chip
              icon={<PendingActions />}
              label={`${totalTodos} 项待处理`}
              sx={{
                mt: 1.5, bgcolor: 'rgba(255,255,255,0.15)', color: '#fff',
                fontWeight: 600, '& .MuiChip-icon': { color: '#ffb74d' },
              }}
              size="small"
            />
          )}
        </CardContent>
      </Card>

      {/* ====== 统计卡片 ====== */}
      <Grid container spacing={2} sx={{ mb: 1 }}>
        {statCards.map((card) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={card.label}>
            <StatCard
              icon={card.icon}
              label={card.label}
              value={card.value}
              gradient={card.gradient}
              loading={loading}
              onClick={() => navigate(card.path)}
            />
          </Grid>
        ))}
      </Grid>

      {/* ====== 财务 + 库存概览 ====== */}
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
          <FinanceCard
            title="应收账款"
            icon={<Receipt />}
            total={finance.ar?.amount ?? 0}
            settled={finance.ar?.receivedAmount ?? 0}
            balance={finance.ar?.balance ?? 0}
            color="#1976D2"
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FinanceCard
            title="应付账款"
            icon={<Payments />}
            total={finance.ap?.amount ?? 0}
            settled={finance.ap?.paidAmount ?? 0}
            balance={finance.ap?.balance ?? 0}
            color="#F57C00"
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* ====== 库存概况 + 待办事项 ====== */}
      <Grid container spacing={2} sx={{ mt: 1 }}>
        {/* 库存概况 */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Inventory2 color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>库存概况</Typography>
              </Box>
              {loading ? (
                <Skeleton variant="rounded" height={120} />
              ) : (
                <>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'rgba(25, 118, 210, 0.08)', borderRadius: 2 }}>
                        <Typography variant="h5" color="primary.main" sx={{ fontWeight: 700 }}>
                          {invStats.totalSKUs}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">库存品种</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'rgba(46, 125, 50, 0.08)', borderRadius: 2 }}>
                        <Typography variant="h5" color="success.main" sx={{ fontWeight: 700 }}>
                          {invStats.totalBatches}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">活跃批次</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'rgba(211, 47, 47, 0.08)', borderRadius: 2 }}>
                        <Typography variant="h5" color={invStats.lowStock > 0 ? 'error.main' : 'text.secondary'} sx={{ fontWeight: 700 }}>
                          {invStats.lowStock}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">低库存预警</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  {invStats.warehouses.length > 0 && (
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>仓库</TableCell>
                            <TableCell align="right">品种数</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {invStats.warehouses.slice(0, 5).map((wh) => (
                            <TableRow key={wh.id} hover>
                              <TableCell>{wh.name}</TableCell>
                              <TableCell align="right">{wh._count?.inventory ?? 0}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 待办事项 */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PendingActions color="warning" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>待处理事项</Typography>
              </Box>
              {loading ? (
                <Skeleton variant="rounded" height={140} />
              ) : (
                <>
                  <TodoRow
                    icon={<ShoppingCart />}
                    label="待审批采购订单"
                    count={pending.purchasePending}
                    color="#7B1FA2"
                    onClick={() => navigate('/purchase/orders')}
                  />
                  <TodoRow
                    icon={<Storefront />}
                    label="待审批销售订单"
                    count={pending.salesPending}
                    color="#2E7D32"
                    onClick={() => navigate('/sales/orders')}
                  />
                  <TodoRow
                    icon={<Warning />}
                    label="低库存预警"
                    count={pending.lowStock}
                    color="#D32F2F"
                    onClick={() => navigate('/wms/inventory')}
                  />
                  {totalTodos === 0 && (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">所有事项已处理完毕</Typography>
                    </Box>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ====== 快捷入口 ====== */}
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 3, mb: 1.5 }}>快捷入口</Typography>
      <Grid container spacing={1.5}>
        {quickAccess.map((item) => (
          <Grid item xs={6} sm={4} md={2} key={item.label}>
            <QuickAccess icon={item.icon} label={item.label} path={item.path} color={item.color} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
