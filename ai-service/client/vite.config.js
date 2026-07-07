import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/ai/',
  resolve: {
    dedupe: [
      'react', 'react-dom', 'react-router-dom',
      '@mui/material', '@mui/icons-material', '@mui/styles',
      '@emotion/react', '@emotion/styled',
      'zustand', 'axios',
    ],
  },
  server: {
    host: '0.0.0.0',
    port: 5118,
    proxy: {
      '/api': {
        target: 'http://localhost:4004',
        changeOrigin: true,
      },
    },
  },
});
