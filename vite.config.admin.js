import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  root: './apps/admin',
  build: {
    outDir: '../../dist/admin',
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

