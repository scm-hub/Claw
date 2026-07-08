import React, { useState, useEffect } from 'react';
import { Box, Typography, List, ListItem, ListItemText, Chip, Button, Dialog, DialogTitle, DialogContent, TextField, MenuItem, CircularProgress } from '@mui/material';
import dayjs from 'dayjs';
import api from './api';

const LEAVE_TYPES = [
  { value: 'ANNUAL', label: '年假' },
  { value: 'SICK', label: '病假' },
  { value: 'PERSONAL', label: '事假' },
  { value: 'MARRIAGE', label: '婚假' },
  { value: 'MATERNITY', label: '产假' },
  { value: 'BEREAVEMENT', label: '丧假' },
];

export default function Leaves() {
  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ type: 'ANNUAL', startDate: '', endDate: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/leaves/').catch(() => null),
      api.get('/leaves/balance').catch(() => null),
    ]).then(([leaveRes, balanceRes]) => {
      if (leaveRes?.success) setLeaves(leaveRes.data?.list || leaveRes.data || []);
      if (balanceRes?.success) setBalance(balanceRes.data);
      setLoading(false);
    });
  }, []);

  const handleApply = async () => {
    if (!form.startDate || !form.endDate) return;
    setSubmitting(true);
    try {
      const diff = dayjs(form.endDate).diff(dayjs(form.startDate), 'day') + 1;
      await api.post('/leaves/', {
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        duration: diff,
        durationUnit: 'DAY',
        reason: form.reason,
      });
      setDialogOpen(false);
      // 刷新列表
      const res = await api.get('/leaves/');
      if (res.success) setLeaves(res.data?.list || res.data || []);
    } catch (e) {
      alert(e.message);
    }
    setSubmitting(false);
  };

  const statusColor = (s) => s === 'APPROVED' ? 'success' : s === 'REJECTED' ? 'error' : 'warning';
  const statusLabel = (s) => s === 'APPROVED' ? '已批准' : s === 'REJECTED' ? '已拒绝' : '待审批';

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 2, pb: 8 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">请假管理</Typography>
        <Button variant="contained" size="small" onClick={() => setDialogOpen(true)}>申请请假</Button>
      </Box>

      {balance && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          剩余年假: {balance.annual || balance.total || '--'} 天
        </Typography>
      )}

      {leaves.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>暂无请假记录</Typography>
      ) : (
        <List>
          {leaves.map((l) => (
            <ListItem key={l.id} divider secondaryAction={
              <Chip size="small" label={statusLabel(l.status)} color={statusColor(l.status)} />
            }>
              <ListItemText
                primary={`${LEAVE_TYPES.find(t => t.value === l.type)?.label || l.type} · ${l.duration}天`}
                secondary={`${dayjs(l.startDate).format('M/D')} - ${dayjs(l.endDate).format('M/D')} · ${l.reason || ''}`}
              />
            </ListItem>
          ))}
        </List>
      )}

      {/* 申请弹窗 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth>
        <DialogTitle>申请请假</DialogTitle>
        <DialogContent>
          <TextField select fullWidth label="类型" value={form.type} onChange={e => setForm({...form, type: e.target.value})} sx={{ mt: 1, mb: 2 }}>
            {LEAVE_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
          </TextField>
          <TextField fullWidth type="date" label="开始日期" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} sx={{ mb: 2 }} InputLabelProps={{ shrink: true }} />
          <TextField fullWidth type="date" label="结束日期" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} sx={{ mb: 2 }} InputLabelProps={{ shrink: true }} />
          <TextField fullWidth label="原因" multiline rows={2} value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} sx={{ mb: 2 }} />
          <Button fullWidth variant="contained" onClick={handleApply} disabled={submitting}>
            {submitting ? <CircularProgress size={24} /> : '提交申请'}
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
