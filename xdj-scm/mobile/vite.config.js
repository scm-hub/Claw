import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// gw = 网关模式（/mobile/ 前缀），native = Capacitor 原生 App（/ 前缀），dev = 本地开发
const mode = process.env.VITE_MODE || (process.env.NODE_ENV === 'production' ? 'gw' : 'dev');
const isGw = mode === 'gw';
const isNative = mode === 'native';
const base = isNative ? '/' : (isGw ? '/mobile/' : '/');

export default defineConfig({
  plugins: [react()],
  base,
  server: {
    port: 5176,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4003',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5176,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4003',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    // 原生 App 模式下不需要 sourcemap 以减小体积
    sourcemap: !isNative,
  },
});
