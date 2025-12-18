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
})