import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, CircularProgress, Alert, TextField, TablePagination,
  InputAdornment, IconButton, FormControl, InputLabel, Select, MenuItem, Stack,
  Chip, Accordion, AccordionSummary, AccordionDetails, Button,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Link } from 'react-router-dom';
import api from '../api';

export default function KingdeeMaterials() {
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
  const [grades, setGrades] = useState([]);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedKeyword(keyword.trim()), 300);
    return () => clearTimeout(debounceRef.current);
  }, [keyword]);

  useEffect(() => {
    api.get('/kingdee/organizations', { params: { entityType: 'material' } })
      .then(res => setOrgs(res.data || [])).catch(() => {});
    // 拉取物料等级
    api.get('/kingdee/data', { params: { entityType: 'materialGrade', page: 1, pageSize: 200 } })
      .then(res => setGrades(res.data?.records || [])).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/kingdee/data', {
        params: { entityType: 'material', page: page + 1, pageSize: rowsPerPage, keyword: debouncedKeyword, orgName },
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
      <Typography variant="h5" fontWeight="bold" mb={2}>金蝶物料数据</Typography>
      <Typography variant="body2" color="text.secondary" mb={1}>共 {total} 条物料（仅 0502 开头）</Typography>
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

      {/* 物料等级 */}
      {grades.length > 0 && (
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight="bold">物料等级（{grades.length} 种）—
              <Button size="small" component={Link} to="/kingdee-material-grades" sx={{ ml: 1 }}>查看全部</Button>
            </Typography>
          </AccordionSummary>
        </Accordion>
      )}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead><TableRow>
            <TableCell>编码</TableCell><TableCell>名称</TableCell><TableCell>规格型号</TableCell>
            <TableCell>基本单位</TableCell><TableCell>采购单位</TableCell><TableCell>销售单位</TableCell>
            <TableCell>物料分组</TableCell><TableCell>等级</TableCell>
            <TableCell>所属组织</TableCell><TableCell>最后同步</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {records.map(r => {
              const extra = r.extra || {};
              return (<TableRow key={r.id} hover>
                <TableCell><Typography variant="body2" fontWeight="bold">{r.code}</Typography></TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell>{extra.spec || '-'}</TableCell>
                <TableCell>{extra.baseUnitName || extra.baseUnit || '-'}</TableCell>
                <TableCell>{extra.purchaseUnitName || extra.purchaseUnit || '-'}</TableCell>
                <TableCell>{extra.salesUnitName || extra.salesUnit || '-'}</TableCell>
                <TableCell>{extra.materialGroupName || extra.materialGroup || '-'}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 280 }}>
                    {extra.grades && extra.grades.length > 0
                      ? extra.grades.map((g, idx) => (
                          <Chip key={idx} label={g.FName || g.name} size="small" color="primary" variant="outlined" />
                        ))
                      : <Typography variant="caption" color="text.disabled">未设置</Typography>}
                  </Box>
                </TableCell>
                <TableCell>{extra.useOrgName || '-'}</TableCell>
                <TableCell>{r.lastSyncAt ? new Date(r.lastSyncAt).toLocaleString('zh-CN') : '-'}</TableCell>
              </TableRow>);
            })}
            {records.length === 0 && !loading && (
              <TableRow><TableCell colSpan={10} align="center">暂无物料数据，请先从金蝶拉取</TableCell></TableRow>
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
