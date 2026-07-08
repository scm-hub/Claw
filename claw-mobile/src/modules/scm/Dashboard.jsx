import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Grid, Typography, CircularProgress, Divider, Stack, Avatar } from '@mui/material';
import {
  Inventory2, ShoppingCart, Assignment, TrendingUp, Warning, AccountBalanceWallet,
  QrCodeScanner, Dashboard as HomeIcon,
} from '@mui/icons-material';
import api from './api';
import { useAuthStore } from '../../store/authStore';
import { getDashboardCards, getQuickActions, getRoleGroupName } from './navConfig';

// 图标映射（与服务端 icon 字段对应）
const ICONS = {
  Dashboard: HomeIcon,
  ShoppingCart: ShoppingCart,
  TrendingUp: TrendingUp,
  Inventory: Inventory2,
  AccountBalanceWallet: AccountBalanceWallet,
  Warning: Warning,
  QrCodeScanner: QrCodeScanner,
  Assignment: Assignment,
};

function renderIcon(iconName) {
  const IconComp = ICONS[iconName];
  return IconComp ? <IconComp /> : null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, layoutConfig, fetchLayoutConfig } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const role = user?.role || 'WAREHOUSE_STAFF';

  // 仪表盘卡片：优先服务端动态配置，fallback 本地
  const cards = layoutConfig?.dashboardCards || getDashboardCards(role);
  const quickActions = layoutConfig?.quickActions || getQuickActions(role);
  const roleGroupName = layoutConfig?.roleGroup
    ? ({ admin: '管理员', warehouse: '仓储', sales: '销售', purchase: '采购', finance: '财务', logistics: '物流', default: '通用' }[layoutConfig.roleGroup] || layoutConfig.roleGroup)
    : getRoleGroupName(role);

  // 拉取布局配置（如果 store 里没有）
  useEffect(() => {
    if (!layoutConfig && user?.role) {
      fetchLayoutConfig(user.role).catch(() => {});
    }
  }, [layoutConfig, user?.role, fetchLayoutConfig]);

  // 拉取分析数据
  useEffect(() => {
    api.get('/extra/analytics').then((res) => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  // 根据卡片配置渲染数据
  const getCardValue = (card) => {
    if (!data) return '-';
    switch (card.key) {
      case 'sales': return `¥${Number(data.sales?.totalAmount || 0).toLocaleString()}`;
      case 'purchase': return `¥${Number(data.purchase?.totalAmount || 0).toLocaleString()}`;
      case 'inventory': return `${data.inventory?.totalQty || 0} 件`;
      case 'receivable': return `¥${Number(data.receivable?.totalBalance || 0).toLocaleString()}`;
      case 'payable': return `¥${Number(data.payable?.totalBalance || 0).toLocaleString()}`;
      case 'batch': return data.batch?.expiringCount || 0;
      case 'pendingInbound': return '-';
      case 'pendingStockTake': return '-';
      default: return '-';
    }
  };

  const getCardSub = (card) => {
    if (!data) return null;
    switch (card.key) {
      case 'inventory': return `${data.inventory?.skuCount || 0} SKU`;
      case 'batch': return `在库 ${data.batch?.activeCount || 0}`;
      default: return null;
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* 角色组视图标题 */}
      <Typography variant="subtitle1" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
        {roleGroupName}视图
      </Typography>

      {/* 仪表盘卡片 */}
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {cards.map((card, idx) => (
          <Grid item xs={6} key={idx}>
            <Card variant="outlined" sx={{
              borderLeft: 3, borderColor: card.color || 'primary.main',
              cursor: card.path ? 'pointer' : 'default',
            }} onClick={() => card.path && navigate(card.path)}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary">{card.label}</Typography>
                <Typography variant="h6" sx={{ color: card.color || 'primary.main', fontSize: '1.1rem' }}>
                  {getCardValue(card)}
                </Typography>
                {getCardSub(card) && (
                  <Typography variant="caption" color="text.secondary">{getCardSub(card)}</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 快捷操作 */}
      {quickActions && quickActions.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>快捷操作</Typography>
          <Stack direction="row" spacing={1}>
            {quickActions.map((action, idx) => (
              <Box key={idx} sx={{ textAlign: 'center', flex: 1 }} onClick={() => navigate(action.path)}>
                <Avatar sx={{
                  bgcolor: action.color?.replace('main', 'light') || 'primary.light',
                  width: 40, height: 40, mx: 'auto', mb: 0.5, cursor: 'pointer',
                }}>
                  {renderIcon(action.icon)}
                </Avatar>
                <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>{action.label}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {/* 临期预警 */}
      {data?.batch?.expiringCount > 0 && (
        <Card variant="outlined" sx={{ borderLeft: 3, borderColor: 'warning.main' }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="subtitle2" color="warning.main">临期预警</Typography>
            <Typography variant="body2">
              共 {data.batch.expiringCount} 个批次将在30天内过期
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ cursor: 'pointer' }} onClick={() => navigate('/inventory')}>
              查看详情 →
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
