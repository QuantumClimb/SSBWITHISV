import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-three': ['three', 'three-mesh-bvh', 'three-stdlib'],
          'vendor-r3f': ['@react-three/fiber', '@react-three/drei'],
          'vendor-postprocessing': ['@react-three/postprocessing', 'postprocessing'],
        },
      },
    },
  },
});
