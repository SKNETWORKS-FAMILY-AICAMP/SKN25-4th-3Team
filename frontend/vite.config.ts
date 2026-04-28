import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// React dev 서버는 5173에서 동작.
// Django(보통 8000)으로 가는 API 요청은 /api, /accounts/* 를 프록시 처리.
// 이렇게 하면 fetch 시 same-origin으로 동작해 세션 쿠키/CSRF가 그대로 흐름.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: false,
      },
      '/accounts': {
        target: 'http://localhost:8000',
        changeOrigin: false,
      },
    },
  },
});
