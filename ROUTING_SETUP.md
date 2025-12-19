# Worker Routing Setup

## Overview

This project has two Workers with distinct responsibilities:

1. **Public Worker** (`hidden-grass-22b6`) - Handles all routes EXCEPT `/admin*`
2. **Admin Worker** (`hidden-grass-22b6-admin`) - Handles ONLY `/admin*` routes

Both workers share the same D1 database and R2 bucket bindings.

## Route Configuration

### In Cloudflare Dashboard

After deploying both workers, configure routing in the Cloudflare Dashboard:

1. Go to **Workers & Pages** → **Routes**
2. Add routes in this order (most specific first):

   **Route 1 (Admin Worker - More Specific):**
   - Pattern: `yourdomain.com/admin*`
   - Worker: `hidden-grass-22b6-admin`
   - Zone: Your domain zone

   **Route 2 (Public Worker - Catch-all):**
   - Pattern: `yourdomain.com/*`
   - Worker: `hidden-grass-22b6`
   - Zone: Your domain zone

**Important:** The `/admin*` route MUST be configured BEFORE the catch-all `/*` route. Cloudflare matches routes in order, and the first match wins. If the catch-all comes first, it will intercept all requests including `/admin*`.

### Route Priority

```
/admin*     → admin-worker (more specific, checked first)
/*          → public-worker (catch-all, checked second)
```

## What Each Worker Handles

### Public Worker (`worker/index.js`)

**Handles:**
- `/` - Home page
- `/documents` - Documents page
- `/api/*` - All API endpoints EXCEPT `/api/admin/*`
- All other public routes

**Does NOT handle:**
- `/admin*` - These are rejected/ignored (handled by admin-worker via routing)

### Admin Worker (`worker/admin-worker.js`)

**Handles:**
- `/admin` - Admin dashboard
- `/admin/*` - All admin UI routes
- `/api/admin/stats` - Admin statistics API
- `/api/admin/users/:id/delete` - Delete user API
- `/api/admin/r2/clear` - Clear R2 documents API

**Does NOT handle:**
- Any path that doesn't start with `/admin` - Returns 404

## Shared Bindings

Both workers use the same:
- **D1 Database**: `second_brain_db` (binding: `DB`)
- **R2 Bucket**: `second-brain-docs` (binding: `DOCS_BUCKET`)
- **Static Assets**: `./dist/client` (binding: `ASSETS`)

This ensures both workers access the same data and can serve the same static assets.

## Deployment

Deploy both workers:

```bash
# Deploy both
npm run deploy:all

# Or deploy separately
npm run deploy          # Public worker
npm run deploy:admin    # Admin worker
```

After deployment, configure the routes in the Cloudflare Dashboard as described above.

## Testing

To test locally, you can run both workers:

```bash
# Terminal 1: Public worker
npm run dev:worker

# Terminal 2: Admin worker
wrangler dev --config wrangler.admin.toml
```

Note: Local testing may require manual routing or a proxy since both workers run on different ports.

