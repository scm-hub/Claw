import { useState } from 'react';
import {
  Box, Paper, TextField, Button, Typography, Card, CardContent, Chip,
  CircularProgress, Alert, Divider, Stepper, Step, StepLabel, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import api from '../api/index.js';

export default function OrderAssistant() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState('');
  const [activeStep, setActiveStep] = useState(0);

  const handleParse = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    setParsed(null);
    try {
      const resp = await api.parseOrder(input);
      if (resp.success) {
        setParsed(resp.data);
        setActiveStep(1);
      } else {
        setError(resp.message || '解析失败');
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!parsed?.prefill) return;
    setLoading(true);
    setError('');
    try {
      const orderData = {
        customerId: parsed.prefill.customer?.id,
        items: parsed.prefill.items.map(it => ({
          materialId: it.materialId,
          qty: it.qty,
          price: it.price,
        })),
        deliveryDate: parsed.prefill.deliveryDate,
        notes: parsed.prefill.notes || `AI助手创建 - ${parsed.prefill.rawMessage}`,
      };
      const resp = await api.createOrder(orderData);
      if (resp.success) {
        setActiveStep(2);
        setParsed({ ...parsed, result: resp });
      } else {
        setError(resp.message || '创建失败');
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleReset = () => {
    setInput('');
    setParsed(null);
    setError('');
    setActiveStep(0);
  };

  const steps = ['输入订单描述', '确认订单信息', '创建完成'];

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        <SmartToyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        AI 订单助手
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        用自然语言描述订单需求，AI 自动解析并预填，确认后一键创建
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Step 0: 输入 */}
      {activeStep === 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="subtitle1" gutterBottom>请描述您的订单需求</Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="例如：帮杭州鲜味食品有限公司下单 50公斤香菇，明天交货"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {[
              '帮杭州鲜味下单50公斤香菇明天交货',
              '给杭州总仓下单30箱平菇',
              '创建订单，100公斤杏鲍菇，后天交货',
            ].map((ex, i) => (
              <Chip key={i} label={ex} size="small" onClick={() => setInput(ex)} variant="outlined" sx={{ cursor: 'pointer' }} />
            ))}
          </Box>
          <Button variant="contained" onClick={handleParse} disabled={loading || !input.trim()} startIcon={loading ? <CircularProgress size={20} /> : null}>
            {loading ? '解析中...' : 'AI 解析'}
          </Button>
        </Paper>
      )}

      {/* Step 1: 确认 */}
      {activeStep === 1 && parsed && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="subtitle1" gutterBottom>AI 解析结果</Typography>
          <Alert severity="info" sx={{ mb: 2 }}>{parsed.confirmMessage}</Alert>

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary">客户</Typography>
              <Typography variant="body1">
                {parsed.prefill.customer ? `${parsed.prefill.customer.name} (${parsed.prefill.customer.code || '-'})` : `未匹配到「${parsed.prefill.customerKeyword}」`}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" color="textSecondary">商品明细</Typography>
              {parsed.prefill.items.length > 0 ? (
                <Table size="small" sx={{ mt: 1 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>商品</TableCell>
                      <TableCell>编码</TableCell>
                      <TableCell align="right">数量</TableCell>
                      <TableCell align="right">单价</TableCell>
                      <TableCell align="right">金额</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {parsed.prefill.items.map((it, i) => (
                      <TableRow key={i}>
                        <TableCell>{it.materialName}</TableCell>
                        <TableCell>{it.materialCode}</TableCell>
                        <TableCell align="right">{it.qty} {it.unit}</TableCell>
                        <TableCell align="right">¥{it.price}</TableCell>
                        <TableCell align="right">¥{it.amount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2" color="textSecondary">未匹配到商品「{parsed.prefill.materialKeyword}」</Typography>
              )}
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" color="textSecondary">交货日期</Typography>
              <Typography variant="body1">{parsed.prefill.deliveryDate || '未指定'}</Typography>
            </CardContent>
          </Card>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" color="primary" onClick={handleCreate} disabled={loading}>
              {loading ? <CircularProgress size={20} /> : '确认创建订单'}
            </Button>
            <Button variant="outlined" onClick={handleReset}>重新输入</Button>
          </Box>
        </Paper>
      )}

      {/* Step 2: 完成 */}
      {activeStep === 2 && parsed?.result && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h5" color="success.main" gutterBottom>✅ 订单创建成功！</Typography>
          <Typography variant="body1">
            订单号: <strong>{parsed.result.data?.orderNo || parsed.result.data?.id || '-'}</strong>
          </Typography>
          <Button variant="outlined" onClick={handleReset} sx={{ mt: 2 }}>创建新订单</Button>
        </Paper>
      )}
    </Box>
  );
}
