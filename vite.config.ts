import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // 強制指定 host/port，避免 Netlify dev 偵測問題
    host: true,
    port: 5174,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        // 合併成單一 app chunk，避免分離的 React/Vendor chunk 有載入差異造成 undefined
        manualChunks: () => 'app',
      },
    },
    // chunkSizeWarningLimit: 900,
  },
});
