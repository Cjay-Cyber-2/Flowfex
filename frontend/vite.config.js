import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  envDir: '..',
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  plugins: [react()],
  resolve: {
    alias: {
      '@supabase/ssr': path.resolve(__dirname, 'node_modules/@supabase/ssr'),
      '@supabase/supabase-js': path.resolve(__dirname, 'node_modules/@supabase/supabase-js'),
    },
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
