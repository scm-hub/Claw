import React from 'react';
import { Box, Typography } from '@mui/material';

export default function AIHome() {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6">AI 助手</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        智能对话 / 销售预测 / 订单助手
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
        功能开发中...
      </Typography>
    </Box>
  );
}
