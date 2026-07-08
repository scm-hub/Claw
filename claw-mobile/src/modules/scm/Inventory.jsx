import { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, InputAdornment, CircularProgress,
  Chip, Dialog, DialogTitle, DialogContent, IconButton, Tab, Tabs, Collapse,
  List, ListItem, ListItemText, Divider, Button,
} from '@mui/material';
import { Search, ExpandMore, ExpandLess, Inventory2, Warning, CheckCircle } from '@mui/icons-material';
import api from './api';

export default function Inventory() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [tab, setTab] = useState(0); // 0=all, 1=low, 2=warning
  const [batches, setBatches] = useState({});
  const [batchDialog, setBatchDialog] = useState({ open: false, data: [] });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/wms/inventory');
      let data = res.data?.list || res.data || [];
      setList(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // 筛选
  let filtered = list;
  if (keyword) {
    filtered = filtered.filter((i) =>
      i.material?.name?.includes(keyword) || i.material?.code?.includes(keyword)
    );
  }
  if (tab === 1) {
    filtered = filtered.filter((i) => i.qty <= 10);
  }
  if (tab === 2) {
    // 需要批次数据判断临期
    filtered = filtered.filter((i) => i._hasExpiring);
  }

  const handleExpand = async (materialId) => {
    if (expanded === materialId) {
      setExpanded(null);
      return;
    }
    if (!batches[materialId]) {
      try {
        const res = await api.get(`/traceability/batches?materialId=${materialId}&pageSize=50`);
        setBatches({ ...batches, [materialId]: res.data?.list || [] });
      } catch (e) { console.error(e); }
    }
    setExpanded(materialId);
  };

  const now = new Date();

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>实时库存</Typography>

      <TextField
        fullWidth size="small" placeholder="搜索物料名称/编码"
        value={keyword} onChange={(e) => setKeyword(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
        sx={{ mb: 1 }}
      />

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 1 }}>
        <Tab label="全部" />
        <Tab label="低库存" />
        <Tab label="临期" />
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
      ) : filtered.length === 0 ? (
        <Typography sx={{ textAlign: 'center', py: 4 }} color="textSecondary">暂无数据</Typography>
      ) : (
        <List>
          {filtered.map((item) => {
            const matBatches = batches[item.materialId] || [];
            const isExpanded = expanded === item.materialId;
            const lowStock = item.qty <= 10;
            return (
              <Card key={item.id} sx={{ mb: 1.5 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {item.material?.name || '未知物料'}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {item.material?.code} | {item.material?.spec || '-'} | {item.warehouse?.name || '-'}
                      </Typography>
                      <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" color="textSecondary">物理</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.qty}</Typography>
                          <Typography variant="caption" color="textSecondary">{item.material?.unit}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" color="textSecondary">可用</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: lowStock ? 'error.main' : 'success.main' }}>
                            {(item.availableQty ?? item.qty - (item.lockedQty || 0))}
                          </Typography>
                        </Box>
                        {item.lockedQty > 0 && <Chip label={`锁定${item.lockedQty}`} size="small" variant="outlined" />}
                        {lowStock && <Chip label="低库存" color="error" size="small" />}
                      </Box>
                    </Box>
                    <IconButton size="small" onClick={() => handleExpand(item.materialId)}>
                      {isExpanded ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Box>

                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>批次明细</Typography>
                    {matBatches.length === 0 ? (
                      <Typography variant="body2" color="textSecondary">暂无批次</Typography>
                    ) : (
                      matBatches.map((b) => {
                        const daysLeft = b.expiryDate ? Math.ceil((new Date(b.expiryDate) - now) / 86400000) : null;
                        const isExpiring = daysLeft !== null && daysLeft <= 30;
                        const isExpired = daysLeft !== null && daysLeft < 0;
                        return (
                          <Box key={b.id} sx={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            py: 0.5, px: 1, mb: 0.5, borderRadius: 1,
                            bgcolor: isExpired ? 'error.light' : isExpiring ? 'warning.light' : 'background.default',
                          }}>
                            <Box>
                              <Typography variant="body2">{b.batchNo}</Typography>
                              <Typography variant="caption" color="textSecondary">
                                剩余 {b.remainingQty} | {b.expiryDate ? `过期 ${b.expiryDate.slice(0, 10)}` : '无过期日'}
                              </Typography>
                            </Box>
                            {isExpired ? <Chip label="已过期" color="error" size="small" /> :
                             isExpiring ? <Chip label={`${daysLeft}天到期`} color="warning" size="small" /> :
                             <CheckCircle color="success" fontSize="small" />}
                          </Box>
                        );
                      })
                    )}
                  </Collapse>
                </CardContent>
              </Card>
            );
          })}
        </List>
      )}
    </Box>
  );
}
