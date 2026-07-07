import { Outlet } from 'react-router-dom';
import { Box, Typography } from '@mui/material';

export default function AuthLayout() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)',
      }}
    >
      <Box
        sx={{
          width: 420,
          p: 4,
          bgcolor: 'background.paper',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}
      >
        <Typography variant="h4" align="center" fontWeight="bold" color="primary" gutterBottom>
          人力资源管理系统
        </Typography>
        <Outlet />
      </Box>
    </Box>
  );
}
