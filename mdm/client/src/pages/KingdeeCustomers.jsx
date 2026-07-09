import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  TextField,
  TablePagination,
} from '@mui/material';
import api from '../api';

export default function KingdeeCustomers() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [keyword, setKeyword] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/kingdee/data', {
        params: { entityType: 'customer', page: page + 1, pageSize: rowsPerPage, keyword },
      });
      setRecords(res.data.data.records || []);
      setTotal(res.data.data.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, keyword]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && records.length === 0) {
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        金蝶客户数据
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        size="small"
        placeholder="搜索编码或名称..."
        value={keyword}
        onChange={(e) => {
          setKeyword(e.target.value);
          setPage(0);
        }}
        sx={{ mb: 2, width: 300 }}
      />

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>编码</TableCell>
              <TableCell>名称</TableCell>
              <TableCell>简称</TableCell>
              <TableCell>结算币别</TableCell>
              <TableCell>最后同步</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((r) => {
              const extra = r.extra || {};
              return (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {r.code}
                    </Typography>
                  </TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{extra.shortName || '-'}</TableCell>
                  <TableCell>{extra.currency || '-'}</TableCell>
                  <TableCell>{new Date(r.lastSyncAt).toLocaleString('zh-CN')}</TableCell>
                </TableRow>
              );
            })}
            {records.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  暂无客户数据，请先从金蝶拉取
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(e, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        labelRowsPerPage="每页"
      />
    </Box>
  );
}
