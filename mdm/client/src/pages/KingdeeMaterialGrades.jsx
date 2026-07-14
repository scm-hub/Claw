import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, CircularProgress, Alert, TextField, TablePagination,
  InputAdornment, IconButton, Stack,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import api from '../api';

export default function KingdeeMaterialGrades() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedKeyword(keyword.trim()), 300);
    return () => clearTimeout(debounceRef.current);
  }, [keyword]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/kingdee/data', {
        params: { entityType: 'materialGrade', page: page + 1, pageSize: rowsPerPage, keyword: debouncedKeyword },
      });
      setRecords(res.data?.records || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || '加载失败');
    } finally { setLoading(false); }
  }, [page, rowsPerPage, debouncedKeyword]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={2}>金蝶物料等级</Typography>
      <Typography variant="body2" color="text.secondary" mb={1}>共 {total} 种等级（来源于金蝶辅助资料 BOS_ASSISTANTDATA_DETAIL，FID='DJ'）</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" useFlexGap>
        <TextField size="small" placeholder="搜索编码或名称..." value={keyword}
          onChange={(e) => { setKeyword(e.target.value); setPage(0); }} sx={{ minWidth: 260 }}
          InputProps={{ endAdornment: keyword ? <InputAdornment position="end"><IconButton size="small" onClick={() => setKeyword('')}><ClearIcon fontSize="small"/></IconButton></InputAdornment> : null }}
        />
      </Stack>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead><TableRow>
            <TableCell>等级编码</TableCell><TableCell>等级名称</TableCell><TableCell>最后同步</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {records.map(r => (
              <TableRow key={r.id} hover>
                <TableCell><Typography variant="body2" fontWeight="bold">{r.code}</Typography></TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.lastSyncAt ? new Date(r.lastSyncAt).toLocaleString('zh-CN') : '-'}</TableCell>
              </TableRow>
            ))}
            {records.length === 0 && !loading && (
              <TableRow><TableCell colSpan={3} align="center">暂无等级数据，请先从金蝶拉取</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack direction="row" justifyContent="center" mt={1}>
        <TablePagination
          component="div" count={total} page={page} onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[20, 50, 100]} labelRowsPerPage="每页"
        />
      </Stack>
    </Box>
  );
}
