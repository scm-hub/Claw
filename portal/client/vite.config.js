import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: [
      'react', 'react-dom', 'react-router-dom',
      '@mui/material', '@mui/icons-material', '@mui/styles',
      '@emotion/react', '@emotion/styled',
      'zustand', 'axios',
    ],
  },
  server: {
    port: 5174,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        xfwd: true,
      },
      '/workflow/api': {
        target: 'http://localhost:4011',
        changeOrigin: true,
        rewrite: (path) => path.replace('/workflow/api', '/api'),
        xfwd: true,
      },
      '/scm/api': {
        target: 'http://localhost:4003',
        changeOrigin: true,
        xfwd: true,
      },
    },
  },
  preview: {
    port: 5174,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        xfwd: true,
      },
      '/workflow/api': {
        target: 'http://localhost:4011',
        changeOrigin: true,
        rewrite: (path) => path.replace('/workflow/api', '/api'),
        xfwd: true,
      },
      '/scm/api': {
        target: 'http://localhost:4003',
        changeOrigin: true,
        xfwd: true,
      },
    },
  },
});
