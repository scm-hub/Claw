import React from 'react';
import { Box, Typography } from '@mui/material';

export default function HRHome() {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6">人力资源</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        考勤打卡 / 请假审批 / 工资条 / 员工查询
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
        功能开发中...
      </Typography>
    </Box>
  );
}
