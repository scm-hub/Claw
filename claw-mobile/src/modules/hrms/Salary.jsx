import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, List, ListItem, ListItemText, CircularProgress } from '@mui/material';
import dayjs from 'dayjs';
import api from './api';

export default function Salary() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/salary/my')
      .then((res) => {
        if (res.success) setRecords(res.data?.list || res.data || (Array.isArray(res.data) ? res.data : [res.data]));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>;

  const latest = Array.isArray(records) ? records[records.length - 1] : records;

  return (
    <Box sx={{ p: 2, pb: 8 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>我的薪资</Typography>

      {latest ? (
        <>
          <Card sx={{ mb: 2, background: 'linear-gradient(135deg, #2e7d32, #4caf50)', color: '#fff' }}>
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>{latest.month || '最新'} 实发工资</Typography>
              <Typography variant="h4" sx={{ mt: 1 }}>¥ {(latest.netSalary || 0).toLocaleString()}</Typography>
            </CardContent>
          </Card>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}><Card><CardContent>
              <Typography color="text.secondary" variant="body2">基本工资</Typography>
              <Typography variant="h6">¥ {(latest.baseSalary || 0).toLocaleString()}</Typography>
            </CardContent></Card></Grid>
            <Grid item xs={6}><Card><CardContent>
              <Typography color="text.secondary" variant="body2">津贴补贴</Typography>
              <Typography variant="h6">¥ {(latest.allowance || 0).toLocaleString()}</Typography>
            </CardContent></Card></Grid>
            <Grid item xs={6}><Card><CardContent>
              <Typography color="text.secondary" variant="body2">加班费</Typography>
              <Typography variant="h6">¥ {(latest.overtime || 0).toLocaleString()}</Typography>
            </CardContent></Card></Grid>
            <Grid item xs={6}><Card><CardContent>
              <Typography color="text.secondary" variant="body2">奖金</Typography>
              <Typography variant="h6">¥ {(latest.bonus || 0).toLocaleString()}</Typography>
            </CardContent></Card></Grid>
            <Grid item xs={6}><Card><CardContent>
              <Typography color="text.secondary" variant="body2">社保个税</Typography>
              <Typography variant="h6" color="error">-¥ {((latest.socialIns || 0) + (latest.tax || 0)).toLocaleString()}</Typography>
            </CardContent></Card></Grid>
            <Grid item xs={6}><Card><CardContent>
              <Typography color="text.secondary" variant="body2">其他扣款</Typography>
              <Typography variant="h6" color="error">-¥ {(latest.deduction || 0).toLocaleString()}</Typography>
            </CardContent></Card></Grid>
          </Grid>

          <Typography variant="subtitle1" sx={{ mb: 1 }}>历史记录</Typography>
          <List>
            {[...records].reverse().map((r) => (
              <ListItem key={r.id || r.month} divider>
                <ListItemText
                  primary={r.month}
                  secondary={`应发 ¥${((r.baseSalary||0)+(r.allowance||0)+(r.overtime||0)+(r.bonus||0)).toLocaleString()} | 实发 ¥${(r.netSalary||0).toLocaleString()}`}
                />
              </ListItem>
            ))}
          </List>
        </>
      ) : (
        <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>暂无薪资数据</Typography>
      )}
    </Box>
  );
}
