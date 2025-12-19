# Cloudflare Pages Build Configuration

## Build Settings

In your Cloudflare Pages dashboard, configure:

**Build command:**
```bash
npm run build:pages
```

**Build output directory:**
```
dist
```

**Node version:**
```
22
```

**Environment variables:**
- None required for frontend build (API calls go to Workers)

## Notes

- This project uses Workers for the backend API
- Pages is only used for the frontend static assets
- The `wrangler.toml` file includes `pages_build_output_dir = "dist"` for Pages compatibility
- If you encounter esbuild errors, ensure Node.js 22 is used

