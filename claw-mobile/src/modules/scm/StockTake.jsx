import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, CircularProgress, Alert,
  List, ListItem, ListItemText, Chip, Tabs, Tab, Button,
} from '@mui/material';
import { Assignment, Pending, CheckCircle } from '@mui/icons-material';
import api from './api';

const STATUS_MAP = {
  PENDING: { label: '待盘', color: 'warning' },
  COUNTED: { label: '已盘', color: 'info' },
  ADJUSTED: { label: '已调整', color: 'success' },
};

export default function StockTake() {
  const [tab, setTab] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, [tab]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const status = tab === 0 ? 'PENDING' : tab === 1 ? 'COUNTED' : 'ADJUSTED';
      const res = await api.get(`/wms/stock-takes?status=${status}&page=1&pageSize=20`);
      setItems(res.data?.list || []);
    } catch (e) {
      // 静默处理
    }
    setLoading(false);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }} variant="fullWidth">
        <Tab label="待盘" />
        <Tab label="已盘" />
        <Tab label="已调整" />
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : items.length === 0 ? (
        <Alert severity="info">暂无盘点记录</Alert>
      ) : (
        <List>
          {items.map((item) => {
            const statusInfo = STATUS_MAP[item.status] || { label: item.status, color: 'default' };
            return (
              <Card key={item.id} sx={{ mb: 1 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {item.stockTakeNo || item.code || `盘点 #${item.id}`}
                    </Typography>
                    <Chip size="small" label={statusInfo.label} color={statusInfo.color} />
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    仓库: {item.warehouseName || '-'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    盘点日期: {item.planDate ? new Date(item.planDate).toLocaleDateString('zh-CN') : '-'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    物料数: {item.itemCount || 0}
                  </Typography>
                </CardContent>
              </Card>
            );
          })}
        </List>
      )}
    </Box>
  );
}
