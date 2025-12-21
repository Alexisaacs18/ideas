import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'fs'
import { join } from 'path'

export default defineConfig({
  root: './apps/public',
  build: {
    outDir: '../../dist/public',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './apps/public/index.html',
      },
    },
  },
  plugins: [
    react(),
    {
      name: 'copy-sitemap',
      closeBundle() {
        const sitemapSrc = join(process.cwd(), 'apps/public/sitemap.xml')
        const sitemapDest = join(process.cwd(), 'dist/public/sitemap.xml')
        try {
          copyFileSync(sitemapSrc, sitemapDest)
          console.log('✓ Copied sitemap.xml to dist/public')
        } catch (err) {
          console.warn('⚠ Could not copy sitemap.xml:', err.message)
        }
      },
    },
  ],
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

