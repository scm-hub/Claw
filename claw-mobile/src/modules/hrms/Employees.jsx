import React, { useState, useEffect } from 'react';
import { Box, Typography, List, ListItem, ListItemAvatar, ListItemText, Avatar, TextField, CircularProgress } from '@mui/material';
import api from './api';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/employees/?page=1&pageSize=50')
      .then((res) => {
        if (res.success) setEmployees(res.data?.list || res.data?.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = employees.filter((e) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (e.name || '').includes(s) || (e.employeeNo || '').includes(s) || (e.departmentName || '').includes(s);
  });

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 2, pb: 8 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>员工查询</Typography>
      <TextField fullWidth size="small" placeholder="搜索姓名/工号/部门" value={search} onChange={e => setSearch(e.target.value)} sx={{ mb: 2 }} />
      <List>
        {filtered.map((e) => (
          <ListItem key={e.id} divider>
            <ListItemAvatar>
              <Avatar>{(e.name || '?')[0]}</Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={`${e.name || ''} · ${e.employeeNo || ''}`}
              secondary={`${e.departmentName || ''} · ${e.positionTitle || ''} · ${e.phone || ''}`}
            />
          </ListItem>
        ))}
      </List>
      {filtered.length === 0 && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>未找到员工</Typography>
      )}
    </Box>
  );
}
