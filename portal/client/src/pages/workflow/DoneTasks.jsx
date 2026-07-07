// 已处理的审批任务

import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, Stack, Alert,
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

const ACTION_LABEL = {
  pass: '通过',
  reject: '拒绝',
  delegate: '转审',
};

const ACTION_COLOR = {
  pass: 'success',
  reject: 'error',
  delegate: 'info',
};

export default function DoneTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const resp = await wfApi.get('/tasks/done');
      if (resp.success) {
        setTasks(resp.data || []);
      }
    } catch (err) {
      setError('加载已审任务失败');
    }
    setLoading(false);
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>
        已处理的审批
      </Typography>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Typography color="text.secondary">加载中...</Typography>
      ) : tasks.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">暂无已处理记录</Typography>
        </Card>
      ) : (
        <Stack spacing={2}>
          {tasks.map((task) => (
            <Card key={task.taskId}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600}>
                  {task.objectTitle || task.objectNo || BUSINESS_TYPE_LABEL[task.businessType] || task.businessType}
                </Typography>
                <Stack direction="row" spacing={1} mt={1} alignItems="center">
                  <Chip label={BUSINESS_TYPE_LABEL[task.businessType] || task.businessType} size="small" color="primary" variant="outlined" />
                  <Chip label={ACTION_LABEL[task.action] || task.action} size="small" color={ACTION_COLOR[task.action]} />
                  <Typography variant="caption" color="text.secondary">
                    节点: {task.nodeName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    处理时间: {task.actionAt ? new Date(task.actionAt).toLocaleString() : '-'}
                  </Typography>
                </Stack>
                {task.comment && (
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    意见: {task.comment}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
