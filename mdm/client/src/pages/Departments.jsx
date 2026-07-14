import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, CircularProgress, Alert, TextField, InputAdornment, IconButton,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import api from '../api';

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const fetchDepartments = useCallback(async () => {
    try {
      const params = {};
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await api.get('/master-data/departments', { params });
      setDepartments(res.data);
    } catch (err) {
      setError(err.response?.data?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={2}>部门主数据</Typography>
      <Typography variant="body2" color="text.secondary" mb={1}>共 {departments.length} 个部门</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TextField
        size="small"
        placeholder="搜索部门名称..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2, minWidth: 260 }}
        InputProps={{
          endAdornment: search ? (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => setSearch('')}>
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : null,
        }}
      />

      {loading && <Box display="flex" justifyContent="center" mt={2}><CircularProgress size={24} /></Box>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>部门名称</TableCell>
              <TableCell>HRMS ID</TableCell>
              <TableCell>上级部门</TableCell>
              <TableCell>排序</TableCell>
              <TableCell>状态</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {departments.map((d) => (
              <TableRow key={d.id} hover>
                <TableCell>{d.name}</TableCell>
                <TableCell>{d.hrmsId || '-'}</TableCell>
                <TableCell>{d.parentId || '-'}</TableCell>
                <TableCell>{d.sortOrder}</TableCell>
                <TableCell>
                  <Chip label={d.status === 'ACTIVE' ? '在用' : '停用'} color={d.status === 'ACTIVE' ? 'success' : 'default'} size="small" />
                </TableCell>
              </TableRow>
            ))}
            {departments.length === 0 && !loading && (
              <TableRow><TableCell colSpan={5} align="center">暂无部门数据</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
