import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const isProd = process.env.NODE_ENV === 'production' || process.env.VITE_MODE === 'gw';

export default defineConfig({
  plugins: [react()],
  base: isProd ? '/hrms/' : '/',
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
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4002',
        changeOrigin: true,
        xfwd: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});
