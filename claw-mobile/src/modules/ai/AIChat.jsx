import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, IconButton, Typography, Paper, Chip, CircularProgress } from '@mui/material';
import { Send as SendIcon, SmartToy } from '@mui/icons-material';
import api from './api';

export default function AIChat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '你好！我是鲜当家 AI 助手，可以帮你查询销售数据、库存情况、员工信息等。试着问我吧！' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const listRef = useRef(null);

  useEffect(() => {
    api.get('/chat/suggestions').then(r => {
      if (r.success) setSuggestions(r.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight);
  }, [messages]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const res = await api.post('/chat', { message: msg });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data?.reply || res.data?.message || '收到，正在处理...' }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，暂时无法处理您的请求：' + e.message }]);
    }
    setLoading(false);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>
      <Box ref={listRef} sx={{ flex: 1, overflow: 'auto', p: 2, pb: 1 }}>
        {messages.map((m, i) => (
          <Box key={i} sx={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', mb: 2 }}>
            {m.role === 'assistant' && (
              <SmartToy sx={{ mr: 1, color: 'primary.main', mt: 1 }} fontSize="small" />
            )}
            <Paper sx={{
              p: 1.5, maxWidth: '80%',
              bgcolor: m.role === 'user' ? 'primary.main' : 'grey.100',
              color: m.role === 'user' ? '#fff' : 'text.primary',
              borderRadius: 2,
            }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{m.content}</Typography>
            </Paper>
          </Box>
        ))}
        {loading && <CircularProgress size={20} sx={{ ml: 1 }} />}
      </Box>

      {suggestions.length > 0 && messages.length <= 1 && (
        <Box sx={{ px: 2, pb: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {suggestions.slice(0, 4).map((s, i) => (
            <Chip key={i} label={s} size="small" onClick={() => send(s)} sx={{ cursor: 'pointer' }} />
          ))}
        </Box>
      )}

      <Box sx={{ p: 1.5, borderTop: '1px solid #e0e0e0', display: 'flex', gap: 1 }}>
        <TextField
          fullWidth size="small" placeholder="输入问题..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <IconButton color="primary" onClick={() => send()} disabled={loading}>
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );
}
