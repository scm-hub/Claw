import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, CircularProgress, Button, Chip, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Checkbox,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Collapse, Alert, Tabs, Tab,
} from '@mui/material';
import {
  MergeType as AggregateIcon, PushPin, ExpandMore, ExpandLess,
  CheckCircle, Search, History, PendingActions, Description,
} from '@mui/icons-material';
import api from '../../lib/api';

const STATUS_LABELS = {
  DRAFT: '草稿',
  PENDING: '待审批',
  APPROVED: '已批准',
  REJECTED: '已驳回',
  ACTIVE: '执行中',
  CLOSED: '已关闭',
  CANCELLED: '已取消',
};

const STATUS_COLORS = {
  DRAFT: 'default',
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  ACTIVE: 'info',
  CLOSED: 'default',
  CANCELLED: 'error',
};

export default function DemandAggregation() {
  const [tab, setTab] = useState(0);

  // ===== Tab 0: 待生成采购计划 =====
  const [rawData, setRawData] = useState({ list: [], summary: {} });
  const [data, setData] = useState({ list: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState({});
  const [expanded, setExpanded] = useState({});
  const [keyword, setKeyword] = useState('');
  const [pushDialog, setPushDialog] = useState(false);
  const [pushResult, setPushResult] = useState(null);
  const [pushForm, setPushForm] = useState({
    title: '',
    periodStart: new Date().toISOString().slice(0, 10),
    periodEnd: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    remark: '由销售需求汇总推送生成',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/sales/plans/demand-aggregation');
      setRawData(res.data);
      setData(res.data);
      const sel = {};
      res.data.list.forEach(it => { sel[it.key] = { ...it }; });
      setSelected(sel);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // 本地搜索过滤
  useEffect(() => {
    let list = rawData.list || [];
    if (keyword) {
      const kw = keyword.toLowerCase();
      list = list.filter(it =>
        it.material?.name?.toLowerCase().includes(kw) ||
        it.material?.code?.toLowerCase().includes(kw)
      );
    }
    setData(prev => ({ ...prev, list }));
  }, [keyword, rawData]);

  const toggleSelect = (key) => {
    setSelected(prev => {
      const next = { ...prev };
      if (next[key]) delete next[key]; else next[key] = { ...data.list.find(i => i.key === key) };
      return next;
    });
  };

  const toggleExpand = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const selectedList = Object.values(selected).filter(s => data.list.some(d => d.key === s.key));
  const selectedCount = selectedList.length;
  const totalCount = data.list.length;
  const allSelected = selectedCount === totalCount && totalCount > 0;
  const someSelected = selectedCount > 0 && selectedCount < totalCount;

  const toggleSelectAll = () => {
    if (allSelected) { setSelected({}); }
    else {
      const sel = {};
      data.list.forEach(it => { sel[it.key] = { ...it }; });
      setSelected(sel);
    }
  };

  const selectedQty = selectedList.reduce((s, i) => s + i.totalQty, 0);
  const selectedStock = selectedList.reduce((s, i) => s + (i.stockQty || 0), 0);
  const selectedPurchase = selectedList.reduce((s, i) => s + (i.purchaseQty || 0), 0);

  const handlePush = async () => {
    try {
      const validItems = selectedList.filter(it => it.materialId && it.purchaseQty > 0);
      if (validItems.length === 0) {
        setPushResult({ success: false, message: '所选需求中无可采购的物料（数量≤0或物料信息缺失）' });
        return;
      }
      const filteredCount = selectedList.length - validItems.length;
      const items = validItems.map(it => ({
        materialId: it.materialId,
        supplierId: it.supplierId || null,
        planQty: it.purchaseQty,
        unit: it.material?.unit || '件',
        demandAggNo: it.aggNo,
        sourceItemIds: it.sourceItemIds || [],
        remark: `来源: ${it.sources.map(s => s.salesRep).join(', ')}`,
      }));
      const res = await api.post('/sales/plans/push-to-purchase', { ...pushForm, items });
      setPushResult({
        success: res.success,
        data: res.data,
        message: res.message,
        filteredInfo: filteredCount > 0 ? `已自动过滤 ${filteredCount} 条无效数据` : undefined,
      });
    } catch (e) {
      let errMsg = String(e?.message || e || '未知错误');
      if (e instanceof SyntaxError) errMsg = '服务器返回了非JSON格式响应（可能是网关或后端错误页）';
      console.error('[DemandAggregation] 推送采购计划失败:', e);
      setPushResult({ success: false, message: `[${e?.name || 'Error'}] ${errMsg}` });
    }
  };

  // ===== Tab 1: 历史记录 =====
  const [history, setHistory] = useState({ list: [], summary: {} });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyKeyword, setHistoryKeyword] = useState('');
  const [historyExpanded, setHistoryExpanded] = useState({});

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/sales/plans/push-history', { params: { keyword: historyKeyword } });
      setHistory(res.data);
    } catch (e) { console.error(e); }
    setHistoryLoading(false);
  }, [historyKeyword]);

  useEffect(() => {
    if (tab === 1) loadHistory();
  }, [tab, loadHistory]);

  const toggleHistoryExpand = (planId) => setHistoryExpanded(prev => ({ ...prev, [planId]: !prev[planId] }));

  // ===== 渲染 =====
  return (
    <Box>
      {/* 标题栏 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <AggregateIcon color="primary" sx={{ fontSize: 32 }} />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>需求汇总</Typography>
      </Box>

      {/* Tab 切换 */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab
            icon={<PendingActions />} iconPosition="start"
            label={`待生成采购计划${data.list.length > 0 ? ` (${data.list.length})` : ''}`}
            sx={{ fontWeight: 600, minHeight: 56 }}
          />
          <Tab
            icon={<History />} iconPosition="start"
            label={`历史记录${history.list?.length > 0 ? ` (${history.list.length})` : ''}`}
            sx={{ fontWeight: 600, minHeight: 56 }}
          />
        </Tabs>
      </Paper>

      {/* ===== Tab 0: 待生成采购计划 ===== */}
      {tab === 0 && (
        <>
          {/* 查询条件 + 操作按钮 */}
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50', display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField
              size="small"
              placeholder="搜索物料名称 / 编码..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              InputProps={{ startAdornment: <Search sx={{ mr: 1, fontSize: 18, color: 'text.disabled' }} /> }}
              sx={{ minWidth: 260 }}
            />
            <Box sx={{ flex: 1 }} />
            <Button
              variant="contained" color="primary" startIcon={<PushPin />}
              disabled={selectedCount === 0}
              onClick={() => { setPushResult(null); setPushDialog(true); }}
            >
              推送生成采购计划 ({selectedCount})
            </Button>
          </Paper>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
          ) : selectedCount > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              已选 <b>{selectedCount}</b> 条需求，合计需求数量 <b>{selectedQty}</b>，当前库存 <b>{selectedStock}</b>，建议采购量 <b>{selectedPurchase}</b>
            </Alert>
          )}

          {!loading && (
            data.list.length === 0 ? (
              <Paper sx={{ p: 6, textAlign: 'center' }}>
                <PendingActions sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body1" color="textSecondary">
                  {keyword ? '没有符合筛选条件的需求' : '暂无待生成采购计划的需求'}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  {keyword ? '试试清空搜索关键词' : '业务员提交销售计划后，需求会自动汇总到这里'}
                </Typography>
              </Paper>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell padding="checkbox">
                        <Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleSelectAll} color="primary" />
                      </TableCell>
                      <TableCell>汇总编号</TableCell>
                      <TableCell>物料</TableCell>
                      <TableCell align="center">单位</TableCell>
                      <TableCell align="right">合计数量</TableCell>
                      <TableCell align="right">当前库存</TableCell>
                      <TableCell align="right">采购计划数</TableCell>
                      <TableCell align="center">来源人数</TableCell>
                      <TableCell align="center">明细</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.list.map((it) => {
                      const isSel = !!selected[it.key];
                      const unit = it.material?.unit || '件';
                      const stockQty = it.stockQty || 0;
                      const purchaseQty = it.purchaseQty || 0;
                      const needPurchase = purchaseQty > 0;
                      return (
                        <>
                          <TableRow key={it.key} sx={{ bgcolor: isSel ? 'primary.50' : 'inherit' }}>
                            <TableCell padding="checkbox">
                              <Checkbox checked={isSel} onChange={() => toggleSelect(it.key)} color="primary" />
                            </TableCell>
                            <TableCell>
                              <Chip label={it.aggNo} size="small" color="secondary" variant="outlined" sx={{ fontFamily: 'monospace' }} />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{it.material?.name}</Typography>
                              <Typography variant="caption" color="textSecondary">{it.material?.code}</Typography>
                            </TableCell>
                            <TableCell align="center">{unit}</TableCell>
                            <TableCell align="right">
                              <Typography sx={{ fontWeight: 700, fontSize: '1.1rem' }}>{it.totalQty}</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography sx={{ color: stockQty >= it.totalQty ? 'success.main' : 'warning.main', fontWeight: 600 }}>
                                {stockQty}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography sx={{
                                fontWeight: 700, fontSize: '1.1rem',
                                color: needPurchase ? 'error.main' : 'text.disabled',
                              }}>
                                {purchaseQty}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={`${it.sources.length}人`} size="small" color="info" />
                            </TableCell>
                            <TableCell align="center">
                              <IconButton size="small" onClick={() => toggleExpand(it.key)}>
                                {expanded[it.key] ? <ExpandLess /> : <ExpandMore />}
                              </IconButton>
                            </TableCell>
                          </TableRow>
                          <TableRow key={it.key + '-detail'}>
                            <TableCell colSpan={9} sx={{ py: 0, border: 'none' }}>
                              <Collapse in={expanded[it.key]} timeout="auto" unmountOnExit>
                                <Box sx={{ py: 2, px: 3 }}>
                                  <Typography variant="subtitle2" sx={{ mb: 1 }}>需求来源明细</Typography>
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow>
                                        <TableCell>计划编号</TableCell>
                                        <TableCell>计划标题</TableCell>
                                        <TableCell>业务员</TableCell>
                                        <TableCell>客户</TableCell>
                                        <TableCell align="right">数量</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {it.sources.map((src, idx) => (
                                        <TableRow key={idx}>
                                          <TableCell><Chip label={src.planNo} size="small" variant="outlined" /></TableCell>
                                          <TableCell>{src.planTitle}</TableCell>
                                          <TableCell>{src.salesRep}</TableCell>
                                          <TableCell>{src.customer}</TableCell>
                                          <TableCell align="right">{src.qty} {unit}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          )}
        </>
      )}

      {/* ===== Tab 1: 历史记录 ===== */}
      {tab === 1 && (
        <>
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
            <TextField
              size="small"
              placeholder="搜索采购计划编号 / 标题 / 物料名称..."
              value={historyKeyword}
              onChange={e => setHistoryKeyword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') loadHistory(); }}
              InputProps={{ startAdornment: <Search sx={{ mr: 1, fontSize: 18, color: 'text.disabled' }} /> }}
              sx={{ minWidth: 320 }}
            />
          </Paper>

          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
          ) : history.list?.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <History sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body1" color="textSecondary">暂无推送历史记录</Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                从"待生成采购计划"推送后，记录会显示在这里
              </Typography>
            </Paper>
          ) : (
            <>
              {/* 汇总信息 */}
              {history.summary && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  共 <b>{history.summary.totalPlans}</b> 个采购计划，<b>{history.summary.totalItems}</b> 条明细，合计采购数量 <b>{history.summary.totalQty}</b>
                </Alert>
              )}

              {/* 采购计划卡片列表 */}
              {history.list.map((plan) => (
                <HistoryCard key={plan.planId} plan={plan} expanded={!!historyExpanded[plan.planId]} onToggle={() => toggleHistoryExpand(plan.planId)} />
              ))}
            </>
          )}
        </>
      )}

      {/* 推送采购计划弹窗 */}
      <Dialog open={pushDialog} onClose={() => setPushDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PushPin color="primary" />
            推送生成采购计划
          </Box>
        </DialogTitle>
        <DialogContent>
          {pushResult ? (
            pushResult.success ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" color="success.main">采购计划创建成功！</Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  编号：<b>{pushResult.data.planNo}</b>
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {pushResult.data.items.length} 条明细
                  {pushResult.filteredInfo && `（${pushResult.filteredInfo}）`}
                </Typography>
                <Button
                  variant="outlined" sx={{ mt: 2 }}
                  onClick={() => { setPushDialog(false); loadData(); }}
                >
                  完成
                </Button>
              </Box>
            ) : (
              <Box sx={{ py: 2 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>推送失败</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                    {pushResult.message || '未知错误，请重试'}
                  </Typography>
                </Alert>
                <Button variant="outlined" onClick={() => setPushResult(null)}>返回修改</Button>
              </Box>
            )
          ) : (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                将把 <b>{selectedCount}</b> 条需求汇总生成采购计划，合计需求数量 <b>{selectedQty}</b>，建议采购量 <b>{selectedPurchase}</b>
              </Alert>
              <TextField
                fullWidth label="计划标题" sx={{ mb: 2 }}
                value={pushForm.title}
                onChange={e => setPushForm({ ...pushForm, title: e.target.value })}
                placeholder="如：6月采购计划"
              />
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  fullWidth type="date" label="开始日期"
                  InputLabelProps={{ shrink: true }}
                  value={pushForm.periodStart}
                  onChange={e => setPushForm({ ...pushForm, periodStart: e.target.value })}
                />
                <TextField
                  fullWidth type="date" label="结束日期"
                  InputLabelProps={{ shrink: true }}
                  value={pushForm.periodEnd}
                  onChange={e => setPushForm({ ...pushForm, periodEnd: e.target.value })}
                />
              </Box>
              <TextField
                fullWidth label="备注" multiline rows={2}
                value={pushForm.remark}
                onChange={e => setPushForm({ ...pushForm, remark: e.target.value })}
              />
            </>
          )}
        </DialogContent>
        {!pushResult && (
          <DialogActions>
            <Button onClick={() => setPushDialog(false)}>取消</Button>
            <Button
              variant="contained" color="primary"
              disabled={!pushForm.title}
              onClick={handlePush}
              startIcon={<PushPin />}
            >
              确认推送
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </Box>
  );
}

// ===== 历史记录卡片子组件 =====
function HistoryCard({ plan, expanded, onToggle }) {
  const periodStr = `${new Date(plan.periodStart).toLocaleDateString()} ~ ${new Date(plan.periodEnd).toLocaleDateString()}`;
  const totalQty = plan.items.reduce((s, it) => s + it.planQty, 0);

  return (
    <Paper sx={{ mb: 1.5, overflow: 'hidden' }}>
      {/* 卡片头部 */}
      <Box
        sx={{
          p: 2, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer',
          '&:hover': { bgcolor: 'grey.50' },
        }}
        onClick={onToggle}
      >
        <Description color="action" />
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{plan.title}</Typography>
            <Chip label={plan.planNo} size="small" variant="outlined" sx={{ fontFamily: 'monospace' }} />
            <Chip
              label={STATUS_LABELS[plan.status] || plan.status}
              size="small"
              color={STATUS_COLORS[plan.status] || 'default'}
            />
          </Box>
          <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
            {periodStr} | 创建人: {plan.creator} | {new Date(plan.createdAt).toLocaleString()} | {plan.items.length} 条明细 | 合计 {totalQty}
          </Typography>
        </Box>
        <IconButton size="small">
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      {/* 展开明细 */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ px: 2, pb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell>汇总编号</TableCell>
                <TableCell>物料</TableCell>
                <TableCell align="center">单位</TableCell>
                <TableCell align="right">采购数量</TableCell>
                <TableCell>备注</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {plan.items.map((it, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <Chip label={it.demandAggNo} size="small" color="secondary" variant="outlined" sx={{ fontFamily: 'monospace' }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{it.material?.name}</Typography>
                    <Typography variant="caption" color="textSecondary">{it.material?.code}</Typography>
                  </TableCell>
                  <TableCell align="center">{it.unit || it.material?.unit || '-'}</TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontWeight: 700 }}>{it.planQty}</Typography>
                  </TableCell>
                  <TableCell>{it.remark || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Collapse>
    </Paper>
  );
}
