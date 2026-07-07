import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Badge as BadgeIcon,
  Inventory2,
  Settings,
  Add,
  OpenInNew,
} from '@mui/icons-material';
import useAuthStore from '../store/auth';
import api from '../api';

// 系统图标映射
const ICON_MAP = {
  badge: <BadgeIcon sx={{ fontSize: 48 }} />,
  inventory_2: <Inventory2 sx={{ fontSize: 48 }} />,
  settings: <Settings sx={{ fontSize: 48 }} />,
};

export default function Dashboard() {
  const { user, systems, token, logout } = useAuthStore();
  const [allSystems, setAllSystems] = useState(systems);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从后端刷新系统列表（可能有新增）
    api.get('/systems')
      .then((resp) => {
        if (resp.success) {
          setAllSystems(resp.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSystemClick = (system) => {
    // 防御性检查：确保有 token
    const currentToken = useAuthStore.getState().token;
    if (!currentToken) {
      alert('登录状态已过期，请重新登录');
      logout();
      return;
    }

    // 带 SSO 令牌跳转到子系统
    // 动态拼接：内网/外网统一用当前 Portal 域名 + 系统路径
    const PATH_MAP = {
      scm: '/scm/',
      hrms: '/hrms/',
      MDM: '/mdm/',
      mdm: '/mdm/',
      'ai-service': '/ai/',
      ai: '/ai/',
    };
    let finalUrl;
    if (PATH_MAP[system.code]) {
      // 走网关的子系统，动态拼接当前域名
      finalUrl = window.location.origin + PATH_MAP[system.code] + '?sso_token=' + encodeURIComponent(currentToken);
    } else {
      // 独立系统，使用数据库中的原始地址
      const url = new URL(system.url);
      url.searchParams.set('sso_token', currentToken);
      finalUrl = url.toString();
    }

    // 先打开新标签页（同步执行，确保跳转不被 API 调用阻塞）
    const anchor = document.createElement('a');
    anchor.href = finalUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    // 记录访问日志（异步、非阻塞，失败也不影响跳转）
    api.post('/auth/access-system', { systemCode: system.code }, { _skipAuthRedirect: true }).catch(() => {});
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* 欢迎区 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          欢迎回来，{user?.name || '用户'} 👋
        </Typography>
        <Typography variant="body1" color="text.secondary">
          您有 {allSystems.length} 个可用系统，点击卡片进入对应系统
        </Typography>
      </Box>

      {/* 系统卡片网格 */}
      <Grid container spacing={3}>
        {allSystems.map((system) => (
          <Grid item xs={12} sm={6} md={4} key={system.code}>
            <Card
              sx={{
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                },
              }}
            >
              <CardActionArea
                onClick={() => handleSystemClick(system)}
                sx={{ height: '100%', p: 0 }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: 3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: system.color + '15',
                        color: system.color,
                      }}
                    >
                      {ICON_MAP[system.icon] || <Settings sx={{ fontSize: 48 }} />}
                    </Box>
                    <OpenInNew sx={{ color: 'text.disabled', fontSize: 20 }} />
                  </Box>

                  <Typography variant="h6" fontWeight={700} sx={{ mt: 2 }}>
                    {system.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5, minHeight: 40 }}>
                    {system.description}
                  </Typography>
                  <Chip
                    label={`访问系统`}
                    size="small"
                    sx={{
                      bgcolor: system.color + '15',
                      color: system.color,
                      fontWeight: 600,
                    }}
                  />
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}

        {/* 待接入系统占位 */}
        <Grid item xs={12} sm={6} md={4}>
          <Card
            sx={{
              height: '100%',
              border: '2px dashed',
              borderColor: 'divider',
              bgcolor: 'transparent',
              boxShadow: 'none',
            }}
          >
            <CardContent
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 180,
              }}
            >
              <Add sx={{ fontSize: 40, color: 'text.disabled' }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                更多系统即将接入
              </Typography>
              <Typography variant="caption" color="text.disabled">
                MDM · AI 助手 · BI 分析 · ...
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
