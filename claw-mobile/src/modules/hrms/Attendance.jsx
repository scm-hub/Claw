import React, { useState, useEffect } from 'react';
import { Box, Typography, List, ListItem, ListItemText, Chip, CircularProgress } from '@mui/material';
import dayjs from 'dayjs';
import api from './api';

export default function Attendance() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const month = dayjs().format('YYYY-MM');
    api.get(`/attendance/records?month=${month}&page=1&pageSize=31`)
      .then((res) => {
        if (res.success) setRecords(res.data?.list || res.data?.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const statusColor = (s) => {
    const map = { NORMAL: 'success', LATE: 'warning', EARLY_LEAVE: 'warning', LATE_EARLY: 'error', ABSENT: 'error' };
    return map[s] || 'default';
  };
  const statusLabel = (s) => {
    const map = { NORMAL: '正常', LATE: '迟到', EARLY_LEAVE: '早退', LATE_EARLY: '迟到+早退', ABSENT: '缺勤' };
    return map[s] || s;
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 2, pb: 8 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>考勤记录</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {dayjs().format('YYYY年M月')}
      </Typography>
      {records.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>暂无考勤记录</Typography>
      ) : (
        <List>
          {records.map((r) => (
            <ListItem key={r.id} divider secondaryAction={
              <Chip size="small" label={statusLabel(r.status)} color={statusColor(r.status)} />
            }>
              <ListItemText
                primary={dayjs(r.date).format('M月D日 ddd')}
                secondary={
                  r.clockIn
                    ? `上班 ${dayjs(r.clockIn).format('HH:mm')}${r.clockOut ? ` | 下班 ${dayjs(r.clockOut).format('HH:mm')}` : ''}`
                    : '未打卡'
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
