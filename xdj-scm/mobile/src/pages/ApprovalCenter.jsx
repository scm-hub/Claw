import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, CircularProgress, Alert, Tabs, Tab,
  List, ListItem, ListItemText, Chip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton,
} from '@mui/material';
import { Check, Close, Pending, Approval } from '@mui/icons-material';
import api from '../lib/api';

export default function ApprovalCenter() {
  const [tab, setTab] = useState(0); // 0=待审批, 1=已审批
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadItems();
  }, [tab]);

  const loadItems = async () => {
    setLoading(true);
    setError('');
    try {
      // 调用 workflow-engine API 获取审批列表
      const status = tab === 0 ? 'pending' : 'completed';
      const res = await api.get(`/workflow/api/tasks?status=${status}&page=1&pageSize=20`);
      setItems(res.data?.list || []);
    } catch (e) {
      // workflow-engine 可能未启动或路径不同
      setError('审批数据加载失败，请确认审批引擎服务正常');
    }
    setLoading(false);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab icon={<Pending />} label="待审批" />
        <Tab icon={<Check />} label="已审批" />
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="warning">{error}</Alert>
      ) : items.length === 0 ? (
        <Alert severity="info">{tab === 0 ? '暂无待审批任务' : '暂无已审批记录'}</Alert>
      ) : (
        <List>
          {items.map((item) => (
            <ApprovalCard key={item.id} item={item} onAction={loadItems} />
          ))}
        </List>
      )}
    </Box>
  );
}

function ApprovalCard({ item, onAction }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [action, setAction] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAction = async () => {
    setSubmitting(true);
    try {
      await api.post('/workflow/api/tasks/' + item.id + '/action', {
        action,
        comment,
      });
      setDialogOpen(false);
      onAction();
    } catch (e) {
      // 静默处理
    }
    setSubmitting(false);
  };

  return (
    <Card sx={{ mb: 1 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {item.businessType || item.title || '审批任务'}
          </Typography>
          <Chip
            size="small"
            label={item.status === 'pending' ? '待审批' : item.status === 'approved' ? '已通过' : '已拒绝'}
            color={item.status === 'pending' ? 'warning' : item.status === 'approved' ? 'success' : 'error'}
          />
        </Box>
        <Typography variant="body2" color="textSecondary">
          申请人: {item.submitterName || '-'}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          提交时间: {item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN') : '-'}
        </Typography>
        {item.status === 'pending' && (
          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={<Check />}
              onClick={() => { setAction('approve'); setDialogOpen(true); }}
            >
              通过
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<Close />}
              onClick={() => { setAction('reject'); setDialogOpen(true); }}
            >
              拒绝
            </Button>
          </Box>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth>
        <DialogTitle>{action === 'approve' ? '审批通过' : '审批拒绝'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="审批意见"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button
            onClick={handleAction}
            variant="contained"
            color={action === 'approve' ? 'success' : 'error'}
            disabled={submitting}
          >
            {submitting ? '提交中...' : '确认'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
