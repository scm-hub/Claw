import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, CircularProgress,
  Alert, Tabs, Tab, List, ListItem, ListItemText, Chip, Divider,
} from '@mui/material';
import { QrCodeScanner, Inventory2, CheckCircle, Pending } from '@mui/icons-material';
import api from '../lib/api';

export default function ScanInbound() {
  const [tab, setTab] = useState(0);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanCode, setScanCode] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState('');

  useEffect(() => {
    loadPendingOrders();
  }, []);

  const loadPendingOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/purchase/orders?status=APPROVED&page=1&pageSize=20');
      setPendingOrders(res.data?.list || []);
    } catch (e) {
      // 接口可能不存在，静默处理
    }
    setLoading(false);
  };

  const handleScan = async () => {
    if (!scanCode.trim()) return;
    setScanError('');
    setScanResult(null);

    try {
      // 通过批次号/物料编码查找库存信息
      const res = await api.get(`/wms/inventory?keyword=${encodeURIComponent(scanCode)}`);
      if (res.data?.list?.length > 0) {
        setScanResult(res.data.list[0]);
      } else {
        setScanError(`未找到编码 "${scanCode}" 对应的物料`);
      }
    } catch (e) {
      setScanError(e.message || '查询失败');
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="扫码查询" />
        <Tab label="待入库订单" />
      </Tabs>

      {tab === 0 && (
        <Box>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>扫码查询物料</Typography>
              <TextField
                fullWidth
                label="扫描/输入物料编码或批次号"
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                sx={{ mb: 2 }}
              />
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<QrCodeScanner />}
                onClick={handleScan}
              >
                查询
              </Button>
            </CardContent>
          </Card>

          {scanError && <Alert severity="warning" sx={{ mb: 2 }}>{scanError}</Alert>}

          {scanResult && (
            <Card>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>查询结果</Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="物料名称" secondary={scanResult.materialName || scanResult.name || '-'} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="物料编码" secondary={scanResult.materialCode || scanResult.code || '-'} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="当前库存" secondary={`${scanResult.quantity || 0} ${scanResult.unit || ''}`} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="仓库" secondary={scanResult.warehouseName || '-'} />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {tab === 1 && (
        <Box>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : pendingOrders.length === 0 ? (
            <Alert severity="info">暂无待入库订单</Alert>
          ) : (
            <List>
              {pendingOrders.map((order) => (
                <Card key={order.id} sx={{ mb: 1 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {order.orderNo || order.code}
                      </Typography>
                      <Chip size="small" label="待入库" color="warning" />
                    </Box>
                    <Typography variant="body2" color="textSecondary">
                      供应商: {order.supplierName || '-'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      金额: ¥{Number(order.totalAmount || 0).toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </List>
          )}
        </Box>
      )}
    </Box>
  );
}
