import React, { Component } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';
import { Box, Typography, Button } from '@mui/material';
import App from './App';
import theme from './theme';
import './index.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React ErrorBoundary caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, maxWidth: 800, mx: 'auto', mt: 8 }}>
          <Typography variant="h4" color="error" gutterBottom>页面出错了</Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            <strong>错误信息：</strong>{this.state.error?.message || '未知错误'}
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, whiteSpace: 'pre-wrap', bgcolor: '#f5f5f5', p: 2, borderRadius: 1, fontSize: 12, maxHeight: 300, overflow: 'auto' }}>
            {this.state.errorInfo?.componentStack || ''}
          </Typography>
          <Button variant="contained" onClick={() => window.location.reload()}>刷新页面</Button>
          <Button variant="outlined" sx={{ ml: 2 }} onClick={() => { this.setState({ hasError: false, error: null, errorInfo: null }); }}>重试</Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
        <ThemeProvider theme={theme}>
          <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
            <App />
          </SnackbarProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
