import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const isProd = process.env.NODE_ENV === 'production' || process.env.VITE_MODE === 'gw';

export default defineConfig({
  plugins: [react()],
  base: isProd ? '/scm/' : '/',
  resolve: {
    alias: {
      '@emotion/react': path.resolve(__dirname, 'node_modules/@emotion/react'),
      '@emotion/styled': path.resolve(__dirname, 'node_modules/@emotion/styled'),
      '@emotion/cache': path.resolve(__dirname, 'node_modules/@emotion/cache'),
    },
    dedupe: [
      'react', 'react-dom', 'react-router-dom',
      '@mui/material', '@mui/icons-material', '@mui/styles',
      '@emotion/react', '@emotion/styled',
      'zustand', 'axios',
    ],
  },
  server: {
    port: 5175,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:4003',
        changeOrigin: true,
        xfwd: true,
      },
      '/uploads': {
        target: 'http://localhost:4003',
        changeOrigin: true,
        rewrite: (p) => '/uploads' + p,
      },
    },
  },
});
