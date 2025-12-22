import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync } from 'fs'
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
    {
      name: 'copy-logo-to-root',
      closeBundle() {
        // Ensure logo.png is copied to build root so it's accessible at /logo.png
        const logoSrc = join(process.cwd(), 'public/logo.png')
        const logoDest = join(process.cwd(), 'dist/public/logo.png')
        try {
          if (existsSync(logoSrc)) {
            copyFileSync(logoSrc, logoDest)
            console.log('✓ Copied logo.png to dist/public root')
          } else {
            // Fallback to apps/public/logo.png
            const fallbackSrc = join(process.cwd(), 'apps/public/logo.png')
            if (existsSync(fallbackSrc)) {
              copyFileSync(fallbackSrc, logoDest)
              console.log('✓ Copied logo.png from apps/public to dist/public root')
            }
          }
        } catch (err) {
          console.warn('⚠ Could not copy logo.png:', err.message)
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

