import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  envDir: '..',
  envPrefix: ['VITE_'],
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/connect': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/ingest': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/sessions': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/session': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/control': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/orchestration': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/node': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:4000',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
