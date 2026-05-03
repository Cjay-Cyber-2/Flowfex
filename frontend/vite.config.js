import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  envDir: '..',
  envPrefix: ['VITE_'],
  plugins: [react()],
  resolve: {
    // Ensure root-level lib/ files resolve node_modules from frontend/
    modules: [path.resolve(__dirname, 'node_modules'), 'node_modules'],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:4000',
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
