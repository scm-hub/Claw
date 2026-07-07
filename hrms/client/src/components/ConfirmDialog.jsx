import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, CircularProgress } from '@mui/material';

/**
 * 通用确认弹窗
 * @param {boolean} open - 是否显示
 * @param {string} title - 标题
 * @param {string} message - 内容文本（优先级低于 content）
 * @param {string} content - 内容文本（优先级高于 message）
 * @param {string} confirmText - 确认按钮文字，默认"确定"
 * @param {string} confirmColor - 确认按钮颜色，默认"error"
 * @param {boolean} loading - 确认按钮加载中
 * @param {function} onConfirm - 确认回调
 * @param {function} onCancel - 取消回调（优先级低于 onClose）
 * @param {function} onClose - 关闭回调（优先级高于 onCancel）
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  content,
  confirmText = '确定',
  confirmColor = 'error',
  loading = false,
  onConfirm,
  onCancel,
  onClose,
}) {
  const handleClose = onClose || onCancel;
  const displayContent = content || message;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title || '确认操作'}</DialogTitle>
      <DialogContent>
        <Typography>{displayContent || '确定要执行此操作吗？'}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>取消</Button>
        <Button variant="contained" color={confirmColor} onClick={onConfirm} disabled={loading}>
          {loading ? <CircularProgress size={20} color="inherit" /> : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
