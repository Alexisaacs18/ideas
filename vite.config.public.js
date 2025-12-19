import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: './apps/public',
  build: {
    outDir: '../../dist/public',
    emptyOutDir: true,
  },
  plugins: [react()],
  server: {
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: 'https://hidden-grass-22b6.alexisaacs18.workers.dev',
        changeOrigin: true,
      }
    }
  },
})

