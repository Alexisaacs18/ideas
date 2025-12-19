# Worker Refactor Summary

## Architecture

### Directory Structure
- `apps/public/` - Public frontend (Home, Documents pages)
- `apps/admin/` - Admin frontend (Admin dashboard only)
- `dist/public/` - Built public frontend
- `dist/admin/` - Built admin frontend
- `worker/public-worker.js` - Public worker (serves public app + API)
- `worker/admin-worker.js` - Admin worker (serves admin app + admin API)

### Workers

**Public Worker** (`hidden-grass-22b6`)
- Entry: `worker/public-worker.js`
- Serves: `dist/public/`
- Routes: `/*` (everything except `/admin*`)
- Handles: Public app, all API except `/api/admin/*`

**Admin Worker** (`hidden-grass-22b6-admin`)
- Entry: `worker/admin-worker.js`
- Serves: `dist/admin/`
- Routes: `*/admin*` (more specific, must be configured first)
- Handles: Admin UI and `/api/admin/*` endpoints only
- Internally treats `/` as base (strips `/admin` prefix)

### Shared Bindings
Both workers share:
- D1 Database: `second_brain_db` (binding: `DB`)
- R2 Bucket: `second-brain-docs` (binding: `DOCS_BUCKET`)

## Build Commands

```bash
# Build both frontends
npm run build

# Build separately
npm run build:public
npm run build:admin

# Deploy
npm run deploy          # Public worker
npm run deploy:admin    # Admin worker
npm run deploy:all      # Both workers
```

## Route Configuration (Cloudflare Dashboard)

After deployment, configure routes in this order:

1. `yourdomain.com/admin*` → `hidden-grass-22b6-admin` (MUST be first)
2. `yourdomain.com/*` → `hidden-grass-22b6` (catch-all, second)

## Key Changes

1. ✅ Separated frontends into `apps/public` and `apps/admin`
2. ✅ Created separate build outputs (`dist/public` and `dist/admin`)
3. ✅ Public worker serves only public app (no admin routes)
4. ✅ Admin worker serves only admin app (strips `/admin` prefix internally)
5. ✅ Both workers share same D1 and R2 bindings
6. ✅ Fixed `handleAddLink` missing URL fetching code
7. ✅ Updated build scripts for separate frontend builds
