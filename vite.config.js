import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

// Vite config for Worker deployment (includes both Worker and client assets)
export default defineConfig({
  plugins: [react(), cloudflare({
    persist: false,
    assets: {
      directory: './dist/client',
      notFoundHandling: 'single-page-application'
    }
  })],
  server: {
    // Ensure all routes fall back to index.html for SPA routing in dev
    historyApiFallback: true,
    // Proxy API requests to avoid CORS issues in dev
    proxy: {
      '/api': {
        target: 'https://hidden-grass-22b6.alexisaacs18.workers.dev',
        changeOrigin: true,
      }
    }
  },
})