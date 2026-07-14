import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, CircularProgress, Alert, TextField, TablePagination,
  InputAdornment, IconButton, FormControl, InputLabel, Select, MenuItem, Stack, Chip,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import api from '../api';

export default function KingdeeReceiveSendTypes() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgs, setOrgs] = useState([]);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedKeyword(keyword.trim()), 300);
    return () => clearTimeout(debounceRef.current);
  }, [keyword]);

  useEffect(() => {
    api.get('/kingdee/organizations', { params: { entityType: 'receiveSendType' } })
      .then(res => setOrgs(res.data || [])).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/kingdee/data', {
        params: { entityType: 'receiveSendType', page: page + 1, pageSize: rowsPerPage, keyword: debouncedKeyword, orgName },
      });
      setRecords(res.data?.records || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || '加载失败');
    } finally { setLoading(false); }
  }, [page, rowsPerPage, debouncedKeyword, orgName]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={2}>金蝶收发类别数据</Typography>
      <Typography variant="body2" color="text.secondary" mb={1}>共 {total} 条（含所有组织）</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" useFlexGap>
        <TextField size="small" placeholder="搜索编码或名称..." value={keyword}
          onChange={(e) => { setKeyword(e.target.value); setPage(0); }} sx={{ minWidth: 260 }}
          InputProps={{ endAdornment: keyword ? <InputAdornment position="end"><IconButton size="small" onClick={() => setKeyword('')}><ClearIcon fontSize="small"/></IconButton></InputAdornment> : null }}
        />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>所属组织</InputLabel>
          <Select value={orgName} label="所属组织" onChange={(e) => { setOrgName(e.target.value); setPage(0); }}>
            <MenuItem value="">全部</MenuItem>
            {orgs.map(org => <MenuItem key={org} value={org}>{org}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead><TableRow>
            <TableCell>编码</TableCell>
            <TableCell>名称</TableCell>
            <TableCell>类型</TableCell>
            <TableCell>所属组织</TableCell>
            <TableCell>最后同步</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {records.map(r => {
              const extra = r.extra || {};
              const isReceive = extra.ftypeName === '收';
              return (<TableRow key={r.id} hover>
                <TableCell><Typography variant="body2" fontWeight="bold">{r.code}</Typography></TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell>
                  <Chip
                    label={extra.ftypeName || '-'}
                    size="small"
                    color={isReceive ? 'success' : 'primary'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell><Typography variant="body2" color="text.secondary">{extra.useOrgName || '-'}</Typography></TableCell>
                <TableCell>{r.lastSyncAt ? new Date(r.lastSyncAt).toLocaleString('zh-CN') : '-'}</TableCell>
              </TableRow>);
            })}
            {records.length === 0 && !loading && (
              <TableRow><TableCell colSpan={5} align="center">暂无收发类别数据，请先从金蝶拉取</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination component="div" count={total} page={page} onPageChange={(e, p) => setPage(p)}
        rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        labelRowsPerPage="每页" />
      {loading && <Box display="flex" justifyContent="center" mt={2}><CircularProgress size={24} /></Box>}
    </Box>
  );
}
