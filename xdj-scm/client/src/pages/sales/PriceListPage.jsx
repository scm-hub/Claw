import { useState, useEffect, useCallback, Fragment } from 'react';
import {
  Box, Typography, Button, TextField, Grid, Paper, Stack, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  InputAdornment, TablePagination, Tooltip, MenuItem, Select, InputLabel, FormControl,
  CircularProgress,
} from '@mui/material';
import { Add, Edit, Delete, Search, Refresh, KeyboardArrowDown, KeyboardArrowUp, ToggleOn, ToggleOff } from '@mui/icons-material';
import api from '../../lib/api';

const FEE_TYPE_LABELS = { MATERIAL: '材料费用', LABOR: '人工费用', OTHER: '其他' };
const FEE_TYPE_COLORS = { MATERIAL: 'primary', LABOR: 'secondary', OTHER: 'default' };

// ============================================================
// Tab 1: 成本价计算历史
// ============================================================
function CostPriceHistoryTab({ materials }) {
  const [history, setHistory] = useState({ list: [], total: 0, page: 0, rowsPerPage: 20, materialId: '', startDate: '', endDate: '', loading: false, recalculating: false });
  const [expandedRow, setExpandedRow] = useState(null);
  const [detailCache, setDetailCache] = useState({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistory(prev => ({ ...prev, loading: true }));
    setExpandedRow(null);
    try {
      const params = new URLSearchParams();
      params.set('page', history.page + 1);
      params.set('pageSize', history.rowsPerPage);
      if (history.materialId) params.set('materialId', history.materialId);
      if (history.startDate) params.set('startDate', history.startDate);
      if (history.endDate) params.set('endDate', history.endDate);
      // 默认只展示最新批次（latestOnly=true），查看全部历史时传 latestOnly=false
      if (showAllHistory) params.set('latestOnly', 'false');
      else params.set('latestOnly', 'true');
      const res = await api.get(`/wms/cost-price/history?${params}`);
      setHistory(prev => ({ ...prev, list: res.data?.list || [], total: res.data?.total || 0, loading: false }));
    } catch (e) {
      console.error(e);
      setHistory(prev => ({ ...prev, loading: false }));
    }
  }, [history.page, history.rowsPerPage, history.materialId, history.startDate, history.endDate, showAllHistory]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleRecalculate = async () => {
    setHistory(prev => ({ ...prev, recalculating: true }));
    try {
      const res = await api.post('/wms/cost-price/recalculate');
      alert(res.data?.message || '计算完成');
      setDetailCache({}); // 重新计算后清除明细缓存
      setExpandedRow(null);
      loadHistory();
    } catch (e) { alert(e.response?.data?.message || e.message); }
    setHistory(prev => ({ ...prev, recalculating: false }));
  };

  const handleRowExpand = async (row) => {
    if (expandedRow === row.id) { setExpandedRow(null); return; }
    setExpandedRow(row.id);
    // 如果没有缓存，或者缓存是旧格式（没有 stockTakeLoss 字段），重新加载
    const cached = detailCache[row.id];
    if (!cached || (cached.summary && !('stockTakeLoss' in cached))) {
      setDetailLoading(true);
      try {
        const res = await api.get(`/wms/cost-price/${row.id}/movements`);
        setDetailCache(prev => ({ ...prev, [row.id]: res.data || [] }));
      } catch (e) {
        console.error('[成本价明细] 加载失败:', e.message || e);
        setDetailCache(prev => ({ ...prev, [row.id]: [], _error: e.message || '加载失败' }));
      }
      setDetailLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', gap: 2.5, alignItems: 'center', flexWrap: 'wrap', minHeight: 55 }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>筛选物料</InputLabel>
          <Select label="筛选物料" value={history.materialId}
            onChange={e => setHistory(prev => ({ ...prev, materialId: e.target.value, page: 0 }))}>
            <MenuItem value="">全部物料</MenuItem>
            {materials.map(m => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>展示范围</InputLabel>
          <Select label="展示范围" value={showAllHistory ? 'all' : 'latest'}
            onChange={e => { setShowAllHistory(e.target.value === 'all'); setHistory(prev => ({ ...prev, page: 0 })); }}>
            <MenuItem value="latest">仅最新计算</MenuItem>
            <MenuItem value="all">全部历史</MenuItem>
          </Select>
        </FormControl>
        {showAllHistory && (
          <>
            <TextField size="small" type="date" label="开始日期" value={history.startDate}
              onChange={e => setHistory(prev => ({ ...prev, startDate: e.target.value, page: 0 }))}
              InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
            <TextField size="small" type="date" label="结束日期" value={history.endDate}
              onChange={e => setHistory(prev => ({ ...prev, endDate: e.target.value, page: 0 }))}
              InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
          </>
        )}
        <Button variant="contained" size="small" onClick={loadHistory}>查询</Button>
        <Button variant="outlined" size="small" startIcon={<Refresh />}
          disabled={history.recalculating} onClick={handleRecalculate}>
          {history.recalculating ? '计算中...' : '手动计算'}
        </Button>
        <Typography variant="caption" sx={{ ml: 1, color: '#d32f2f', lineHeight: 1.8 }}>
          每天0点和12点自动计算<br />手动计算仅计算新增物料
        </Typography>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small" sx={{ tableLayout: 'auto', whiteSpace: 'nowrap' }}>
          <TableHead>
            <TableRow sx={{ '& .MuiTableCell-root': { fontSize: 13, fontWeight: 700, px: 1.5 } }}>
              <TableCell padding="checkbox" sx={{ width: 36 }} />
              <TableCell sx={{ minWidth: 120 }}>物料名称</TableCell>
              <TableCell sx={{ minWidth: 70 }}>等级</TableCell>
              <TableCell align="right" sx={{ minWidth: 80 }}>期初数量</TableCell>
              <TableCell align="right" sx={{ minWidth: 80 }}>期初单价</TableCell>
              <TableCell align="right" sx={{ minWidth: 90 }}>期初金额</TableCell>
              <TableCell align="right" sx={{ minWidth: 80 }}>入库数量</TableCell>
              <TableCell align="right" sx={{ minWidth: 90 }}>入库金额</TableCell>
              <TableCell align="right" sx={{ minWidth: 90 }}>销售成本价</TableCell>
              <TableCell align="right" sx={{ minWidth: 80 }}>出库数量</TableCell>
              <TableCell align="right" sx={{ minWidth: 90 }}>出库金额</TableCell>
              <TableCell align="right" sx={{ minWidth: 80 }}>损耗数量</TableCell>
              <TableCell align="right" sx={{ minWidth: 80 }}>结存数量</TableCell>
              <TableCell align="right" sx={{ minWidth: 90, fontWeight: 800 }}>成本价</TableCell>
              <TableCell sx={{ minWidth: 140 }}>计算时间</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.loading ? (
              <TableRow><TableCell colSpan={16} align="center" sx={{ py: 3 }}>加载中...</TableCell></TableRow>
            ) : history.list.length === 0 ? (
              <TableRow><TableCell colSpan={16} align="center" sx={{ py: 3 }}>暂无记录</TableCell></TableRow>
            ) : history.list.map((r) => {
              const isOpen = expandedRow === r.id;
              return (
                <Fragment key={r.id}>
                  <TableRow hover sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, '& .MuiTableCell-root': { fontSize: 13, px: 1.5 } }}
                    onClick={() => handleRowExpand(r)}>
                    <TableCell padding="checkbox" sx={{ width: 36 }}>
                      <IconButton size="small" sx={{ p: 0.5 }}>
                        {isOpen ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ fontWeight: isOpen ? 700 : 600 }}>{r.materialName}</TableCell>
                    <TableCell>{r.gradeName || '-'}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{Number(r.beginningQty).toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>¥{Number(r.beginningPrice).toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>¥{Number(r.beginningAmount).toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{Number(r.inboundQty).toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>¥{Number(r.inboundAmount).toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', color: 'info.main' }}>¥{Number(r.salesCostPrice).toFixed(4)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{Number(r.outboundQty).toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>¥{Number(r.outboundAmount).toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', color: Number(r.lossQty || 0) > 0 ? 'error.main' : 'inherit' }}>{Number(r.lossQty || 0).toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{Number(r.endingQty).toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'primary.main' }}>
                      ¥{Number(r.costPrice).toFixed(4)}
                    </TableCell>
                    <TableCell>{new Date(r.calculatedAt).toLocaleString('zh-CN')}</TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow>
                      <TableCell colSpan={16} sx={{ py: 0, bgcolor: 'grey.50' }}>
                        {detailLoading && !detailCache[r.id] ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={20} /></Box>
                        ) : detailCache[r.id]?.summary ? (
                          <Box sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'primary.main' }}>计算摘要</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                              {[
                                { label: '期初数量', value: Number(detailCache[r.id].summary.beginningQty).toFixed(2) },
                                { label: '期初单价', value: `¥${Number(detailCache[r.id].summary.beginningPrice).toFixed(2)}` },
                                { label: '期初金额', value: `¥${Number(detailCache[r.id].summary.beginningAmount).toFixed(2)}` },
                                { label: '入库数量', value: Number(detailCache[r.id].summary.inboundQty).toFixed(2) },
                                { label: '入库金额', value: `¥${Number(detailCache[r.id].summary.inboundAmount).toFixed(2)}` },
                                { label: '销售成本价', value: `¥${Number(detailCache[r.id].summary.salesCostPrice).toFixed(4)}` },
                                { label: '出库数量', value: Number(detailCache[r.id].summary.outboundQty).toFixed(2) },
                                { label: '出库金额', value: `¥${Number(detailCache[r.id].summary.outboundAmount).toFixed(2)}` },
                                { label: '损耗数量', value: Number(detailCache[r.id].summary.lossQty || 0).toFixed(2) },
                                { label: '结存数量', value: Number(detailCache[r.id].summary.endingQty).toFixed(2) },
                                { label: '结存金额', value: `¥${Number(detailCache[r.id].summary.endingAmount).toFixed(2)}` },
                                { label: '成本价', value: `¥${Number(detailCache[r.id].summary.costPrice).toFixed(4)}`, highlight: true },
                              ].filter(f => f.value !== '0' && f.value !== '¥0.00' && f.value !== '¥0.0000').map(f => (
                                <Box key={f.label} sx={{ px: 1.5, py: 0.5, bgcolor: f.highlight ? 'primary.50' : 'grey.100', borderRadius: 1, border: f.highlight ? '1px solid' : 'none', borderColor: f.highlight ? 'primary.200' : 'transparent' }}>
                                  <Typography variant="caption" color="text.secondary">{f.label}</Typography>
                                  <Typography variant="body2" sx={{ fontWeight: f.highlight ? 700 : 500, fontFamily: 'monospace', color: f.highlight ? 'primary.main' : 'inherit' }}>{f.value}</Typography>
                                </Box>
                              ))}
                            </Box>
                            {detailCache[r.id].inbound?.length > 0 && (
                              <>
                                <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: 'success.main' }}>入库明细（{detailCache[r.id].inbound.length} 条）</Typography>
                                <Table size="small" sx={{ mb: 2 }}>
                                  <TableHead><TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', bgcolor: 'success.50', fontSize: 12 } }}>
                                    <TableCell>单号</TableCell><TableCell>类型</TableCell><TableCell>仓库</TableCell><TableCell>批次</TableCell>
                                    <TableCell align="right">数量</TableCell><TableCell align="right">单价</TableCell><TableCell align="right">金额</TableCell><TableCell>日期</TableCell>
                                  </TableRow></TableHead>
                                  <TableBody>
                                    {detailCache[r.id].inbound.map(m => (
                                      <TableRow key={m.id}>
                                        <TableCell sx={{ fontFamily: 'monospace' }}>{m.movementNo}</TableCell><TableCell>{m.movementType}</TableCell>
                                        <TableCell>{m.warehouseName}</TableCell><TableCell>{m.batchNo}</TableCell>
                                        <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{Number(m.qty).toFixed(2)}</TableCell>
                                        <TableCell align="right" sx={{ fontFamily: 'monospace' }}>¥{Number(m.unitPrice).toFixed(2)}</TableCell>
                                        <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>¥{Number(m.lineAmount).toFixed(2)}</TableCell>
                                        <TableCell>{new Date(m.movementDate).toLocaleString('zh-CN')}</TableCell>
                                      </TableRow>
                                    ))}
                                    <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', borderTop: '2px solid', borderColor: 'divider' } }}>
                                      <TableCell colSpan={4}>入库合计</TableCell>
                                      <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{detailCache[r.id].inbound.reduce((s, m) => s + Number(m.qty), 0).toFixed(2)}</TableCell>
                                      <TableCell align="right" />
                                      <TableCell align="right" sx={{ fontFamily: 'monospace', color: 'success.main' }}>¥{detailCache[r.id].inbound.reduce((s, m) => s + Number(m.lineAmount), 0).toFixed(2)}</TableCell>
                                      <TableCell />
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </>
                            )}
                            {detailCache[r.id].outbound?.length > 0 && (
                              <>
                                <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: 'warning.main' }}>业务出库明细（{detailCache[r.id].outbound.length} 条，不含盘点调整）</Typography>
                                <Table size="small" sx={{ mb: 2 }}>
                                  <TableHead><TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', bgcolor: 'warning.50', fontSize: 12 } }}>
                                    <TableCell>单号</TableCell><TableCell>类型</TableCell><TableCell>仓库</TableCell>
                                    <TableCell align="right">数量</TableCell><TableCell align="right">销售成本价</TableCell><TableCell align="right">金额</TableCell><TableCell>备注</TableCell><TableCell>日期</TableCell>
                                  </TableRow></TableHead>
                                  <TableBody>
                                    {detailCache[r.id].outbound.map(m => (
                                      <TableRow key={m.id}>
                                        <TableCell sx={{ fontFamily: 'monospace' }}>{m.movementNo}</TableCell><TableCell>{m.movementType}</TableCell><TableCell>{m.warehouseName}</TableCell>
                                        <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{Number(m.qty).toFixed(2)}</TableCell>
                                        <TableCell align="right" sx={{ fontFamily: 'monospace' }}>¥{Number(m.salesCostPrice).toFixed(4)}</TableCell>
                                        <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>¥{Number(m.lineAmount).toFixed(2)}</TableCell>
                                        <TableCell>{m.remark}</TableCell><TableCell>{new Date(m.movementDate).toLocaleString('zh-CN')}</TableCell>
                                      </TableRow>
                                    ))}
                                    <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', borderTop: '2px solid', borderColor: 'divider' } }}>
                                      <TableCell colSpan={3}>出库合计</TableCell>
                                      <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{detailCache[r.id].outbound.reduce((s, m) => s + Number(m.qty), 0).toFixed(2)}</TableCell>
                                      <TableCell align="right" />
                                      <TableCell align="right" sx={{ fontFamily: 'monospace', color: 'warning.main' }}>¥{detailCache[r.id].outbound.reduce((s, m) => s + Number(m.lineAmount), 0).toFixed(2)}</TableCell>
                                      <TableCell colSpan={2} />
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </>
                            )}
                            {detailCache[r.id].stockTakeLoss?.length > 0 && (
                              <>
                                <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: 'error.main' }}>
                                  盘点损耗明细（{detailCache[r.id].stockTakeLoss.length} 条，已标记不参与下次计算）
                                </Typography>
                                <Table size="small" sx={{ mb: 2 }}>
                                  <TableHead><TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', bgcolor: 'error.50', fontSize: 12 } }}>
                                    <TableCell>盘点单号</TableCell><TableCell>仓库</TableCell>
                                    <TableCell align="right">账面数量</TableCell><TableCell align="right">实盘数量</TableCell>
                                    <TableCell align="right">差异数量</TableCell><TableCell align="right">损耗数量</TableCell>
                                    <TableCell>差异原因</TableCell><TableCell>盘点时间</TableCell><TableCell align="center">状态</TableCell>
                                  </TableRow></TableHead>
                                  <TableBody>
                                    {detailCache[r.id].stockTakeLoss.map(item => (
                                      <TableRow key={item.id}>
                                        <TableCell sx={{ fontFamily: 'monospace' }}>{item.takeNo}</TableCell>
                                        <TableCell>{item.warehouseName}</TableCell>
                                        <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{Number(item.bookQty).toFixed(2)}</TableCell>
                                        <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{Number(item.actualQty).toFixed(2)}</TableCell>
                                        <TableCell align="right" sx={{ fontFamily: 'monospace', color: 'error.main' }}>{Number(item.diffQty).toFixed(2)}</TableCell>
                                        <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 600, color: 'error.main' }}>{Number(item.lossQty).toFixed(2)}</TableCell>
                                        <TableCell>{item.diffReason}</TableCell>
                                        <TableCell>{item.countedAt ? new Date(item.countedAt).toLocaleString('zh-CN') : '-'}</TableCell>
                                        <TableCell align="center">
                                          <Chip label="已计入" size="small" color="success" sx={{ height: 20, fontSize: 11 }} />
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                    <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', borderTop: '2px solid', borderColor: 'divider' } }}>
                                      <TableCell colSpan={5}>损耗合计</TableCell>
                                      <TableCell align="right" sx={{ fontFamily: 'monospace', color: 'error.main' }}>
                                        {detailCache[r.id].stockTakeLoss.reduce((s, item) => s + Number(item.lossQty), 0).toFixed(2)}
                                      </TableCell>
                                      <TableCell colSpan={3} />
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </>
                            )}
                            {!detailCache[r.id].inbound?.length && !detailCache[r.id].outbound?.length && !detailCache[r.id].stockTakeLoss?.length && (
                              <Typography color="text.secondary" sx={{ py: 1.5, textAlign: 'center' }}>本计算周期内无入库/出库记录</Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography color="error" sx={{ py: 1.5, textAlign: 'center' }}>{detailCache[r.id]?._error || '无数据'}</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {history.total > 0 && (
        <TablePagination component="div" count={history.total} page={history.page} rowsPerPage={history.rowsPerPage}
          onPageChange={(e, p) => setHistory(prev => ({ ...prev, page: p }))}
          onRowsPerPageChange={e => setHistory(prev => ({ ...prev, rowsPerPage: +e.target.value, page: 0 }))}
          labelRowsPerPage="每页行数：" labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count} 条`} />
      )}
    </Box>
  );
}

// ============================================================
// Tab 2: 产品损耗计算历史
// ============================================================
function ProductLossHistoryTab({ materials }) {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [materialId, setMaterialId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [detailCache, setDetailCache] = useState({});
  const [detailLoading, setDetailLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page + 1);
      params.set('pageSize', rowsPerPage);
      if (materialId) params.set('materialId', materialId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      // 默认只展示最新批次，查看全部历史时传 latestOnly=false
      if (showAllHistory || startDate || endDate) params.set('latestOnly', 'false');
      else params.set('latestOnly', 'true');
      const res = await api.get(`/wms/product-loss/history?${params}`);
      setList(res.data?.list || []);
      setTotal(res.data?.total || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, rowsPerPage, materialId, startDate, endDate, showAllHistory]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const res = await api.post('/wms/product-loss/recalculate');
      alert(res.data?.message || '计算完成');
      loadData();
    } catch (e) { alert(e.response?.data?.message || e.message); }
    setRecalculating(false);
  };

  const handleRowExpand = async (row) => {
    if (expandedRow === row.id) { setExpandedRow(null); return; }
    setExpandedRow(row.id);
    if (!detailCache[row.id]) {
      setDetailLoading(true);
      try {
        const res = await api.get(`/wms/product-loss/${row.id}/detail`);
        setDetailCache(prev => ({ ...prev, [row.id]: res.data || null }));
      } catch (e) {
        console.error('[产品损耗明细] 加载失败:', e.message || e);
        setDetailCache(prev => ({ ...prev, [row.id]: { _error: e.message || '加载失败' } }));
      }
      setDetailLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', gap: 2.5, alignItems: 'center', flexWrap: 'wrap', minHeight: 55 }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>筛选物料</InputLabel>
          <Select label="筛选物料" value={materialId} onChange={e => { setMaterialId(e.target.value); setPage(0); }}>
            <MenuItem value="">全部物料</MenuItem>
            {materials.map(m => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>展示范围</InputLabel>
          <Select label="展示范围" value={showAllHistory ? 'all' : 'latest'}
            onChange={e => { setShowAllHistory(e.target.value === 'all'); setPage(0); }}>
            <MenuItem value="latest">仅最新计算</MenuItem>
            <MenuItem value="all">全部历史</MenuItem>
          </Select>
        </FormControl>
        {showAllHistory && (
          <>
            <TextField size="small" type="date" label="开始日期" value={startDate}
              onChange={e => { setStartDate(e.target.value); setPage(0); }}
              InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
            <TextField size="small" type="date" label="结束日期" value={endDate}
              onChange={e => { setEndDate(e.target.value); setPage(0); }}
              InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
          </>
        )}
        <Button variant="contained" size="small" onClick={loadData}>查询</Button>
        <Button variant="outlined" size="small" startIcon={<Refresh />}
          disabled={recalculating} onClick={handleRecalculate}>
          {recalculating ? '计算中...' : '手动计算'}
        </Button>
        <Typography variant="caption" color="error" sx={{ ml: 1 }}>
          <Box>每天0点和12点自动计算</Box>
          <Box>手动计算仅计算新增物料</Box>
        </Typography>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small" sx={{ tableLayout: 'auto', whiteSpace: 'nowrap' }}>
          <TableHead>
            <TableRow sx={{ '& .MuiTableCell-root': { fontSize: 13, fontWeight: 700, px: 1.5 } }}>
              <TableCell padding="checkbox" sx={{ width: 36 }} />
              <TableCell sx={{ minWidth: 120 }}>物料名称</TableCell>
              <TableCell align="right" sx={{ minWidth: 80 }}>入库数量</TableCell>
              <TableCell align="right" sx={{ minWidth: 80 }}>出库数量</TableCell>
              <TableCell align="right" sx={{ minWidth: 80 }}>应存数量</TableCell>
              <TableCell align="right" sx={{ minWidth: 80 }}>实存数量</TableCell>
              <TableCell align="right" sx={{ minWidth: 80, fontWeight: 800 }}>损耗数量</TableCell>
              <TableCell align="right" sx={{ minWidth: 80, fontWeight: 800 }}>损耗率%</TableCell>
              <TableCell align="right" sx={{ minWidth: 80, fontWeight: 800 }}>累计损耗率%</TableCell>
              <TableCell sx={{ minWidth: 140 }}>计算时间</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={10} align="center" sx={{ py: 3 }}>加载中...</TableCell></TableRow>
            ) : list.length === 0 ? (
              <TableRow><TableCell colSpan={10} align="center" sx={{ py: 3 }}>暂无记录，点击"手动计算"开始</TableCell></TableRow>
            ) : list.map((r) => {
              const isOpen = expandedRow === r.id;
              return (
                <Fragment key={r.id}>
                  <TableRow hover sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, '& .MuiTableCell-root': { fontSize: 13, px: 1.5 } }}
                    onClick={() => handleRowExpand(r)}>
                    <TableCell padding="checkbox" sx={{ width: 36 }}>
                      <IconButton size="small" sx={{ p: 0.5 }}>
                        {isOpen ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ fontWeight: isOpen ? 700 : 600 }}>{r.materialName}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{Number(r.inboundQty).toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{Number(r.outboundQty).toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{Number(r.expectedQty).toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{Number(r.actualQty).toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 700, color: Number(r.lossQty) > 0 ? 'error.main' : 'inherit' }}>
                      {Number(r.lossQty).toFixed(2)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 700, color: Number(r.lossRate) > 5 ? 'error.main' : Number(r.lossRate) > 0 ? 'warning.main' : 'inherit' }}>
                      {Number(r.lossRate).toFixed(2)}%
                    </TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 700, color: Number(r.cumulativeLossRate) > 5 ? 'error.main' : Number(r.cumulativeLossRate) > 0 ? 'warning.main' : 'inherit' }}>
                      {Number(r.cumulativeLossRate ?? 0).toFixed(2)}%
                    </TableCell>
                    <TableCell>{new Date(r.calculatedAt).toLocaleString('zh-CN')}</TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow>
                      <TableCell colSpan={10} sx={{ py: 0, bgcolor: 'grey.50' }}>
                        {detailLoading && !detailCache[r.id] ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={20} /></Box>
                        ) : detailCache[r.id]?.summary ? (
                          <Box sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'primary.main' }}>计算摘要</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                              {[
                                { label: '入库总量', value: Number(detailCache[r.id].summary.inboundQty).toFixed(2) },
                                { label: '业务出库量', value: Number(detailCache[r.id].summary.outboundQty).toFixed(2) },
                                { label: '应存数量', value: Number(detailCache[r.id].summary.expectedQty).toFixed(2) },
                                { label: '实存数量', value: Number(detailCache[r.id].summary.actualQty).toFixed(2) },
                                { label: '损耗数量', value: Number(detailCache[r.id].summary.lossQty).toFixed(2), highlight: true },
                                { label: '损耗率', value: `${Number(detailCache[r.id].summary.lossRate).toFixed(2)}%` },
                                { label: '累计损耗率', value: `${Number(detailCache[r.id].summary.cumulativeLossRate ?? 0).toFixed(2)}%`, highlight: Number(detailCache[r.id].summary.cumulativeLossRate) > 5 },
                              ].filter(f => f.value !== '0' && f.value !== '¥0.00' && f.value !== '0.00%').map(f => (
                                <Box key={f.label} sx={{ px: 1.5, py: 0.5, bgcolor: f.highlight ? 'error.50' : 'grey.100', borderRadius: 1, border: f.highlight ? '1px solid' : 'none', borderColor: f.highlight ? 'error.200' : 'transparent' }}>
                                  <Typography variant="caption" color="text.secondary">{f.label}</Typography>
                                  <Typography variant="body2" sx={{ fontWeight: f.highlight ? 700 : 500, fontFamily: 'monospace', color: f.highlight ? 'error.main' : 'inherit' }}>{f.value}</Typography>
                                </Box>
                              ))}
                            </Box>
                            {detailCache[r.id].adjustments?.length > 0 && (
                              <>
                                <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: 'info.main' }}>盘点调整（{detailCache[r.id].adjustments.length} 条）</Typography>
                                <Table size="small" sx={{ mb: 2 }}>
                                  <TableHead><TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', bgcolor: 'info.50', fontSize: 12 } }}>
                                    <TableCell>单号</TableCell><TableCell>类型</TableCell><TableCell>仓库</TableCell>
                                    <TableCell align="right">调整数量</TableCell><TableCell align="right">调整后库存</TableCell><TableCell>备注</TableCell><TableCell>日期</TableCell>
                                  </TableRow></TableHead>
                                  <TableBody>
                                    {detailCache[r.id].adjustments.map(m => (
                                      <TableRow key={m.id}>
                                        <TableCell sx={{ fontFamily: 'monospace' }}>{m.movementNo}</TableCell><TableCell>{m.movementType}</TableCell>
                                        <TableCell>{m.warehouseName || '-'}</TableCell>
                                        <TableCell align="right" sx={{ fontFamily: 'monospace', color: Number(m.qty) > 0 ? 'success.main' : 'error.main' }}>{Number(m.qty).toFixed(2)}</TableCell>
                                        <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{Number(m.afterQty || 0).toFixed(2)}</TableCell>
                                        <TableCell>{m.remark || '-'}</TableCell><TableCell>{new Date(m.movementDate).toLocaleString('zh-CN')}</TableCell>
                                      </TableRow>
                                    ))}
                                    <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', borderTop: '2px solid', borderColor: 'divider' } }}>
                                      <TableCell colSpan={3}>盘点调整合计</TableCell>
                                      <TableCell align="right" sx={{ fontFamily: 'monospace', color: 'info.main' }}>{detailCache[r.id].adjustments.reduce((s, m) => s + Number(m.qty), 0).toFixed(2)}</TableCell>
                                      <TableCell /><TableCell colSpan={2} />
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </>
                            )}
                            {detailCache[r.id].inbound?.length > 0 && (
                              <>
                                <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: 'success.main' }}>入库明细（{detailCache[r.id].inbound.length} 条）</Typography>
                                <Table size="small" sx={{ mb: 2 }}>
                                  <TableHead><TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', bgcolor: 'success.50', fontSize: 12 } }}>
                                    <TableCell>单号</TableCell><TableCell>类型</TableCell><TableCell>仓库</TableCell><TableCell>批次</TableCell>
                                    <TableCell align="right">数量</TableCell><TableCell align="right">单价</TableCell><TableCell align="right">金额</TableCell><TableCell>日期</TableCell>
                                  </TableRow></TableHead>
                                  <TableBody>
                                    {detailCache[r.id].inbound.map(m => (
                                      <TableRow key={m.id}>
                                        <TableCell sx={{ fontFamily: 'monospace' }}>{m.movementNo}</TableCell><TableCell>{m.movementType}</TableCell>
                                        <TableCell>{m.warehouseName || '-'}</TableCell><TableCell>{m.batchNo || '-'}</TableCell>
                                        <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{Number(m.qty).toFixed(2)}</TableCell>
                                        <TableCell align="right" sx={{ fontFamily: 'monospace' }}>¥{Number(m.unitPrice || 0).toFixed(2)}</TableCell>
                                        <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>¥{Number(m.lineAmount || m.qty * m.unitPrice || 0).toFixed(2)}</TableCell>
                                        <TableCell>{new Date(m.movementDate).toLocaleString('zh-CN')}</TableCell>
                                      </TableRow>
                                    ))}
                                    <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', borderTop: '2px solid', borderColor: 'divider' } }}>
                                      <TableCell colSpan={4}>入库合计</TableCell>
                                      <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{detailCache[r.id].inbound.reduce((s, m) => s + Number(m.qty), 0).toFixed(2)}</TableCell>
                                      <TableCell align="right" />
                                      <TableCell align="right" sx={{ fontFamily: 'monospace', color: 'success.main' }}>¥{detailCache[r.id].inbound.reduce((s, m) => s + Number(m.lineAmount || m.qty * m.unitPrice || 0), 0).toFixed(2)}</TableCell>
                                      <TableCell />
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </>
                            )}
                            {detailCache[r.id].outbound?.length > 0 && (
                              <>
                                <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600, color: 'warning.main' }}>业务出库明细（{detailCache[r.id].outbound.length} 条，不含盘点调整）</Typography>
                                <Table size="small" sx={{ mb: 1 }}>
                                  <TableHead><TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', bgcolor: 'warning.50', fontSize: 12 } }}>
                                    <TableCell>单号</TableCell><TableCell>类型</TableCell><TableCell>仓库</TableCell>
                                    <TableCell align="right">数量</TableCell><TableCell align="right">金额</TableCell><TableCell>备注</TableCell><TableCell>日期</TableCell>
                                  </TableRow></TableHead>
                                  <TableBody>
                                    {detailCache[r.id].outbound.map(m => (
                                      <TableRow key={m.id}>
                                        <TableCell sx={{ fontFamily: 'monospace' }}>{m.movementNo}</TableCell><TableCell>{m.movementType}</TableCell><TableCell>{m.warehouseName || '-'}</TableCell>
                                        <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{Number(m.qty).toFixed(2)}</TableCell>
                                        <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>¥{Number(m.lineAmount || m.qty * m.unitPrice || 0).toFixed(2)}</TableCell>
                                        <TableCell>{m.remark || '-'}</TableCell><TableCell>{new Date(m.movementDate).toLocaleString('zh-CN')}</TableCell>
                                      </TableRow>
                                    ))}
                                    <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', borderTop: '2px solid', borderColor: 'divider' } }}>
                                      <TableCell colSpan={3}>出库合计</TableCell>
                                      <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{detailCache[r.id].outbound.reduce((s, m) => s + Number(m.qty), 0).toFixed(2)}</TableCell>
                                      <TableCell align="right" sx={{ fontFamily: 'monospace', color: 'warning.main' }}>¥{detailCache[r.id].outbound.reduce((s, m) => s + Number(m.lineAmount || m.qty * m.unitPrice || 0), 0).toFixed(2)}</TableCell>
                                      <TableCell colSpan={2} />
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </>
                            )}
                            {!detailCache[r.id].inbound?.length && !detailCache[r.id].outbound?.length && !detailCache[r.id].adjustments?.length && (
                              <Typography color="text.secondary" sx={{ py: 1.5, textAlign: 'center' }}>暂无出入库明细记录</Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography color="error" sx={{ py: 1.5, textAlign: 'center' }}>{detailCache[r.id]?._error || '无数据'}</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
            {/* 合计行 */}
            {list.length > 0 && (
              <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 700, borderTop: '2px solid', borderColor: 'divider' } }}>
                <TableCell padding="checkbox" />
                <TableCell>合计</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{list.reduce((s, r) => s + Number(r.inboundQty), 0).toFixed(2)}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{list.reduce((s, r) => s + Number(r.outboundQty), 0).toFixed(2)}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{list.reduce((s, r) => s + Number(r.expectedQty), 0).toFixed(2)}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{list.reduce((s, r) => s + Number(r.actualQty), 0).toFixed(2)}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', color: 'error.main' }}>{list.reduce((s, r) => s + Number(r.lossQty), 0).toFixed(2)}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace' }}>-</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace' }}>-</TableCell>
                <TableCell />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {total > 0 && (
        <TablePagination component="div" count={total} page={page} rowsPerPage={rowsPerPage}
          onPageChange={(e, p) => setPage(p)}
          onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
          labelRowsPerPage="每页行数：" labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count} 条`} />
      )}
    </Box>
  );
}

// ============================================================
// Tab 3: 费用登记（按物料指定费用）
// ============================================================
const FEE_TYPE_OPTIONS = [
  { value: 'PACKAGING', label: '包装费用' },
  { value: 'BOX_COST', label: '单盒成本' },
  { value: 'FREIGHT', label: '采购到货运费/盒' },
];

const CATEGORY_OPTIONS = ['鲜品', '干品', '冻品', '菌种', '灭菌设备', '其他'];

function FeeRegistrationTab({ materials }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [editRow, setEditRow] = useState(null);
  const [editData, setEditData] = useState({});
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [hasFee, setHasFee] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // 新增费用对话框
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({ materialId: '', packagingFee: '', boxCost: '', freightPerBox: '' });
  const [addSaving, setAddSaving] = useState(false);

  // 删除确认对话框
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { materialId, materialName }
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page + 1);
      params.set('pageSize', rowsPerPage);
      if (keyword) params.set('keyword', keyword);
      if (category) params.set('category', category);
      if (hasFee) params.set('hasFee', hasFee);
      const res = await api.get(`/sales/fees/by-material?${params}`);
      setRows(res.data?.list || []);
      setTotal(res.data?.total || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page, rowsPerPage, keyword, category, hasFee]);

  useEffect(() => { loadData(); }, [loadData]);

  const startEdit = (row) => {
    setEditRow(row.materialId);
    setEditData({
      packagingFee: row.packagingFee,
      boxCost: row.boxCost,
      freightPerBox: row.freightPerBox,
    });
  };

  const cancelEdit = () => { setEditRow(null); setEditData({}); };

  const handleSave = async (row) => {
    setSaving(true);
    try {
      await api.put(`/sales/fees/by-material/${row.materialId}`, editData);
      await loadData();
      setEditRow(null);
      setEditData({});
    } catch (e) { alert(e.response?.data?.message || e.message); }
    setSaving(false);
  };

  // 新增费用
  const handleAddOpen = () => {
    setAddForm({ materialId: '', packagingFee: '', boxCost: '', freightPerBox: '' });
    setAddDialogOpen(true);
  };

  const handleAddSave = async () => {
    if (!addForm.materialId) { alert('请选择物料'); return; }
    const pf = Number(addForm.packagingFee) || 0;
    const bc = Number(addForm.boxCost) || 0;
    const fp = Number(addForm.freightPerBox) || 0;
    if (pf === 0 && bc === 0 && fp === 0) { alert('请至少输入一项费用金额'); return; }
    setAddSaving(true);
    try {
      await api.put(`/sales/fees/by-material/${addForm.materialId}`, {
        packagingFee: pf,
        boxCost: bc,
        freightPerBox: fp,
      });
      await loadData();
      setAddDialogOpen(false);
    } catch (e) { alert(e.response?.data?.message || e.message); }
    setAddSaving(false);
  };

  // 删除物料费用
  const handleDeleteOpen = (row) => {
    setDeleteTarget({ materialId: row.materialId, materialName: `${row.materialCode} ${row.materialName}` });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await api.delete(`/sales/fees/by-material/${deleteTarget.materialId}`);
      await loadData();
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (e) { alert(e.response?.data?.message || e.message); }
    setDeleting(false);
  };

  const handleQuery = () => {
    setPage(0);
    loadData();
  };

  const handleReset = () => {
    setKeyword('');
    setCategory('');
    setHasFee('');
    setPage(0);
  };

  // 当前页的合计
  const totalPackaging = rows.reduce((s, r) => s + (editRow === r.materialId ? Number(editData.packagingFee || 0) : Number(r.packagingFee || 0)), 0);
  const totalBoxCost = rows.reduce((s, r) => s + (editRow === r.materialId ? Number(editData.boxCost || 0) : Number(r.boxCost || 0)), 0);
  const totalFreight = rows.reduce((s, r) => s + (editRow === r.materialId ? Number(editData.freightPerBox || 0) : Number(r.freightPerBox || 0)), 0);

  return (
    <Box>
      {/* 查询条件 */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField size="small" placeholder="搜索物料名称/编码" value={keyword}
            onChange={e => setKeyword(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
            sx={{ width: 200 }} />
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>物料类别</InputLabel>
            <Select label="物料类别" value={category} onChange={e => setCategory(e.target.value)}>
              <MenuItem value="">全部</MenuItem>
              {CATEGORY_OPTIONS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>费用状态</InputLabel>
            <Select label="费用状态" value={hasFee} onChange={e => setHasFee(e.target.value)}>
              <MenuItem value="">全部物料</MenuItem>
              <MenuItem value="yes">已登记费用</MenuItem>
              <MenuItem value="no">未登记费用</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" size="small" onClick={handleQuery}>查询</Button>
          <Button variant="outlined" size="small" onClick={handleReset}>重置</Button>
          <Button variant="outlined" size="small" startIcon={<Add />} onClick={handleAddOpen}
            sx={{ ml: 'auto' }}>新增费用</Button>
        </Box>
      </Paper>

      {/* 数据表格 */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, minWidth: 140 }}>物料</TableCell>
              <TableCell sx={{ fontWeight: 800, minWidth: 80 }}>规格</TableCell>
              <TableCell sx={{ fontWeight: 800, minWidth: 60 }}>单位</TableCell>
              <TableCell sx={{ fontWeight: 800, minWidth: 80 }}>类别</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, minWidth: 100 }}>包装费用</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, minWidth: 100 }}>单盒成本</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, minWidth: 130 }}>采购到货运费/盒</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, minWidth: 100 }}>费用合计</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, minWidth: 120 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} align="center" sx={{ py: 3 }}>加载中...</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={9} align="center" sx={{ py: 3 }}>暂无记录</TableCell></TableRow>
            ) : rows.map((r) => {
              const isEditing = editRow === r.materialId;
              const pf = isEditing ? Number(editData.packagingFee || 0) : Number(r.packagingFee || 0);
              const bc = isEditing ? Number(editData.boxCost || 0) : Number(r.boxCost || 0);
              const fp = isEditing ? Number(editData.freightPerBox || 0) : Number(r.freightPerBox || 0);
              const total = pf + bc + fp;
              const hasAnyFee = pf > 0 || bc > 0 || fp > 0;

              return (
                <TableRow key={r.materialId} hover sx={{ bgcolor: hasAnyFee ? 'inherit' : 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>{r.materialCode} {r.materialName}</TableCell>
                  <TableCell>{r.spec || '-'}</TableCell>
                  <TableCell>{r.unit || '-'}</TableCell>
                  <TableCell><Chip label={r.category || '-'} size="small" variant="outlined" /></TableCell>
                  {isEditing ? (
                    <Fragment>
                      <TableCell align="right">
                        <TextField size="small" type="number" value={editData.packagingFee}
                          onChange={e => setEditData({ ...editData, packagingFee: e.target.value })}
                          onFocus={e => e.target.select()}
                          InputProps={{ startAdornment: <InputAdornment position="start">¥</InputAdornment> }}
                          sx={{ width: 120 }} />
                      </TableCell>
                      <TableCell align="right">
                        <TextField size="small" type="number" value={editData.boxCost}
                          onChange={e => setEditData({ ...editData, boxCost: e.target.value })}
                          onFocus={e => e.target.select()}
                          InputProps={{ startAdornment: <InputAdornment position="start">¥</InputAdornment> }}
                          sx={{ width: 120 }} />
                      </TableCell>
                      <TableCell align="right">
                        <TextField size="small" type="number" value={editData.freightPerBox}
                          onChange={e => setEditData({ ...editData, freightPerBox: e.target.value })}
                          onFocus={e => e.target.select()}
                          InputProps={{ startAdornment: <InputAdornment position="start">¥</InputAdornment> }}
                          sx={{ width: 140 }} />
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                        ¥{total.toFixed(2)}
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Button size="small" variant="contained" disabled={saving}
                            onClick={() => handleSave(r)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>保存</Button>
                          <Button size="small" variant="contained" color="error" onClick={cancelEdit} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>取消</Button>
                        </Stack>
                      </TableCell>
                    </Fragment>
                  ) : (
                    <Fragment>
                      <TableCell align="right" sx={{ fontFamily: 'monospace', color: pf > 0 ? 'inherit' : 'text.disabled' }}>
                        {pf > 0 ? `¥${pf.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace', color: bc > 0 ? 'inherit' : 'text.disabled' }}>
                        {bc > 0 ? `¥${bc.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace', color: fp > 0 ? 'inherit' : 'text.disabled' }}>
                        {fp > 0 ? `¥${fp.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'monospace', fontWeight: 700, color: total > 0 ? 'primary.main' : 'text.disabled' }}>
                        {total > 0 ? `¥${total.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Button size="small" variant="contained" color="primary" onClick={() => startEdit(r)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>编辑</Button>
                          <Button size="small" variant="contained" color="error" onClick={() => handleDeleteOpen(r)} sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}>删除</Button>
                        </Stack>
                      </TableCell>
                    </Fragment>
                  )}
                </TableRow>
              );
            })}
            {/* 合计行 */}
            {rows.length > 0 && (
              <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 700, borderTop: '2px solid', borderColor: 'divider' } }}>
                <TableCell>当前页合计</TableCell>
                <TableCell />
                <TableCell />
                <TableCell />
                <TableCell align="right" sx={{ fontFamily: 'monospace' }}>¥{totalPackaging.toFixed(2)}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace' }}>¥{totalBoxCost.toFixed(2)}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace' }}>¥{totalFreight.toFixed(2)}</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
                  ¥{(totalPackaging + totalBoxCost + totalFreight).toFixed(2)}
                </TableCell>
                <TableCell />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 分页 */}
      {total > 0 && (
        <TablePagination component="div" count={total} page={page} rowsPerPage={rowsPerPage}
          onPageChange={(e, p) => setPage(p)}
          onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
          labelRowsPerPage="每页行数：" labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count} 条`} />
      )}

      {/* 新增费用对话框 */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>新增费用</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>选择物料</InputLabel>
              <Select label="选择物料" value={addForm.materialId}
                onChange={e => setAddForm(prev => ({ ...prev, materialId: e.target.value }))}>
                {materials.map(m => <MenuItem key={m.id} value={m.id}>{m.code} {m.name} {m.spec ? `(${m.spec})` : ''}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" fullWidth label="包装费用" type="number" value={addForm.packagingFee}
              onChange={e => setAddForm(prev => ({ ...prev, packagingFee: e.target.value }))}
              onFocus={e => e.target.select()}
              InputProps={{ startAdornment: <InputAdornment position="start">¥</InputAdornment> }} />
            <TextField size="small" fullWidth label="单盒成本" type="number" value={addForm.boxCost}
              onChange={e => setAddForm(prev => ({ ...prev, boxCost: e.target.value }))}
              onFocus={e => e.target.select()}
              InputProps={{ startAdornment: <InputAdornment position="start">¥</InputAdornment> }} />
            <TextField size="small" fullWidth label="采购到货运费/盒" type="number" value={addForm.freightPerBox}
              onChange={e => setAddForm(prev => ({ ...prev, freightPerBox: e.target.value }))}
              onFocus={e => e.target.select()}
              InputProps={{ startAdornment: <InputAdornment position="start">¥</InputAdornment> }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>取消</Button>
          <Button variant="contained" disabled={addSaving} onClick={handleAddSave}>
            {addSaving ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>确定要删除物料 <strong>{deleteTarget?.materialName}</strong> 的所有费用记录吗？</Typography>
          <Typography color="error" sx={{ mt: 1 }}>此操作不可恢复！</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
          <Button variant="contained" color="error" disabled={deleting} onClick={handleDeleteConfirm}>
            {deleting ? '删除中...' : '确认删除'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ============================================================
// 主页面：三个卡片页 Tab
// ============================================================
export default function PriceListPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [materials, setMaterials] = useState([]);

  useEffect(() => {
    api.get('/master/materials?pageSize=9999').then(res => {
      setMaterials(res.data?.list || res.data || []);
    }).catch(() => {});
  }, []);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>费用与成本管理</Typography>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}
          sx={{ '& .MuiTab-root': { fontWeight: 600 } }}>
          <Tab label="成本价计算历史" />
          <Tab label="产品损耗计算历史" />
          <Tab label="费用登记" />
        </Tabs>
      </Paper>

      {activeTab === 0 && <CostPriceHistoryTab materials={materials} />}
      {activeTab === 1 && <ProductLossHistoryTab materials={materials} />}
      {activeTab === 2 && <FeeRegistrationTab materials={materials} />}
    </Box>
  );
}
