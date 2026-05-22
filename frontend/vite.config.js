import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendTarget = 'http://localhost:4000';

/** Dev/preview proxies — use path prefixes that never match /node_modules. */
const devProxy = {
  '/api': { target: backendTarget, changeOrigin: true },
  '/connect': { target: backendTarget, changeOrigin: true },
  '/ingest': { target: backendTarget, changeOrigin: true },
  '/sessions': { target: backendTarget, changeOrigin: true },
  '/session': { target: backendTarget, changeOrigin: true },
  '/control': { target: backendTarget, changeOrigin: true },
  '/orchestration': { target: backendTarget, changeOrigin: true },
  '/skills': { target: backendTarget, changeOrigin: true },
  '/catalog': { target: backendTarget, changeOrigin: true },
  // Control API only: /node/:id/approve — must not match /node_modules/*
  '^/node/': { target: backendTarget, changeOrigin: true },
  '/ws': { target: backendTarget, ws: true },
};

export default defineConfig({
  envDir: '..',
  envPrefix: ['VITE_'],
  plugins: [react()],
  preview: {
    port: 3000,
    proxy: devProxy,
  },
  server: {
    port: 3000,
    proxy: devProxy,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
