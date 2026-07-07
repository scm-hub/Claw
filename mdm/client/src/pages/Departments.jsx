import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, CircularProgress, Alert,
} from '@mui/material';
import api from '../api';

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await api.get('/master-data/departments');
      setDepartments(res.data);
    } catch (err) {
      setError(err.response?.data?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  if (loading) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>部门主数据</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>部门名称</TableCell>
              <TableCell>HRMS ID</TableCell>
              <TableCell>上级部门</TableCell>
              <TableCell>排序</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>最后同步时间</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {departments.map((dept) => (
              <TableRow key={dept.id} hover>
                <TableCell><Typography variant="body2" fontWeight="bold">{dept.name}</Typography></TableCell>
                <TableCell><Typography variant="caption" color="text.secondary">{dept.hrmsId.substring(0, 16)}...</Typography></TableCell>
                <TableCell>{dept.parentId ? dept.parentId.substring(0, 16) + '...' : '— (顶级)'}</TableCell>
                <TableCell>{dept.sortOrder}</TableCell>
                <TableCell><Chip size="small" label={dept.status} color={dept.status === 'ACTIVE' ? 'success' : 'default'} /></TableCell>
                <TableCell>{new Date(dept.lastSyncAt).toLocaleString('zh-CN')}</TableCell>
              </TableRow>
            ))}
            {departments.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center">暂无部门数据，请先从 HRMS 同步</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
