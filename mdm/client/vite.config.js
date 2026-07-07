import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const isProd = process.env.NODE_ENV === 'production' || process.env.VITE_MODE === 'gw';

export default defineConfig({
  plugins: [react()],
  base: isProd ? '/mdm/' : '/',
  resolve: {
    dedupe: [
      'react', 'react-dom', 'react-router-dom',
      '@mui/material', '@mui/icons-material', '@mui/styles',
      '@emotion/react', '@emotion/styled',
      'zustand', 'axios',
    ],
  },
  server: {
    port: 5177,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:4005',
        changeOrigin: true,
        xfwd: true,
      },
    },
  },
});
