import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  root: path.resolve(__dirname), // now the config is in project root
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // src folder is relative to current folder
    },
  },
  server: {
    port: 5173, // or your preferred port
    strictPort: true,
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'), // build output inside project root /dist
    emptyOutDir: true,
  },
})
