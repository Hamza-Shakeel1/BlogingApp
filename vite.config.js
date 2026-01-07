import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  root: path.resolve(__dirname, '../'), // <-- project root (where index.html is)
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // optional, for src imports
    },
  },
  server: {
    port: 5173, // or your preferred port
    strictPort: true,
  },
  build: {
    outDir: path.resolve(__dirname, '../dist'), // output to project root /dist
    emptyOutDir: true,
  },
})
