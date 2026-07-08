import React from 'react';
import { Box, Typography } from '@mui/material';

export default function SCMHome() {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6">供应链管理</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        库存 / 采购 / 销售 / 扫码 / 盘点
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
        即将迁移现有 SCM 移动端功能...
      </Typography>
    </Box>
  );
}
