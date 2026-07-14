import { useState, useEffect, useRef, Fragment } from 'react';
import {
  Box, Typography, TextField, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
  Button, MenuItem, InputAdornment, TablePagination, Chip, Tooltip,
  CircularProgress, Snackbar, Alert, Dialog, DialogTitle, DialogContent,
  Stack,
} from '@mui/material';
import {
  Search, CheckCircle, UploadFile, AttachFile, Download,
  KeyboardArrowDown, KeyboardArrowUp, RestartAlt,
} from '@mui/icons-material';
import api from '../../lib/api';

const RECEIPT_STATUS_MAP = {
  PENDING: { label: '未入库', color: 'warning' },
  CONFIRMED: { label: '已入库', color: 'success' },
};

const QC_STATUS_MAP = {
  PENDING: { label: '待质检', color: 'warning' },
  INSPECTED: { label: '已质检', color: 'success' },
  PASS: { label: '合格', color: 'success' },
  FAIL: { label: '不合格', color: 'error' },
};

export default function ReceiptList() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [previewDialog, setPreviewDialog] = useState({ open: false, url: '', name: '' });
  const [expandedId, setExpandedId] = useState(null);

  // 行内暂存（按明细 id 存储）
  const [editingQty, setEditingQty] = useState({});
  const [confirming, setConfirming] = useState({});
  const fileInputRefs = useRef({});
  const [fileTick, setFileTick] = useState(0); // 触发文件 UI 刷新
  const [uploadingFiles, setUploadingFiles] = useState({}); // 按明细id记录上传中状态

  const getAttachmentUrl = (path) => {
    if (!path || path.startsWith('http')) return path;
    return import.meta.env.BASE_URL.replace(/\/$/, '') + path;
  };

  const loadList = async () => {
    try {
      const params = new URLSearchParams({ page: page + 1, pageSize: rowsPerPage });
      if (keyword) params.set('keyword', keyword);
      if (status) params.set('status', status);
      if (batchNo) params.set('batchNo', batchNo);
      if (supplierId) params.set('supplierId', supplierId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await api.get(`/purchase/receipts?${params.toString()}`);
      const items = res.data.list || [];
      setList(items);
      setTotal(res.data.total || 0);
      // 初始化编辑状态
      const newEditingQty = {};
      items.forEach((rcpt) => {
        if (rcpt.status === 'PENDING' && rcpt.items) {
          rcpt.items.forEach((it) => {
            newEditingQty[it.id] = it.receivedQty || '';
          });
        }
      });
      setEditingQty(newEditingQty);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { loadList(); }, [page, rowsPerPage, keyword, status, batchNo, supplierId, startDate, endDate]);
  useEffect(() => { setExpandedId(null); }, [page]);
  useEffect(() => { api.get('/purchase/suppliers').then(res => setSuppliers(res.data?.list || res.data || [])).catch(() => {}); }, []);

  // 金蝶同步轮询：列表中存在 SYNCING 状态时自动刷新
  useEffect(() => {
    const hasSyncing = list.some((r) => r.kingdeeSyncStatus === 'SYNCING');
    if (!hasSyncing) return;

    let count = 0;
    const maxCount = 20; // 最多轮询 20 次 × 3 秒 = 60 秒
    const timer = setInterval(() => {
      count += 1;
      loadList();
      if (count >= maxCount) clearInterval(timer);
      // loadList 内部更新 list 后，下次 effect 会判断是否继续
    }, 3000);

    return () => clearInterval(timer);
  }, [list]);


  const handleSearch = () => { setPage(0); };
  const handleReset = () => {
    setKeyword(''); setStatus(''); setBatchNo(''); setSupplierId(''); setStartDate(''); setEndDate('');
    setPage(0);
    setTimeout(() => loadList(), 0);
  };

  const handleQtyChange = (itemId, value) => {
    setEditingQty({ ...editingQty, [itemId]: value });
  };

  const handleFileSelect = async (itemId, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setSnackbar({ open: true, message: '附件大小不能超过 10MB', severity: 'error' });
      event.target.value = '';
      return;
    }
    // 立即上传
    setUploadingFiles(prev => ({ ...prev, [itemId]: true }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.put(`/purchase/receipts/items/${itemId}/qc-upload`, formData);
      setSnackbar({ open: true, message: '质检附件上传成功', severity: 'success' });
      loadList(); // 刷新列表，更新 UI 状态
    } catch (err) {
      setSnackbar({ open: true, message: '上传失败: ' + (err.response?.data?.message || err.message), severity: 'error' });
      event.target.value = '';
    } finally {
      setUploadingFiles(prev => ({ ...prev, [itemId]: false }));
      setFileTick(Date.now());
    }
  };

  const handleClearFile = (itemId) => {
    if (fileInputRefs.current[itemId]) fileInputRefs.current[itemId].value = '';
    setFileTick(Date.now());
  };

  const getFileFromInput = (id) => fileInputRefs.current[id]?.files?.[0] || null;

  const handlePreviewAttachment = (attachmentPath) => {
    const fullUrl = getAttachmentUrl(attachmentPath);
    const fileName = attachmentPath.split('/').pop();
    setPreviewDialog({ open: true, url: fullUrl, name: fileName });
  };

  const isImage = (url) => /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(url);
  const isPdf = (url) => /\.pdf$/i.test(url);

  const handleConfirm = async (receipt) => {
    if (!receipt.items || receipt.items.length === 0) {
      setSnackbar({ open: true, message: '入库单没有明细', severity: 'error' });
      return;
    }
    // 逐条校验
    for (const it of receipt.items) {
      const val = Number(editingQty[it.id]);
      if (!val || isNaN(val) || val <= 0) {
        setSnackbar({ open: true, message: `请填写【${it.material?.name}】的入库数量`, severity: 'error' });
        return;
      }
      if (!it.qcAttachment) {
        setSnackbar({ open: true, message: `请先为【${it.material?.name}】上传质检附件`, severity: 'error' });
        return;
      }
    }

    if (!confirm(`确认入库？\n共 ${receipt.items.length} 条明细`)) return;

    setConfirming({ ...confirming, [receipt.id]: true });
    try {
      const formData = new FormData();
        const itemsData = receipt.items.map(it => ({
          id: it.id,
          receivedQty: Number(editingQty[it.id]),
          gradeId: it.gradeId || null,
        }));
      formData.append('items', JSON.stringify(itemsData));
      await api.post(`/purchase/receipts/${receipt.id}/confirm`, formData);
      setSnackbar({ open: true, message: '入库成功！', severity: 'success' });
      loadList();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.message || err.message, severity: 'error' });
    } finally {
      setConfirming({ ...confirming, [receipt.id]: false });
    }
  };

  // 渲染质检附件单元格（提取为独立函数，避免嵌套三元运算符解析问题）
  const renderQcAttachment = (receipt, it) => {
    if (receipt.status === 'PENDING') {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
          {uploadingFiles[it.id] ? (
            <CircularProgress size={20} />
          ) : it.qcAttachment ? (
            <>
              <Chip size="small" label="已上传" color="success" />
              <Tooltip title="查看附件">
                <IconButton size="small" onClick={() => handlePreviewAttachment(it.qcAttachment)} sx={{ p: 0.5 }}>
                  <AttachFile fontSize="small" color="action" />
                </IconButton>
              </Tooltip>
              <Tooltip title="重新上传">
                <IconButton size="small" onClick={() => fileInputRefs.current[it.id]?.click()} sx={{ p: 0.5 }}>
                  <UploadFile fontSize="small" color="action" />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <Tooltip title="选择质检附件（上传后自动保存）">
              <Button
                size="small"
                startIcon={<UploadFile />}
                onClick={() => fileInputRefs.current[it.id]?.click()}
                variant="outlined"
                sx={{ fontSize: 12, textTransform: 'none' }}
              >
                上传
              </Button>
            </Tooltip>
          )}
          <input
            ref={(el) => (fileInputRefs.current[it.id] = el)}
            type="file"
            hidden
            onChange={(e) => handleFileSelect(it.id, e)}
            accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
          />
        </Box>
      );
    }
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
        <Chip size="small" label={QC_STATUS_MAP[it.qcResult]?.label || it.qcResult} color={QC_STATUS_MAP[it.qcResult]?.color || 'default'} />
        {it.qcAttachment && (
          <Tooltip title="查看质检附件">
            <IconButton size="small" onClick={() => handlePreviewAttachment(it.qcAttachment)} sx={{ p: 0.5 }}>
              <AttachFile fontSize="small" color="action" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  };

  // 主表列数（含展开图标列）
  const MAIN_COL_COUNT = 9;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">采购入库</Typography>
      </Box>

      {/* 搜索栏 */}
      <Paper sx={{ p: 1.5, mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <TextField size="small" placeholder="入库编号" value={keyword} onChange={(e) => setKeyword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            sx={{ width: 160 }}
            InputProps={{ endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={handleSearch}><Search /></IconButton></InputAdornment> }} />
          <TextField size="small" placeholder="批次号" value={batchNo} onChange={(e) => setBatchNo(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            sx={{ width: 130 }} />
          <TextField size="small" select label="供应商" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} sx={{ width: 150 }}>
            <MenuItem value="">全部</MenuItem>
            {suppliers.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </TextField>
          <TextField size="small" select label="状态" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ width: 100 }}>
            <MenuItem value="">全部</MenuItem>
            <MenuItem value="PENDING">未入库</MenuItem>
            <MenuItem value="CONFIRMED">已入库</MenuItem>
          </TextField>
          <TextField type="date" size="small" label="起始" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }} sx={{ width: 140 }} />
          <TextField type="date" size="small" label="截止" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }} sx={{ width: 140 }} />
          <Button variant="contained" size="small" onClick={handleSearch} startIcon={<Search />}>查询</Button>
          <Button variant="outlined" size="small" onClick={handleReset} startIcon={<RestartAlt />}>重置</Button>
          {/* 筛选标签 */}
          {keyword && <Chip size="small" label={`编号: ${keyword}`} onDelete={() => { setKeyword(''); handleSearch(); }} color="primary" variant="outlined" />}
          {batchNo && <Chip size="small" label={`批次: ${batchNo}`} onDelete={() => { setBatchNo(''); handleSearch(); }} color="primary" variant="outlined" />}
          {supplierId && <Chip size="small" label={`供应商: ${suppliers.find(s => s.id === supplierId)?.name}`} onDelete={() => { setSupplierId(''); handleSearch(); }} color="primary" variant="outlined" />}
          {status && <Chip size="small" label={`状态: ${RECEIPT_STATUS_MAP[status]?.label}`} onDelete={() => { setStatus(''); handleSearch(); }} color="primary" variant="outlined" />}
          {(startDate || endDate) && <Chip size="small" label={`${startDate || '...'} ~ ${endDate || '...'}`} onDelete={() => { setStartDate(''); setEndDate(''); handleSearch(); }} color="primary" variant="outlined" />}
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={{ width: 36 }} />
              <TableCell sx={{ fontWeight: 'bold' }}>入库编号</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>采购订单</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>供应商</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>仓库</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>明细数</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>状态</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>金蝶同步</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>入库时间</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((receipt) => {
              const isOpen = expandedId === receipt.id;
              return (
                <Fragment key={receipt.id}>
                  {/* === 主行 === */}
                  <TableRow
                    hover
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => setExpandedId(isOpen ? null : receipt.id)}
                  >
                    <TableCell padding="checkbox" sx={{ width: 36 }}>
                      <IconButton size="small" sx={{ p: 0.5 }}>
                        {isOpen ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ fontWeight: isOpen ? 'bold' : 'normal' }}>{receipt.receiptNo}</TableCell>
                    <TableCell>{receipt.purchaseOrder?.orderNo}</TableCell>
                    <TableCell>{receipt.purchaseOrder?.supplier?.name}</TableCell>
                    <TableCell>{receipt.warehouse?.name}</TableCell>
                    <TableCell>
                      <Chip size="small" label={`${receipt.items?.length || 0} 条`} color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell><Chip size="small" label={RECEIPT_STATUS_MAP[receipt.status]?.label || receipt.status} color={RECEIPT_STATUS_MAP[receipt.status]?.color || 'default'} /></TableCell>
                    <TableCell>
                      {receipt.kingdeeSyncStatus === 'SYNCED' && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Chip size="small" label="已同步" color="success" variant="outlined" />
                          <Tooltip title={`入库单: ${receipt.kingdeeInboundNo || '-'}`}>
                            <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {receipt.kingdeeOrderNo || '-'}
                            </Typography>
                          </Tooltip>
                        </Box>
                      )}
                      {receipt.kingdeeSyncStatus === 'SYNCING' && (
                        <Chip size="small" label="同步中" color="info" icon={<CircularProgress size={12} />} />
                      )}
                      {receipt.kingdeeSyncStatus === 'FAILED' && (
                        <Tooltip title="金蝶推送失败，请联系管理员">
                          <Chip size="small" label="失败" color="error" variant="outlined" />
                        </Tooltip>
                      )}
                      {(!receipt.kingdeeSyncStatus || receipt.kingdeeSyncStatus === 'PENDING') && (
                        <Chip size="small" label="未同步" variant="outlined" sx={{ color: 'text.secondary', borderColor: 'grey.400' }} />
                      )}
                    </TableCell>
                    <TableCell>{receipt.receiptDate ? new Date(receipt.receiptDate).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {receipt.status === 'PENDING' && (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => handleConfirm(receipt)}
                          disabled={confirming[receipt.id]}
                          startIcon={confirming[receipt.id] ? <CircularProgress size={14} /> : null}
                          sx={{ minWidth: 44, fontSize: '0.7rem', py: 0.25, borderRadius: '10px' }}
                        >
                          确认入库
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>

                  {/* === 展开明细行 === */}
                  {isOpen && (
                    <TableRow>
                      <TableCell colSpan={MAIN_COL_COUNT} sx={{ py: 0, bgcolor: 'grey.50' }}>
                        {receipt.items && receipt.items.length > 0 ? (
                          <Table size="small" sx={{ mt: 1, mb: 1 }}>
                            <TableHead>
                              <TableRow sx={{ '& .MuiTableCell-root': { fontWeight: 'bold', bgcolor: 'grey.100' } }}>
                                <TableCell>物料编码</TableCell>
                                <TableCell>物料名称</TableCell>
                                <TableCell>规格</TableCell>
                                <TableCell>单位</TableCell>
                                <TableCell>等级</TableCell>
                                <TableCell align="right">采购数量</TableCell>
                                <TableCell align="right">采购单价</TableCell>
                                <TableCell align="right">采购金额</TableCell>
                                <TableCell align="right">入库数量</TableCell>
                                <TableCell align="center">质检附件</TableCell>
                                <TableCell>批次号</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {receipt.items.map((it) => (
                                <TableRow key={it.id}>
                                  <TableCell sx={{ fontFamily: 'monospace' }}>{it.material?.code}</TableCell>
                                  <TableCell>{it.material?.name}</TableCell>
                                  <TableCell>{it.material?.spec || '-'}</TableCell>
                                  <TableCell>{it.material?.unit || '-'}</TableCell>
                                  <TableCell>
                                    {it.grade?.name || it.orderItem?.grade?.name || '-'}
                                  </TableCell>
                                  <TableCell align="right">{it.orderItem?.qty || '-'}</TableCell>
                                  <TableCell align="right">{Number(it.unitPrice || 0).toFixed(2)}</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>{Number(it.totalAmount || 0).toFixed(2)}</TableCell>

                                  {/* 入库数量：PENDING 可编辑 */}
                                  <TableCell align="right">
                                    {receipt.status === 'PENDING' ? (
                                      <TextField
                                        size="small"
                                        type="number"
                                        sx={{ width: 90 }}
                                        value={editingQty[it.id] !== undefined ? editingQty[it.id] : it.receivedQty}
                                        onChange={(e) => handleQtyChange(it.id, e.target.value)}
                                      />
                                    ) : it.receivedQty}
                                  </TableCell>                                  {/* 质检附件列 */}
                                  <TableCell align="center">
                                    {renderQcAttachment(receipt, it)}
                                  </TableCell>

                                  <TableCell>{it.batch?.batchNo ? <Chip size="small" label={it.batch.batchNo} color="primary" variant="outlined" /> : '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <Typography color="text.secondary" sx={{ py: 1.5, textAlign: 'center' }}>
                            暂无明细数据
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
            {list.length === 0 && (
              <TableRow>
                <TableCell colSpan={MAIN_COL_COUNT} align="center">
                  <Typography color="text.secondary" sx={{ py: 3 }}>暂无数据</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(e.target.value); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage="每页行数："
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count !== -1 ? count : '超过'} 条`}
        />
      </TableContainer>

      {/* Snackbar 弹窗提示 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* 附件预览弹窗 */}
      <Dialog
        open={previewDialog.open}
        onClose={() => setPreviewDialog({ open: false, url: '', name: '' })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">质检附件预览 - {previewDialog.name}</Typography>
          <IconButton size="small" onClick={() => setPreviewDialog({ open: false, url: '', name: '' })}>
            <Typography fontSize={16}>✕</Typography>
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
            {isImage(previewDialog.url) ? (
              <img src={previewDialog.url} alt={previewDialog.name} style={{ maxWidth: '100%', maxHeight: '70vh' }} />
            ) : isPdf(previewDialog.url) ? (
              <iframe src={previewDialog.url} title={previewDialog.name} style={{ width: '100%', height: '70vh', border: 'none' }} />
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary" sx={{ mb: 2 }}>此文件类型不支持在线预览</Typography>
                <Button variant="outlined" startIcon={<Download />} href={previewDialog.url} download={previewDialog.name}>
                  下载附件
                </Button>
              </Box>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
