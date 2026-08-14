import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// tauri.conf.json 的 devUrl 指向 1420，保持严格一致
export default defineConfig({
  root: 'src',
  plugins: [react()],
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    target: 'es2021',
    outDir: '../dist',
  },
})
