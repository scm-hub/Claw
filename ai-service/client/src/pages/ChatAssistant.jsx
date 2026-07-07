import { useState, useRef, useEffect } from 'react';
import {
  Box, Paper, TextField, IconButton, Typography, Chip, Avatar, CircularProgress,
  Card, CardContent, Divider,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import api from '../api/index.js';

export default function ChatAssistant() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '您好！我是鲜当家 AI 智能助手 🤖\n\n我可以帮您查询库存、订单、员工信息，进行数据分析和预测。\n\n输入"帮助"查看我能做什么，或直接提问！',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const endRef = useRef(null);

  useEffect(() => {
    api.getSuggestions().then((resp) => {
      if (resp.success) setSuggestions(resp.data);
    });
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text) => {
    const message = text || input.trim();
    if (!message || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: message, timestamp: new Date().toISOString() }]);
    setLoading(true);

    try {
      // 构建对话历史（最近6轮）
      const history = messages
        .filter(m => m.content)
        .slice(-12)
        .map(m => ({ role: m.role, content: m.content }));

      const resp = await api.chat(message, history);
      if (resp.success) {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: resp.data.reply,
          intent: resp.data.intent,
          confidence: resp.data.confidence,
          source: resp.data.source,
          timestamp: resp.data.timestamp,
        }]);
      } else {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: '抱歉，查询出错了。请稍后重试。',
          timestamp: new Date().toISOString(),
        }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `网络错误: ${err.message}`,
        timestamp: new Date().toISOString(),
      }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 128px)', display: 'flex', flexDirection: 'column', gap: 1 }}>
      {/* 消息列表 */}
      <Paper sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: '#fafafa' }} elevation={1}>
        {messages.map((msg, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 2, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
            <Avatar sx={{ bgcolor: msg.role === 'user' ? 'secondary.main' : 'primary.main', width: 36, height: 36 }}>
              {msg.role === 'user' ? <PersonIcon /> : <SmartToyIcon />}
            </Avatar>
            <Box sx={{ maxWidth: '75%' }}>
              <Paper elevation={0} sx={{
                p: 1.5,
                bgcolor: msg.role === 'user' ? 'primary.light' : '#fff',
                borderRadius: 2,
                border: '1px solid',
                borderColor: msg.role === 'user' ? 'primary.main' : '#e0e0e0',
              }}>
                <Typography component="div" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem', lineHeight: 1.6 }}>
                  {msg.content}
                </Typography>
              </Paper>
              {msg.intent && msg.intent !== 'HELP' && msg.intent !== 'UNKNOWN' && (
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, alignItems: 'center' }}>
                  <Chip
                    size="small"
                    label={msg.intent}
                    sx={{ fontSize: '0.7rem', height: 20 }}
                  />
                  {msg.source && (
                    <Chip
                      size="small"
                      label={msg.source === 'llm' ? '🧠 DeepSeek' : msg.source === 'rule' ? '📋 规则' : msg.source}
                      sx={{
                        fontSize: '0.65rem',
                        height: 18,
                        bgcolor: msg.source === 'llm' ? 'rgba(123,31,162,0.1)' : 'rgba(0,0,0,0.05)',
                        color: msg.source === 'llm' ? '#7B1FA2' : '#666',
                      }}
                    />
                  )}
                </Box>
              )}
            </Box>
          </Box>
        ))}

        {loading && (
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
              <SmartToyIcon />
            </Avatar>
            <Paper elevation={0} sx={{ p: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid #e0e0e0' }}>
              <CircularProgress size={20} />
            </Paper>
          </Box>
        )}

        <div ref={endRef} />
      </Paper>

      {/* 推荐问题 */}
      {suggestions.length > 0 && (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', px: 1 }}>
          {suggestions.slice(0, 6).map((s, i) => (
            <Chip
              key={i}
              label={s.text}
              size="small"
              onClick={() => handleSend(s.text)}
              sx={{ cursor: 'pointer' }}
              color="primary"
              variant="outlined"
            />
          ))}
        </Box>
      )}

      {/* 输入框 */}
      <Paper sx={{ p: 1.5, display: 'flex', gap: 1 }} elevation={2}>
        <TextField
          fullWidth
          multiline
          maxRows={3}
          placeholder="输入您的问题，或点击上方推荐问题..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          size="small"
        />
        <IconButton
          color="primary"
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          sx={{ alignSelf: 'flex-end' }}
        >
          <SendIcon />
        </IconButton>
      </Paper>
    </Box>
  );
}
