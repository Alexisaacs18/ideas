# Admin Worker Setup

This project has been split into two Cloudflare Workers:

1. **Main Worker** (`hidden-grass-22b6`) - Handles the public site and all API endpoints except admin
2. **Admin Worker** (`hidden-grass-22b6-admin`) - Handles `/admin*` routes and admin API endpoints

Both workers share the same D1 database and R2 bucket bindings.

## File Structure

- `worker/index.js` - Main worker (public site + API)
- `worker/admin-worker.js` - Admin worker (admin UI + admin API)
- `wrangler.toml` - Main worker configuration
- `wrangler.admin.toml` - Admin worker configuration

## Deployment

### Deploy Both Workers

```bash
npm run deploy:all
```

### Deploy Main Worker Only

```bash
npm run deploy
```

### Deploy Admin Worker Only

```bash
npm run deploy:admin
```

## Cloudflare Dashboard Routing

After deploying both workers, you need to configure routing in the Cloudflare Dashboard:

1. Go to **Workers & Pages** → **Routes**
2. Add a route: `yourdomain.com/admin*` → Route to `hidden-grass-22b6-admin`
3. Ensure the default route (everything else) goes to `hidden-grass-22b6`

Alternatively, if using a custom domain:
- Set up routing so `/admin*` paths are handled by the admin worker
- All other paths are handled by the main worker

## Shared Bindings

Both workers use the same:
- **D1 Database**: `second_brain_db` (binding: `DB`)
- **R2 Bucket**: `second-brain-docs` (binding: `DOCS_BUCKET`)
- **Static Assets**: `./dist/client` (binding: `ASSETS`)

This ensures both workers access the same data.

## Admin API Endpoints

The admin worker handles:
- `GET /api/admin/stats` - Get admin statistics
- `DELETE /api/admin/users/:userId/delete` - Delete a user
- `POST /api/admin/r2/clear` - Clear all R2 documents

All admin routes are prefixed with `/api/admin/` and are only accessible through the admin worker.

## Local Development

To test locally, you can run both workers in separate terminals:

```bash
# Terminal 1: Main worker
npm run dev:worker

# Terminal 2: Admin worker  
wrangler dev --config wrangler.admin.toml
```

Note: For local development, you may need to manually route requests or use a proxy to test the routing setup.

