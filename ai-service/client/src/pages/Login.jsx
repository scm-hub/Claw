import { Box, Card, CardContent, Typography, Button, Alert } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import useAuthStore from '../store/auth.js';

export default function Login() {
  const { ssoToken } = useAuthStore();

  return (
    <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh" bgcolor="#f5f5f5">
      <Card sx={{ maxWidth: 420, width: '100%', textAlign: 'center', p: 3 }}>
        <CardContent>
          <SmartToyIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" fontWeight="bold" gutterBottom>AI 智能服务</Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            杭州鲜当家全品类食用菌综合管理平台
          </Typography>
          <Alert severity="info" sx={{ mb: 2, textAlign: 'left' }}>
            请通过统一门户登录后，点击「AI 智能服务」卡片进入。
          </Alert>
          <Button
            variant="contained"
            fullWidth
            size="large"
            href="http://192.168.21.34:5174"
          >
            前往门户登录
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
