import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // 固定開發埠與 host，避免自動換埠導致 Netlify 代理錯誤
    host: true,
    port: 5174,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        // 將主要依賴分組，有助於瀏覽器快取與減少單檔體積警告
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react';
            if (id.includes('@tanstack')) return 'tanstack';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('@radix-ui')) return 'radix';
            return 'vendor';
          }
        },
      },
    },
    // 如仍有警告，可視需要調整警戒值
    chunkSizeWarningLimit: 900,
  },
});
