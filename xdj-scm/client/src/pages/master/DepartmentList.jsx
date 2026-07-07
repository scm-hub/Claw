import { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, InputAdornment, IconButton,
  Chip, Stack, Grid, FormControl, Select, MenuItem, Button, Alert,
} from '@mui/material';
import { Search, Sync, RestartAlt, CorporateFare, FilterList } from '@mui/icons-material';
import api from '../../lib/api';

const STATUS_MAP = {
  ACTIVE: { label: '启用', color: 'success' },
  INACTIVE: { label: '停用', color: 'default' },
};

export default function DepartmentList() {
  const [allList, setAllList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');

  const loadList = async () => {
    try {
      setLoading(true);
      const res = await api.get('/master/departments');
      setAllList(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadList(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await api.post('/master/sync-from-hrms');
      setSyncMsg(res.message || '同步完成');
      loadList();
    } catch (err) {
      setSyncMsg(err?.data?.message || '同步失败');
    } finally {
      setSyncing(false);
    }
  };

  const filteredList = allList.filter(item => {
    if (keyword) {
      const kw = keyword.toLowerCase();
      if (!(item.name?.toLowerCase().includes(kw) || item.code?.toLowerCase().includes(kw))) return false;
    }
    if (status && item.status !== status) return false;
    return true;
  });

  const stats = {
    total: allList.length,
    active: allList.filter(d => d.status === 'ACTIVE').length,
    inactive: allList.filter(d => d.status === 'INACTIVE').length,
  };

  const hasFilters = keyword || status;
  const handleReset = () => { setKeyword(''); setStatus(''); };

  return (
    <Box>
      {/* ===== 标题栏 ===== */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>部门管理</Typography>
        <Button
          variant="outlined" size="small" startIcon={<Sync />}
          onClick={handleSync} disabled={syncing}
        >
          {syncing ? '同步中...' : '从综合平台同步'}
        </Button>
      </Box>

      {/* 只读提示 */}
      <Alert severity="info" sx={{ mb: 2 }}>
        部门数据来源于综合平台（HRMS），仅支持查看，不支持在 SCM 中新增、编辑或删除。如需修改请前往 HRMS 操作后点击"从综合平台同步"。
      </Alert>

      {syncMsg && (
        <Alert severity={syncMsg.includes('失败') ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setSyncMsg('')}>
          {syncMsg}
        </Alert>
      )}

      {/* ===== 统计概览 ===== */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={4} sm={4}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <CorporateFare sx={{ color: 'primary.main', fontSize: 28 }} />
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1 }}>{stats.total}</Typography>
                  <Typography variant="caption" color="text.secondary">部门总数</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4} sm={4}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'success.light', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography sx={{ color: 'success.dark', fontSize: 14, fontWeight: 700 }}>启</Typography>
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1, color: 'success.main' }}>{stats.active}</Typography>
                  <Typography variant="caption" color="text.secondary">启用</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4} sm={4}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography sx={{ color: 'text.disabled', fontSize: 14, fontWeight: 700 }}>停</Typography>
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1, color: 'text.secondary' }}>{stats.inactive}</Typography>
                  <Typography variant="caption" color="text.secondary">停用</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ===== 查询条件 ===== */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: '16px !important' }}>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              size="small" label="搜索（名称 / 编码）"
              value={keyword} onChange={(e) => setKeyword(e.target.value)}
              sx={{ minWidth: 200, flexGrow: 1, maxWidth: 280 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small"><Search /></IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ width: 110 }}>
              <Select value={status} onChange={(e) => setStatus(e.target.value)} displayEmpty>
                <MenuItem value="">全部状态</MenuItem>
                <MenuItem value="ACTIVE">启用</MenuItem>
                <MenuItem value="INACTIVE">停用</MenuItem>
              </Select>
            </FormControl>
            <IconButton size="small" onClick={handleReset} disabled={!hasFilters} title="重置">
              <RestartAlt />
            </IconButton>
            <Box sx={{ flex: 1 }} />
            <Chip
              icon={<FilterList />}
              label={hasFilters ? `已筛选 ${filteredList.length} 条` : `共 ${stats.total} 条`}
              size="small"
              color={hasFilters ? 'primary' : 'default'}
              variant={hasFilters ? 'filled' : 'outlined'}
            />
          </Stack>
        </CardContent>
      </Card>

      {/* ===== 表格 ===== */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 600 }}>编码</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>名称</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>上级部门</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>负责人</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">排序</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">员工数</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="center">状态</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} align="center"><Typography color="text.secondary" sx={{ py: 3 }}>加载中...</Typography></TableCell></TableRow>
            ) : filteredList.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center"><Typography color="text.secondary" sx={{ py: 3 }}>暂无数据</Typography></TableCell></TableRow>
            ) : (
              filteredList.map((item) => {
                const st = STATUS_MAP[item.status] || { label: item.status, color: 'default' };
                return (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.code || '-'}</Typography>
                    </TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.parent?.name || '-'}</TableCell>
                    <TableCell>{item.manager?.name || '-'}</TableCell>
                    <TableCell align="center">{item.sortOrder}</TableCell>
                    <TableCell align="center">{item._count?.employees || 0}</TableCell>
                    <TableCell align="center">
                      <Chip size="small" label={st.label} color={st.color} variant={item.status === 'ACTIVE' ? 'filled' : 'outlined'} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
