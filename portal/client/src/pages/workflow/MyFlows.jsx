// 我发起的审批流程

import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, Stack,
  Tab, Tabs, Alert,
} from '@mui/material';
import wfApi from '../../api/workflow';

const BUSINESS_TYPE_LABEL = {
  purchase_order: '采购订单',
  sales_order: '销售订单',
  purchase_return: '采购退货',
  payment_request: '付款申请',
  entry: '入职审批',
  exit: '离职审批',
  transfer: '调岗申请',
  contract: '合同审批',
};

const STATUS_LABEL = {
  pending: '审批中',
  approved: '已通过',
  rejected: '已拒绝',
  withdrawn: '已撤回',
  cancelled: '已撤销',
};

const STATUS_COLOR = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  withdrawn: 'default',
  cancelled: 'default',
};

export default function MyFlows() {
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    loadFlows();
  }, [tab]);

  const loadFlows = async () => {
    setLoading(true);
    try {
      const status = tab === 'all' ? null : tab;
      const resp = await wfApi.get('/my-flows', { params: { status } });
      if (resp.success) {
        setFlows(resp.data || []);
      }
    } catch (err) {
      setError('加载流程列表失败');
    }
    setLoading(false);
  };

  const handleWithdraw = async (instanceId) => {
    try {
      const resp = await wfApi.post(`/withdraw/${instanceId}`);
      if (resp.success) {
        loadFlows();
      }
    } catch (err) {
      setError(err.message || '撤回失败');
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>
        我发起的审批
      </Typography>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="全部" value="all" />
        <Tab label="审批中" value="pending" />
        <Tab label="已通过" value="approved" />
        <Tab label="已拒绝" value="rejected" />
      </Tabs>

      {loading ? (
        <Typography color="text.secondary">加载中...</Typography>
      ) : flows.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">暂无记录</Typography>
        </Card>
      ) : (
        <Stack spacing={2}>
          {flows.map((flow) => (
            <Card key={flow.instanceId}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {flow.objectTitle || flow.objectNo || BUSINESS_TYPE_LABEL[flow.businessType] || flow.businessType}
                    </Typography>
                    <Stack direction="row" spacing={1} mt={1} alignItems="center">
                      <Chip label={BUSINESS_TYPE_LABEL[flow.businessType] || flow.businessType} size="small" color="primary" variant="outlined" />
                      <Chip label={STATUS_LABEL[flow.status] || flow.status} size="small" color={STATUS_COLOR[flow.status]} />
                      <Typography variant="caption" color="text.secondary">
                        模板: {flow.templateName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        待审: {flow.pendingTasks}/{flow.totalTasks}
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" mt={1}>
                      发起时间: {new Date(flow.startAt).toLocaleString()}
                      {flow.finishedAt && ` | 完成时间: ${new Date(flow.finishedAt).toLocaleString()}`}
                    </Typography>
                    {flow.reason && (
                      <Typography variant="body2" color="text.secondary" mt={0.5}>
                        结果: {flow.reason}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
