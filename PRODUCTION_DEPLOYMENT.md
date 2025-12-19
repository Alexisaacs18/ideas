# Production Deployment Checklist

## ✅ Completed

- [x] Code deployed to Cloudflare Workers
- [x] Database migration applied (embeddings table updated)

## ⚠️ REQUIRED: Add Encryption Key Secret

**Before testing, you MUST add the encryption key secret in Cloudflare:**

1. Go to: https://dash.cloudflare.com/
2. Navigate to: **Workers & Pages** → **hidden-grass-22b6** → **Settings** → **Secrets**
3. Click **"Add secret"**
4. Name: `ENCRYPTION_KEY` (exact, case-sensitive)
5. Value: `0a7315b11bceb6847add77a616bef32a2c31ce029fb52f1a29a7aae623b2074c`
6. Click **"Save"**

**Important**: The worker will fail with encryption errors if this secret is not set!

## Testing

After adding the secret:

1. **Upload a new document** - Should encrypt and store in R2
2. **Search/chat** - Should decrypt documents on-the-fly
3. **Check worker logs** - Look for:
   - `✅ Encrypted text stored in R2`
   - `✅ Decrypted document`

## What Changed

- Documents are now encrypted before storing in R2
- Embeddings stored without `chunk_text` (only vectors)
- Documents decrypted when searching
- Backward compatible with old unencrypted documents

## Rollback

If something goes wrong, you can:
1. Remove the `ENCRYPTION_KEY` secret (old documents will still work)
2. Redeploy previous version if needed

