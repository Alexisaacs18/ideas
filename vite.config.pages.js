import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Pure Vite config for Cloudflare Pages (frontend only, no Worker)
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  plugins: [react()],
})

