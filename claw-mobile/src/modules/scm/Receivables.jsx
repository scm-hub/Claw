import { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, CircularProgress, Chip, List, ListItem, ListItemText, Divider } from '@mui/material';
import api from './api';

const STATUS_MAP = {
  PENDING: { label: '待收款', color: 'warning' },
  PARTIAL: { label: '部分收款', color: 'info' },
  RECEIVED: { label: '已收清', color: 'success' },
  OVERDUE: { label: '逾期', color: 'error' },
};

export default function Receivables() {
  const [list, setList] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/finance/receivable').then((res) => {
      setList(res.data.list);
      setSummary(res.data.summary);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!list || list.length === 0) return <Typography sx={{ textAlign: 'center', py: 4 }} color="textSecondary">暂无应收记录</Typography>;

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
        <Card sx={{ flex: 1, background: 'linear-gradient(135deg,#ed6c02,#ff9800)' }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>应收总额</Typography>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>¥{Number(summary?.amount || 0).toLocaleString()}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, background: 'linear-gradient(135deg,#e65100,#ffb74d)' }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>未收余额</Typography>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>¥{Number(summary?.balance || 0).toLocaleString()}</Typography>
          </CardContent>
        </Card>
      </Box>

      <List sx={{ p: 0 }}>
        {list.map((r, i) => {
          const st = STATUS_MAP[r.status] || { label: r.status, color: 'default' };
          return (
            <Box key={r.id}>
              {i > 0 && <Divider />}
              <ListItem sx={{ py: 1.5, px: 0 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.arNo}</Typography>
                      <Chip label={st.label} size="small" color={st.color} />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      <Typography variant="body2" color="textSecondary">{r.customer?.name || '-'}</Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                        <Typography variant="caption" color="textSecondary">到期 {r.dueDate?.slice(0, 10)}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#ed6c02' }}>
                          余额 ¥{Number(r.balance).toLocaleString()}
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
