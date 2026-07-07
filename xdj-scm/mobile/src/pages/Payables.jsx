import { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, CircularProgress, Chip, List, ListItem, ListItemText, Divider } from '@mui/material';
import api from '../lib/api';

const STATUS_MAP = {
  PENDING: { label: '待付款', color: 'warning' },
  PARTIAL: { label: '部分付款', color: 'info' },
  PAID: { label: '已付清', color: 'success' },
  OVERDUE: { label: '逾期', color: 'error' },
};

export default function Payables() {
  const [list, setList] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/finance/payable').then((res) => {
      setList(res.data.list);
      setSummary(res.data.summary);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!list || list.length === 0) return <Typography sx={{ textAlign: 'center', py: 4 }} color="textSecondary">暂无应付记录</Typography>;

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
        <Card sx={{ flex: 1, background: 'linear-gradient(135deg,#d32f2f,#ef5350)' }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>应付总额</Typography>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>¥{Number(summary?.amount || 0).toLocaleString()}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, background: 'linear-gradient(135deg,#b71c1c,#ff8a80)' }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>未付余额</Typography>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>¥{Number(summary?.balance || 0).toLocaleString()}</Typography>
          </CardContent>
        </Card>
      </Box>

      <List sx={{ p: 0 }}>
        {list.map((p, i) => {
          const st = STATUS_MAP[p.status] || { label: p.status, color: 'default' };
          return (
            <Box key={p.id}>
              {i > 0 && <Divider />}
              <ListItem sx={{ py: 1.5, px: 0 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.apNo}</Typography>
                      <Chip label={st.label} size="small" color={st.color} />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      <Typography variant="body2" color="textSecondary">{p.supplier?.name || '-'}</Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                        <Typography variant="caption" color="textSecondary">到期 {p.dueDate?.slice(0, 10)}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#d32f2f' }}>
                          余额 ¥{Number(p.balance).toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
            </Box>
          );
        })}
      </List>
    </Box>
  );
}
