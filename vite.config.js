import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
  },
  plugins: [react(), cloudflare({
    persist: false,
    assets: {
      directory: './dist/client',
      notFoundHandling: 'single-page-application'
    }
  })],
})