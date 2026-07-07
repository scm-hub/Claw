import { Box, Typography, Breadcrumbs, Link } from '@mui/material';
import { NavigateNext } from '@mui/icons-material';

/**
 * 页面头部组件
 * @param {string} title - 页面标题
 * @param {string} subtitle - 页面副标题
 * @param {React.ReactNode} action - 右侧操作区域
 * @param {Array} breadcrumbs - 面包屑导航
 */
export default function PageHeader({ title, subtitle, action, breadcrumbs = [] }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Breadcrumbs separator={<NavigateNext fontSize="small" />}>
        <Link underline="hover" color="inherit" href="/dashboard">首页</Link>
        {breadcrumbs.map((bc, i) => (
          <Typography key={i} color={i === breadcrumbs.length - 1 ? 'text.primary' : 'text.secondary'}>
            {bc}
          </Typography>
        ))}
      </Breadcrumbs>
      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
        <Box sx={{ flex: 1 }}>
          {title && (
            <Typography variant="h5" fontWeight="bold">{title}</Typography>
          )}
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {action && <Box sx={{ ml: 2 }}>{action}</Box>}
      </Box>
    </Box>
  );
}
