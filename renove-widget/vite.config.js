import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
        entryFileNames: 'renove-widget.js',
        format: 'iife', 
      },
    },
  },
  server: {
    port: 5173
  }
});