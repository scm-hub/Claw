import { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, CircularProgress, Chip, List, ListItem, ListItemText, Divider } from '@mui/material';
import api from './api';

const STATUS_MAP = {
  DRAFT: { label: '草稿', color: 'default' },
  PENDING: { label: '待审核', color: 'warning' },
  APPROVED: { label: '已审核', color: 'info' },
  ORDERED: { label: '已下达', color: 'primary' },
  RECEIVING: { label: '收货中', color: 'primary' },
  COMPLETED: { label: '已完成', color: 'success' },
  CANCELLED: { label: '已取消', color: 'error' },
  CLOSED: { label: '已关闭', color: 'default' },
};

export default function PurchaseOrders() {
  const [list, setList] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/purchase/orders').then((res) => {
      setList(res.data.list);
      setTotal(res.data.total);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!list || list.length === 0) return <Typography sx={{ textAlign: 'center', py: 4 }} color="textSecondary">暂无采购订单</Typography>;

  const totalAmount = list.reduce((s, o) => s + Number(o.grandTotal || 0), 0);

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
        <Card sx={{ flex: 1, background: 'linear-gradient(135deg,#9c27b0,#ba68c8)' }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>订单总数</Typography>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>{total}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, background: 'linear-gradient(135deg,#7b1fa2,#e1bee7)' }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>采购总额</Typography>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>¥{totalAmount.toLocaleString()}</Typography>
          </CardContent>
        </Card>
      </Box>

      <List sx={{ p: 0 }}>
        {list.map((o, i) => {
          const st = STATUS_MAP[o.status] || { label: o.status, color: 'default' };
          return (
            <Box key={o.id}>
              {i > 0 && <Divider />}
              <ListItem sx={{ py: 1.5, px: 0 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{o.orderNo}</Typography>
                      <Chip label={st.label} size="small" color={st.color} />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      <Typography variant="body2" color="textSecondary">{o.supplier?.name || '-'}</Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                        <Typography variant="caption" color="textSecondary">{o.orderDate?.slice(0, 10)}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#9c27b0' }}>¥{Number(o.grandTotal).toLocaleString()}</Typography>
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
