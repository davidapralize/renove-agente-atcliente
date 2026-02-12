import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

export default defineConfig({
  plugins: [react(), cssInjectedByJsPlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
        entryFileNames: 'renove-widget.js', // El nombre final del script
        format: 'iife', // Formato autoejecutable para el navegador
      },
    },
  },
  server: {
    port: 5173
  }
});