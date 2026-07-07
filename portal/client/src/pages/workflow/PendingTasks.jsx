// 待我审批页面

import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Stack, Tooltip, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
} from '@mui/material';
import { CheckCircle, Cancel, SwapHoriz, Visibility, Schedule } from '@mui/icons-material';
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

const STATUS_COLOR = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  withdrawn: 'default',
  cancelled: 'default',
};

export default function PendingTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [approveDialog, setApproveDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [delegateDialog, setDelegateDialog] = useState(false);
  const [comment, setComment] = useState('');
  const [delegateInfo, setDelegateInfo] = useState({ id: '', name: '', email: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const resp = await wfApi.get('/tasks/pending');
      if (resp.success) {
        setTasks(resp.data || []);
      }
    } catch (err) {
      setError('加载待审任务失败');
    }
    setLoading(false);
  };

  const handleApprove = async () => {
    try {
      const resp = await wfApi.post(`/tasks/${selectedTask.taskId}/approve`, { comment });
      if (resp.success) {
        setSuccess('审批通过成功');
        setApproveDialog(false);
        setComment('');
        loadTasks();
      }
    } catch (err) {
      setError(err.message || '审批通过失败');
    }
  };

  const handleReject = async () => {
    try {
      const resp = await wfApi.post(`/tasks/${selectedTask.taskId}/reject`, { comment });
      if (resp.success) {
        setSuccess('审批拒绝成功');
        setRejectDialog(false);
        setComment('');
        loadTasks();
      }
    } catch (err) {
      setError(err.message || '审批拒绝失败');
    }
  };

  const handleDelegate = async () => {
    try {
      const resp = await wfApi.post(`/tasks/${selectedTask.taskId}/delegate`, {
        delegateToId: delegateInfo.id,
        delegateToName: delegateInfo.name,
        delegateToEmail: delegateInfo.email,
        comment,
      });
      if (resp.success) {
        setSuccess(`已转审给 ${delegateInfo.name}`);
        setDelegateDialog(false);
        setComment('');
        loadTasks();
      }
    } catch (err) {
      setError(err.message || '转审失败');
    }
  };

  const [detailDialog, setDetailDialog] = useState(false);

  const openTaskDetail = (task) => {
    setSelectedTask(task);
    setDetailDialog(true);
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>
        待我审批
      </Typography>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}

      {loading ? (
        <Typography color="text.secondary">加载中...</Typography>
      ) : tasks.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">暂无待审任务</Typography>
        </Card>
      ) : (
        <Stack spacing={2}>
          {tasks.map((task) => (
            <Card key={task.taskId} sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }} onClick={() => openTaskDetail(task)}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {task.objectTitle || task.objectNo || BUSINESS_TYPE_LABEL[task.businessType] || task.businessType}
                  </Typography>
                  <Stack direction="row" spacing={1} mt={1} alignItems="center">
                    <Chip label={BUSINESS_TYPE_LABEL[task.businessType] || task.businessType} size="small" color="primary" variant="outlined" />
                    <Chip label={`节点: ${task.nodeName}`} size="small" />
                    <Typography variant="caption" color="text.secondary">
                      提交人: {task.submitterName}
                    </Typography>
                    {task.dueAt && (
                      <Tooltip title="截止时间">
                        <Chip icon={<Schedule />} label={new Date(task.dueAt).toLocaleDateString()} size="small" color="warning" variant="outlined" />
                      </Tooltip>
                    )}
                  </Stack>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Tooltip title="通过">
                    <IconButton color="success" onClick={(e) => { e.stopPropagation(); setSelectedTask(task); setApproveDialog(true); }}>
                      <CheckCircle />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="拒绝">
                    <IconButton color="error" onClick={(e) => { e.stopPropagation(); setSelectedTask(task); setRejectDialog(true); }}>
                      <Cancel />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="转审">
                    <IconButton color="primary" onClick={(e) => { e.stopPropagation(); setSelectedTask(task); setDelegateDialog(true); }}>
                      <SwapHoriz />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="查看详情">
                    <IconButton onClick={(e) => { e.stopPropagation(); openTaskDetail(task); }}>
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* 审批通过对话框 */}
      <Dialog open={approveDialog} onClose={() => setApproveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>审批通过</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            确认通过 "{selectedTask?.objectTitle || selectedTask?.objectNo}" 的审批？
          </Typography>
          <TextField
            label="审批意见（可选）"
            fullWidth
            multiline
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialog(false)}>取消</Button>
          <Button variant="contained" color="success" onClick={handleApprove}>确认通过</Button>
        </DialogActions>
      </Dialog>

      {/* 审批拒绝对话框 */}
      <Dialog open={rejectDialog} onClose={() => setRejectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>审批拒绝</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            拒绝后流程将终止，发起人需重新提交。请谨慎操作。
          </Alert>
          <Typography variant="body2" color="text.secondary" mb={2}>
            拒绝 "{selectedTask?.objectTitle || selectedTask?.objectNo}"
          </Typography>
          <TextField
            label="拒绝原因（必填）"
            fullWidth
            multiline
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog(false)}>取消</Button>
          <Button variant="contained" color="error" onClick={handleReject} disabled={!comment}>确认拒绝</Button>
        </DialogActions>
      </Dialog>

      {/* 转审对话框 */}
      <Dialog open={delegateDialog} onClose={() => setDelegateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>转审给他人</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            将 "{selectedTask?.objectTitle}" 的审批任务转给其他人处理
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="转审人 globalId"
              fullWidth
              value={delegateInfo.id}
              onChange={(e) => setDelegateInfo({ ...delegateInfo, id: e.target.value })}
              required
            />
            <TextField
              label="转审人姓名"
              fullWidth
              value={delegateInfo.name}
              onChange={(e) => setDelegateInfo({ ...delegateInfo, name: e.target.value })}
              required
            />
            <TextField
              label="转审人邮箱"
              fullWidth
              value={delegateInfo.email}
              onChange={(e) => setDelegateInfo({ ...delegateInfo, email: e.target.value })}
            />
            <TextField
              label="转审说明"
              fullWidth
              multiline
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDelegateDialog(false)}>取消</Button>
          <Button variant="contained" onClick={handleDelegate} disabled={!delegateInfo.id || !delegateInfo.name}>确认转审</Button>
        </DialogActions>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>审批详情</DialogTitle>
        <DialogContent>
          {selectedTask?.objectData && (
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                {selectedTask.objectData.orderNo && (
                  <Chip label={`订单编号: ${selectedTask.objectData.orderNo}`} size="small" />
                )}
                {selectedTask.objectData.customerName && (
                  <Chip label={`客户: ${selectedTask.objectData.customerName}`} size="small" color="primary" variant="outlined" />
                )}
                {selectedTask.objectData.salesRepName && (
                  <Chip label={`业务员: ${selectedTask.objectData.salesRepName}`} size="small" />
                )}
                {selectedTask.objectData.orderDate && (
                  <Chip label={`订单日期: ${new Date(selectedTask.objectData.orderDate).toLocaleDateString()}`} size="small" />
                )}
                {selectedTask.objectData.totalAmount !== undefined && (
                  <Chip label={`总金额: ¥${Number(selectedTask.objectData.totalAmount).toFixed(2)}`} size="small" color="success" />
                )}
                {selectedTask.objectData.marginRate !== undefined && (
                  <Chip label={`综合毛利率: ${selectedTask.objectData.marginRate}%`} size="small" color={selectedTask.objectData.marginRate < 20 ? 'warning' : 'success'} />
                )}
                {selectedTask.objectData.minMarginRate !== undefined && (
                  <Chip label={`最低毛利率: ${selectedTask.objectData.minMarginRate}%`} size="small" color={selectedTask.objectData.minMarginRate < 20 ? 'error' : 'success'} />
                )}
              </Stack>

              {selectedTask.objectData.items && selectedTask.objectData.items.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>订单明细</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                          <TableCell>物料</TableCell>
                          <TableCell>等级</TableCell>
                          <TableCell align="right">数量</TableCell>
                          <TableCell align="right">成本价</TableCell>
                          <TableCell align="right">销售单价</TableCell>
                          <TableCell align="right">行金额</TableCell>
                          <TableCell align="right">毛利率</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedTask.objectData.items.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{item.materialName || '-'}</TableCell>
                            <TableCell>{item.gradeName || '-'}</TableCell>
                            <TableCell align="right">{item.qty} {item.salesUnit}</TableCell>
                            <TableCell align="right">¥{Number(item.costPrice).toFixed(2)} /{item.salesUnit}</TableCell>
                            <TableCell align="right">¥{Number(item.unitPrice).toFixed(2)} /{item.salesUnit}</TableCell>
                            <TableCell align="right">¥{Number(item.lineTotal).toFixed(2)}</TableCell>
                            <TableCell align="right" sx={{ color: item.rowMargin < 20 ? 'error.main' : 'success.main', fontWeight: 600 }}>
                              {item.rowMargin}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
